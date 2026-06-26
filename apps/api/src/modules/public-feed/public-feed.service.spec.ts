import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  CulturalContentType,
  ModerationStatus,
  VisibilityScope,
} from '@prisma/client';
import { PublicFeedService } from './public-feed.service';
import { PrismaService } from '../../prisma/prisma.service';

interface RawContent {
  id: string;
  contentType: CulturalContentType;
  title: string;
  body: string | null;
  languageCode: string | null;
  region: string | null;
  ethnicGroup: string | null;
  mediaId: string | null;
  authorAccountId: string;
  authorityId: string | null;
  isFromVerifiedAuthority: boolean;
  createdAt: Date;
}

function makeContent(overrides: Partial<RawContent> = {}): RawContent {
  return {
    id: overrides.id ?? 'content-1',
    contentType: overrides.contentType ?? CulturalContentType.PROVERB,
    title: overrides.title ?? 'Un proverbe',
    body: overrides.body ?? 'Le corps du proverbe',
    languageCode: overrides.languageCode ?? 'bas',
    region: overrides.region ?? 'Centre',
    ethnicGroup: overrides.ethnicGroup ?? 'Bassa',
    mediaId: overrides.mediaId ?? null,
    authorAccountId: overrides.authorAccountId ?? 'account-author',
    authorityId:
      overrides.authorityId !== undefined ? overrides.authorityId : null,
    isFromVerifiedAuthority: overrides.isFromVerifiedAuthority ?? false,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
  };
}

/** Exactly the keys allowed to leave the public feed — nothing else may appear. */
const ALLOWED_PUBLIC_KEYS = [
  'id',
  'contentType',
  'title',
  'body',
  'languageCode',
  'region',
  'ethnicGroup',
  'mediaId',
  'imageUrl',
  'authorDisplayName',
  'authorityVerified',
  'createdAt',
].sort();

/** Fields that would leak the private/family world — must never be present. */
const FORBIDDEN_KEYS = [
  'authorAccountId',
  'authorityId',
  'moderationStatus',
  'visibilityScope',
  'deletedAt',
  'subjectPersonId',
  'visibleMaxDegree',
  'phoneNumber',
  'degree',
];

