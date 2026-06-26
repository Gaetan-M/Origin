import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountRole, EngagementTargetType } from '@prisma/client';
import { EngagementService, EngagementActor } from './engagement.service';
import { PrismaService } from '../../prisma/prisma.service';

const ACCOUNT_ID = 'account-1';
const OTHER_ID = 'account-2';
const MOD_ID = 'account-mod';
const PLACE_ID = '11111111-1111-1111-1111-111111111111';

function actor(
  id: string,
  role: AccountRole = AccountRole.USER,
): EngagementActor {
  return { id, role };
}

describe('EngagementService', () => {
  let service: EngagementService;

  const mockPrisma = {
    tourismPlace: { findFirst: jest.fn() },
    culturalContent: { findFirst: jest.fn() },
    entityReaction: {
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    entityComment: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    entityPhoto: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    placeRating: {
      aggregate: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      groupBy: jest.fn(),
    },
    editSuggestion: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    account: { findMany: jest.fn() },
    media: { findFirst: jest.fn() },
    contribution: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.tourismPlace.findFirst.mockResolvedValue({ id: PLACE_ID });
    mockPrisma.culturalContent.findFirst.mockResolvedValue({ id: PLACE_ID });
    mockPrisma.contribution.create.mockResolvedValue({});

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EngagementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = moduleRef.get(EngagementService);
  });

  describe('setReaction', () => {
    it('creates a new reaction (CREATE audit) and returns totals', async () => {
      mockPrisma.entityReaction.findUnique
        .mockResolvedValueOnce(null) // existing check
        .mockResolvedValueOnce({ reactionType: 'LIKE' }); // myReaction
      mockPrisma.entityReaction.upsert.mockResolvedValue({
        id: 'r1',
        reactionType: 'LIKE',
      });
      mockPrisma.entityReaction.groupBy.mockResolvedValue([
        { reactionType: 'LIKE', _count: 1 },
      ]);

      const result = await service.setReaction(
        'tourism-place',
        PLACE_ID,
        ACCOUNT_ID,
        'LIKE',
      );

      expect(result.myReaction).toBe('LIKE');
      expect(result.reactions.LIKE).toBe(1);
      expect(result.totalReactions).toBe(1);
      const audit = mockPrisma.contribution.create.mock.calls[0][0].data;
      expect(audit.entityType).toBe('engagement_reaction');
      expect(audit.action).toBe('CREATE');
    });

    it('replaces an existing reaction (UPDATE audit)', async () => {
      mockPrisma.entityReaction.findUnique
        .mockResolvedValueOnce({ id: 'r1', reactionType: 'LIKE' }) // existing
        .mockResolvedValueOnce({ reactionType: 'LOVE' }); // myReaction
      mockPrisma.entityReaction.upsert.mockResolvedValue({
        id: 'r1',
        reactionType: 'LOVE',
      });
      mockPrisma.entityReaction.groupBy.mockResolvedValue([
        { reactionType: 'LOVE', _count: 1 },
      ]);

      const result = await service.setReaction(
        'tourism-place',
        PLACE_ID,
        ACCOUNT_ID,
        'LOVE',
      );

      expect(result.myReaction).toBe('LOVE');
      expect(result.reactions.LOVE).toBe(1);
      expect(result.reactions.LIKE).toBe(0);
      const audit = mockPrisma.contribution.create.mock.calls[0][0].data;
      expect(audit.action).toBe('UPDATE');
      // upsert update branch carries the replacement type
      expect(mockPrisma.entityReaction.upsert.mock.calls[0][0].update).toEqual({
        reactionType: 'LOVE',
      });
    });
  });

  describe('getSummary', () => {
    it('aggregates reaction/comment/photo counts + rating for a tourism place', async () => {
      mockPrisma.entityReaction.groupBy.mockResolvedValue([
        { reactionType: 'LIKE', _count: 2 },
        { reactionType: 'LOVE', _count: 1 },
      ]);
      mockPrisma.entityComment.count.mockResolvedValue(3);
      mockPrisma.entityPhoto.count.mockResolvedValue(4);
      mockPrisma.placeRating.aggregate.mockResolvedValue({
        _avg: { stars: 4.5 },
        _count: 2,
      });

      const summary = await service.getSummary('tourism-place', PLACE_ID);

      expect(summary.totalReactions).toBe(3);
      expect(summary.reactions.LIKE).toBe(2);
      expect(summary.reactions.LOVE).toBe(1);
      expect(summary.reactions.WOW).toBe(0);
      expect(summary.commentCount).toBe(3);
      expect(summary.photoCount).toBe(4);
      expect(summary.rating).toEqual({ average: 4.5, count: 2, mine: null });
      // APPROVED-only photo count
      expect(mockPrisma.entityPhoto.count.mock.calls[0][0].where.status).toBe(
        'APPROVED',
      );
    });

    it('returns null rating for cultural content', async () => {
      mockPrisma.entityReaction.groupBy.mockResolvedValue([]);
      mockPrisma.entityComment.count.mockResolvedValue(0);
      mockPrisma.entityPhoto.count.mockResolvedValue(0);

      const summary = await service.getSummary('cultural-content', PLACE_ID);

      expect(summary.rating).toBeNull();
      expect(mockPrisma.placeRating.aggregate).not.toHaveBeenCalled();
    });
  });

  describe('ratePlace', () => {
    it('rejects ratings on cultural content (400)', async () => {
      await expect(
        service.ratePlace('cultural-content', PLACE_ID, ACCOUNT_ID, 5),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.placeRating.upsert).not.toHaveBeenCalled();
    });

    it('upserts a rating for a tourism place', async () => {
      mockPrisma.placeRating.findUnique.mockResolvedValue(null);
      mockPrisma.placeRating.upsert.mockResolvedValue({ id: 'rt1', stars: 5 });
      mockPrisma.placeRating.aggregate.mockResolvedValue({
        _avg: { stars: 5 },
        _count: 1,
      });

      const result = await service.ratePlace(
        'tourism-place',
        PLACE_ID,
        ACCOUNT_ID,
        5,
      );

      expect(result).toEqual({ average: 5, count: 1, mine: 5 });
      expect(mockPrisma.contribution.create.mock.calls[0][0].data.entityType).toBe(
        'place_rating',
      );
    });
  });

  describe('comments', () => {
    it('creates a comment attributed to the author with mine=true', async () => {
      mockPrisma.entityComment.create.mockResolvedValue({
        id: 'c1',
        body: 'Bonjour',
        accountId: ACCOUNT_ID,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      mockPrisma.account.findMany.mockResolvedValue([
        { id: ACCOUNT_ID, fullName: 'Jane Doe' },
      ]);

      const created = await service.addComment(
        'tourism-place',
        PLACE_ID,
        ACCOUNT_ID,
        'Bonjour',
      );

      expect(created.mine).toBe(true);
      expect(created.authorDisplayName).toBe('Jane Doe');
      expect(mockPrisma.entityComment.create.mock.calls[0][0].data.targetType).toBe(
        EngagementTargetType.TOURISM_PLACE,
      );
      const audit = mockPrisma.contribution.create.mock.calls[0][0].data;
      expect(audit.entityType).toBe('engagement_comment');
      expect(audit.action).toBe('CREATE');
    });

    it('lets the author soft-delete their own comment', async () => {
      mockPrisma.entityComment.findUnique.mockResolvedValue({
        id: 'c1',
        accountId: ACCOUNT_ID,
        deletedAt: null,
      });

      await service.deleteComment('c1', actor(ACCOUNT_ID));

      expect(mockPrisma.entityComment.update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(
        Date,
      );
      expect(mockPrisma.contribution.create.mock.calls[0][0].data.action).toBe(
        'DELETE',
      );
    });

    it('forbids a non-author non-moderator from deleting', async () => {
      mockPrisma.entityComment.findUnique.mockResolvedValue({
        id: 'c1',
        accountId: OTHER_ID,
        deletedAt: null,
      });

      await expect(
        service.deleteComment('c1', actor(ACCOUNT_ID)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.entityComment.update).not.toHaveBeenCalled();
    });

    it('lets a moderator delete another user comment', async () => {
      mockPrisma.entityComment.findUnique.mockResolvedValue({
        id: 'c1',
        accountId: OTHER_ID,
        deletedAt: null,
      });

      await service.deleteComment('c1', actor(MOD_ID, AccountRole.MODERATOR));

      expect(mockPrisma.entityComment.update).toHaveBeenCalledTimes(1);
    });
  });
});
