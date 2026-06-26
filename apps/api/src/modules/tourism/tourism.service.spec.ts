import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountRole,
  TourismCategory,
  TourismSource,
  VisibilityScope,
} from '@prisma/client';
import { TourismService } from './tourism.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin/admin-audit.service';
import type { AdminActor } from '../../common/decorators/admin-actor.decorator';
import { SubmitPlaceDto } from './dto/submit-place.dto';

const ACCOUNT_ID = 'account-submitter';
const MODERATOR_ID = 'account-moderator';

function makeDto(overrides: Partial<SubmitPlaceDto> = {}): SubmitPlaceDto {
  return {
    name: overrides.name ?? 'Chefferie de Bandjoun',
    description: overrides.description,
    region: overrides.region ?? 'Ouest',
    category: overrides.category ?? TourismCategory.CHEFFERIE,
    latitude: overrides.latitude,
    longitude: overrides.longitude,
    source: overrides.source ?? TourismSource.MINISTRY,
    sourceRef:
      overrides.sourceRef ?? 'https://mintour.gov.cm/sites/bandjoun',
    mediaId: overrides.mediaId,
  };
}

function moderator(role: AccountRole = AccountRole.MODERATOR): AdminActor {
  return {
    accountId: MODERATOR_ID,
    role,
    ipAddress: null,
    userAgent: null,
    requestId: null,
  };
}

describe('TourismService', () => {
  let service: TourismService;

  const tx = {
    tourismPlace: { create: jest.fn() },
    contribution: { create: jest.fn() },
  };

  const mockPrisma = {
    tourismPlace: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    contribution: { create: jest.fn() },
    $transaction: jest.fn(
      async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
    ),
  };

  const mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    tx.tourismPlace.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'place-1',
        ...data,
      }),
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TourismService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AdminAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = moduleRef.get(TourismService);
  });

  describe('submitPlace', () => {
    it('creates an UNVERIFIED PUBLIC place keeping its provenance', async () => {
      const result = await service.submitPlace(
        ACCOUNT_ID,
        makeDto({ source: TourismSource.NGO, sourceRef: 'ngo-report-2026' }),
      );

      expect(tx.tourismPlace.create).toHaveBeenCalledTimes(1);
      const created = tx.tourismPlace.create.mock.calls[0][0].data;
      expect(created.verified).toBe(false);
      expect(created.visibilityScope).toBe(VisibilityScope.PUBLIC);
      expect(created.submittedByAccountId).toBe(ACCOUNT_ID);
      // Provenance is persisted so the origin is always transparent.
      expect(created.source).toBe(TourismSource.NGO);
      expect(created.sourceRef).toBe('ngo-report-2026');
      expect(result.verified).toBe(false);
    });

    it('writes a Contribution audit row including provenance', async () => {
      await service.submitPlace(ACCOUNT_ID, makeDto());

      expect(tx.contribution.create).toHaveBeenCalledTimes(1);
      const audit = tx.contribution.create.mock.calls[0][0].data;
      expect(audit.accountId).toBe(ACCOUNT_ID);
      expect(audit.entityType).toBe('tourism_place');
      expect(audit.entityId).toBe('place-1');
      expect(audit.action).toBe('CREATE');
      expect(audit.newValue.source).toBe(TourismSource.MINISTRY);
    });
  });

  describe('listPlaces', () => {
    it('lists PUBLIC non-deleted places verified-first then newest-first', async () => {
      mockPrisma.tourismPlace.findMany.mockResolvedValue([]);

      await service.listPlaces({ region: 'Ouest' });

      const args = mockPrisma.tourismPlace.findMany.mock.calls[0][0];
      expect(args.where.deletedAt).toBeNull();
      expect(args.where.visibilityScope).toBe(VisibilityScope.PUBLIC);
      expect(args.where.region).toBe('Ouest');
      expect(args.orderBy).toEqual([
        { verified: 'desc' },
        { createdAt: 'desc' },
      ]);
    });

    it('filters to verified only when requested', async () => {
      mockPrisma.tourismPlace.findMany.mockResolvedValue([]);

      await service.listPlaces({ verifiedOnly: true });

      const args = mockPrisma.tourismPlace.findMany.mock.calls[0][0];
      expect(args.where.verified).toBe(true);
    });
  });

  describe('getPlace', () => {
    it('throws when the place is missing', async () => {
      mockPrisma.tourismPlace.findFirst.mockResolvedValue(null);

      await expect(service.getPlace('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('verifyPlace', () => {
    it('rejects a non-moderator actor (gating)', async () => {
      await expect(
        service.verifyPlace('place-1', moderator(AccountRole.USER), true),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.tourismPlace.update).not.toHaveBeenCalled();
    });

    it('sets verified + verified_by and writes both audit trails', async () => {
      mockPrisma.tourismPlace.findFirst.mockResolvedValue({
        id: 'place-1',
        verified: false,
        submittedByAccountId: ACCOUNT_ID,
      });
      mockPrisma.tourismPlace.update.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'place-1',
          ...data,
        }),
      );

      const result = await service.verifyPlace('place-1', moderator(), true);

      const updateArgs = mockPrisma.tourismPlace.update.mock.calls[0][0];
      expect(updateArgs.data.verified).toBe(true);
      expect(updateArgs.data.verifiedByAccountId).toBe(MODERATOR_ID);
      expect(result.verified).toBe(true);

      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockAudit.record.mock.calls[0][0].action).toBe(
        'tourism_place.verify',
      );
      expect(mockPrisma.contribution.create).toHaveBeenCalledTimes(1);
      const contrib = mockPrisma.contribution.create.mock.calls[0][0].data;
      expect(contrib.entityType).toBe('tourism_place');
      expect(contrib.action).toBe('VERIFY');
    });

    it('clears verified_by when revoking', async () => {
      mockPrisma.tourismPlace.findFirst.mockResolvedValue({
        id: 'place-1',
        verified: true,
        submittedByAccountId: ACCOUNT_ID,
      });
      mockPrisma.tourismPlace.update.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'place-1',
          ...data,
        }),
      );

      await service.verifyPlace('place-1', moderator(), false);

      const updateArgs = mockPrisma.tourismPlace.update.mock.calls[0][0];
      expect(updateArgs.data.verified).toBe(false);
      expect(updateArgs.data.verifiedByAccountId).toBeNull();
      expect(mockAudit.record.mock.calls[0][0].action).toBe(
        'tourism_place.unverify',
      );
    });
  });
});