describe('PublicFeedService', () => {
  let service: PublicFeedService;

  const mockPrisma = {
    culturalContent: { findMany: jest.fn() },
    culturalAuthority: { findMany: jest.fn() },
    account: { findMany: jest.fn() },
    feedPost: { findFirst: jest.fn(), update: jest.fn() },
    contribution: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.culturalAuthority.findMany.mockResolvedValue([]);
    mockPrisma.account.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicFeedService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PublicFeedService>(PublicFeedService);
  });

  describe('getPublicFeed', () => {
    it('queries ONLY approved + public + non-deleted content (excludes pending/rejected/soft-deleted at the DB layer)', async () => {
      mockPrisma.culturalContent.findMany.mockResolvedValue([]);

      await service.getPublicFeed({});

      expect(mockPrisma.culturalContent.findMany).toHaveBeenCalledTimes(1);
      const args = mockPrisma.culturalContent.findMany.mock.calls[0][0];
      expect(args.where).toMatchObject({
        deletedAt: null,
        moderationStatus: ModerationStatus.APPROVED,
        visibilityScope: VisibilityScope.PUBLIC,
      });
    });

    it('ranks verified-authority content first, then newest (orderBy)', async () => {
      mockPrisma.culturalContent.findMany.mockResolvedValue([]);

      await service.getPublicFeed({});

      const args = mockPrisma.culturalContent.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual([
        { isFromVerifiedAuthority: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ]);
    });

    it('preserves the verified-first order returned by the DB and reflects authorityVerified', async () => {
      const verified = makeContent({
        id: 'verified-1',
        authorityId: 'authority-1',
        isFromVerifiedAuthority: true,
      });
      const community = makeContent({
        id: 'community-1',
        isFromVerifiedAuthority: false,
      });
      mockPrisma.culturalContent.findMany.mockResolvedValue([
        verified,
        community,
      ]);
      mockPrisma.culturalAuthority.findMany.mockResolvedValue([
        { id: 'authority-1', displayName: 'Chefferie Bandjoun' },
      ]);
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'account-author', fullName: 'Community Author' },
      ]);

      const page = await service.getPublicFeed({});

      expect(page.items.map((i) => i.id)).toEqual(['verified-1', 'community-1']);
      expect(page.items[0].authorityVerified).toBe(true);
      expect(page.items[0].authorDisplayName).toBe('Chefferie Bandjoun');
      expect(page.items[1].authorityVerified).toBe(false);
      expect(page.items[1].authorDisplayName).toBe('Community Author');
    });

    it('exposes ZERO private fields — only the allowed public projection leaves the service', async () => {
      mockPrisma.culturalContent.findMany.mockResolvedValue([
        makeContent({ authorityId: 'authority-1', isFromVerifiedAuthority: true }),
      ]);
      mockPrisma.culturalAuthority.findMany.mockResolvedValue([
        { id: 'authority-1', displayName: 'Expert Douala' },
      ]);

      const page = await service.getPublicFeed({});
      const item = page.items[0];

      expect(Object.keys(item).sort()).toEqual(ALLOWED_PUBLIC_KEYS);
      for (const forbidden of FORBIDDEN_KEYS) {
        expect(item).not.toHaveProperty(forbidden);
      }
    });

    it('emits a nextCursor and trims the extra look-ahead row when more pages exist', async () => {
      // limit 1 -> service fetches 2; 2 returned means hasMore.
      mockPrisma.culturalContent.findMany.mockResolvedValue([
        makeContent({ id: 'a', createdAt: new Date('2026-02-02T00:00:00.000Z') }),
        makeContent({ id: 'b', createdAt: new Date('2026-02-01T00:00:00.000Z') }),
      ]);

      const page = await service.getPublicFeed({ limit: 1 });

      expect(page.items).toHaveLength(1);
      expect(page.items[0].id).toBe('a');
      expect(page.hasMore).toBe(true);
      expect(page.nextCursor).toEqual(expect.any(String));
    });

    it('passes optional contentType and ethnicGroup filters through to the query', async () => {
      mockPrisma.culturalContent.findMany.mockResolvedValue([]);

      await service.getPublicFeed({
        contentType: CulturalContentType.RECIPE,
        ethnicGroup: 'Douala',
      });

      const args = mockPrisma.culturalContent.findMany.mock.calls[0][0];
      expect(args.where).toMatchObject({
        contentType: CulturalContentType.RECIPE,
        ethnicGroup: 'Douala',
      });
    });
  });

  describe('publishFeedPost', () => {
    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
      );
    });

    it('throws NotFound when the post does not exist', async () => {
      mockPrisma.feedPost.findFirst.mockResolvedValue(null);

      await expect(
        service.publishFeedPost('post-1', 'account-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Forbidden when the requester is not the author', async () => {
      mockPrisma.feedPost.findFirst.mockResolvedValue({
        id: 'post-1',
        authorAccountId: 'someone-else',
        visibilityScope: VisibilityScope.FAMILY,
      });

      await expect(
        service.publishFeedPost('post-1', 'account-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.feedPost.update).not.toHaveBeenCalled();
    });

    it('flips the author own post to PUBLIC and writes a Contribution audit row', async () => {
      mockPrisma.feedPost.findFirst.mockResolvedValue({
        id: 'post-1',
        authorAccountId: 'account-1',
        visibilityScope: VisibilityScope.FAMILY,
      });
      mockPrisma.feedPost.update.mockResolvedValue({
        id: 'post-1',
        visibilityScope: VisibilityScope.PUBLIC,
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      });

      const result = await service.publishFeedPost('post-1', 'account-1');

      expect(mockPrisma.feedPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'post-1' },
          data: { visibilityScope: VisibilityScope.PUBLIC },
        }),
      );
      expect(mockPrisma.contribution.create).toHaveBeenCalledTimes(1);
      const contribArgs = mockPrisma.contribution.create.mock.calls[0][0];
      expect(contribArgs.data).toMatchObject({
        accountId: 'account-1',
        entityType: 'feed_post',
        entityId: 'post-1',
        action: 'UPDATE',
      });
      expect(result.visibilityScope).toBe(VisibilityScope.PUBLIC);
    });
  });
});
