import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AccountRole,
  ModerationReportStatus,
  ModerationStatus,
  ModerationTargetType,
} from '@prisma/client';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin/admin-audit.service';
import { AdminActor } from '../../common/decorators/admin-actor.decorator';

function makeActor(role: AccountRole = AccountRole.MODERATOR): AdminActor {
  return {
    accountId: 'mod-1',
    role,
    ipAddress: null,
    userAgent: null,
    requestId: null,
  };
}

describe('ModerationService', () => {
  let service: ModerationService;

  const mockPrisma = {
    moderationReport: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    culturalContent: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    culturalAuthority: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    contribution: {
      create: jest.fn(),
    },
  };

  const mockAudit = { record: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AdminAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
  });

  // ----------------------------------------------------------------
  // report
  // ----------------------------------------------------------------

  describe('report', () => {
    const input = {
      reporterAccountId: 'acc-1',
      targetType: ModerationTargetType.CULTURAL_CONTENT,
      targetId: 'content-1',
      reason: 'SPAM',
      details: null,
    };

    it('creates a new OPEN report when none exists', async () => {
      mockPrisma.moderationReport.findFirst.mockResolvedValue(null);
      mockPrisma.moderationReport.create.mockResolvedValue({
        id: 'report-1',
        status: ModerationReportStatus.OPEN,
      });

      const result = await service.report(input);

      expect(result.status).toBe(ModerationReportStatus.OPEN);
      expect(mockPrisma.moderationReport.create).toHaveBeenCalledTimes(1);
    });

    it('is idempotent: returns the existing open report without creating a duplicate', async () => {
      mockPrisma.moderationReport.findFirst.mockResolvedValue({
        id: 'existing-1',
        status: ModerationReportStatus.REVIEWING,
      });

      const result = await service.report(input);

      expect(result.id).toBe('existing-1');
      expect(mockPrisma.moderationReport.create).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // queue
  // ----------------------------------------------------------------

  describe('queue', () => {
    it('rejects non-moderators', async () => {
      await expect(
        service.queue(makeActor(AccountRole.USER)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.moderationReport.findMany).not.toHaveBeenCalled();
    });

    it('lists OPEN/REVIEWING reports oldest-first for moderators', async () => {
      mockPrisma.moderationReport.findMany.mockResolvedValue([]);

      await service.queue(makeActor());

      const args = mockPrisma.moderationReport.findMany.mock.calls[0][0];
      expect(args.where.status.in).toEqual([
        ModerationReportStatus.OPEN,
        ModerationReportStatus.REVIEWING,
      ]);
      expect(args.orderBy).toEqual({ createdAt: 'asc' });
    });
  });

  // ----------------------------------------------------------------
  // moderateCulturalContent
  // ----------------------------------------------------------------

  describe('moderateCulturalContent', () => {
    it('throws NotFound when content is missing or soft-deleted', async () => {
      mockPrisma.culturalContent.findFirst.mockResolvedValue(null);

      await expect(
        service.moderateCulturalContent('content-x', 'APPROVED', makeActor()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('approves content and writes audit + contribution', async () => {
      mockPrisma.culturalContent.findFirst.mockResolvedValue({
        id: 'content-1',
        moderationStatus: ModerationStatus.PENDING,
        authorAccountId: 'author-1',
      });
      mockPrisma.culturalContent.update.mockResolvedValue({
        id: 'content-1',
        moderationStatus: ModerationStatus.APPROVED,
      });

      const result = await service.moderateCulturalContent(
        'content-1',
        'APPROVED',
        makeActor(),
      );

      expect(result.moderationStatus).toBe(ModerationStatus.APPROVED);
      expect(mockPrisma.culturalContent.update).toHaveBeenCalledWith({
        where: { id: 'content-1' },
        data: { moderationStatus: ModerationStatus.APPROVED },
        select: { id: true, moderationStatus: true },
      });
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockPrisma.contribution.create).toHaveBeenCalledTimes(1);
    });

    it('rejects non-moderators before touching the database', async () => {
      await expect(
        service.moderateCulturalContent(
          'content-1',
          'REJECTED',
          makeActor(AccountRole.USER),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.culturalContent.findFirst).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // verifyAuthority
  // ----------------------------------------------------------------

  describe('verifyAuthority', () => {
    it('grants verification, stamping verifiedAt/by', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue({
        id: 'auth-1',
        verified: false,
        accountId: 'owner-1',
      });
      mockPrisma.culturalAuthority.update.mockResolvedValue({
        id: 'auth-1',
        verified: true,
      });

      const result = await service.verifyAuthority(
        'auth-1',
        true,
        makeActor(),
      );

      expect(result.verified).toBe(true);
      const updateArgs = mockPrisma.culturalAuthority.update.mock.calls[0][0];
      expect(updateArgs.data.verified).toBe(true);
      expect(updateArgs.data.verifiedByAccountId).toBe('mod-1');
      expect(updateArgs.data.verifiedAt).toBeInstanceOf(Date);
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
    });

    it('revokes verification, clearing verifiedAt/by', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue({
        id: 'auth-1',
        verified: true,
        accountId: 'owner-1',
      });
      mockPrisma.culturalAuthority.update.mockResolvedValue({
        id: 'auth-1',
        verified: false,
      });

      await service.verifyAuthority('auth-1', false, makeActor());

      const updateArgs = mockPrisma.culturalAuthority.update.mock.calls[0][0];
      expect(updateArgs.data.verified).toBe(false);
      expect(updateArgs.data.verifiedByAccountId).toBeNull();
      expect(updateArgs.data.verifiedAt).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // resolveReport
  // ----------------------------------------------------------------

  describe('resolveReport', () => {
    it('throws NotFound for an unknown report', async () => {
      mockPrisma.moderationReport.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveReport('report-x', 'RESOLVED', null, makeActor()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('moves a report to RESOLVED and audits it', async () => {
      mockPrisma.moderationReport.findUnique.mockResolvedValue({
        id: 'report-1',
        status: ModerationReportStatus.OPEN,
        targetType: ModerationTargetType.FEED_POST,
        targetId: 'post-1',
      });
      mockPrisma.moderationReport.update.mockResolvedValue({
        id: 'report-1',
        status: ModerationReportStatus.RESOLVED,
      });

      const result = await service.resolveReport(
        'report-1',
        'RESOLVED',
        'handled',
        makeActor(),
      );

      expect(result.status).toBe(ModerationReportStatus.RESOLVED);
      const updateArgs = mockPrisma.moderationReport.update.mock.calls[0][0];
      expect(updateArgs.data.status).toBe(ModerationReportStatus.RESOLVED);
      expect(updateArgs.data.resolvedByAccountId).toBe('mod-1');
      expect(updateArgs.data.resolvedAt).toBeInstanceOf(Date);
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockPrisma.contribution.create).toHaveBeenCalledTimes(1);
    });
  });
});
