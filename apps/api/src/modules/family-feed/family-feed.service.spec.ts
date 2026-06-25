import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VisibilityScope } from '@prisma/client';
import { FamilyFeedService } from './family-feed.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GraphDegreeService } from '../authorization/graph-degree.service';

const REQUESTER = 'person-requester';

interface RawPost {
  id: string;
  lifeEventId: string | null;
  subjectPersonId: string | null;
  authorAccountId: string;
  postType: string;
  body: string | null;
  visibilityScope: VisibilityScope;
  visibleMaxDegree: number | null;
  createdAt: Date;
  updatedAt: Date;
}

function makePost(overrides: Partial<RawPost> = {}): RawPost {
  return {
    id: overrides.id ?? 'post-1',
    lifeEventId: overrides.lifeEventId ?? 'life-event-1',
    subjectPersonId:
      overrides.subjectPersonId !== undefined
        ? overrides.subjectPersonId
        : 'person-subject',
    authorAccountId: overrides.authorAccountId ?? 'account-author',
    postType: overrides.postType ?? 'life-event',
    body: overrides.body ?? null,
    visibilityScope: overrides.visibilityScope ?? VisibilityScope.FAMILY,
    visibleMaxDegree:
      overrides.visibleMaxDegree !== undefined
        ? overrides.visibleMaxDegree
        : null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('FamilyFeedService', () => {
  let service: FamilyFeedService;

  const mockPrisma = {
    feedPost: { findMany: jest.fn(), create: jest.fn() },
    contribution: { create: jest.fn() },
    claim: { findFirst: jest.fn() },
  };

  const mockGraphDegree = {
    computeDegree: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn(
      (_key: string, defaultValue?: number): number | undefined => defaultValue,
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyFeedService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GraphDegreeService, useValue: mockGraphDegree },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<FamilyFeedService>(FamilyFeedService);
    jest.clearAllMocks();
  });

  describe('getFeed visibility', () => {
    it('degree-allow: includes a FAMILY post when degree is within the cap', async () => {
      mockPrisma.feedPost.findMany.mockResolvedValueOnce([
        makePost({ id: 'p-allow', visibleMaxDegree: 3 }),
      ]);
      mockGraphDegree.computeDegree.mockResolvedValue(2);

      const page = await service.getFeed(REQUESTER, { limit: 10 });

      expect(page.items.map((i) => i.id)).toEqual(['p-allow']);
      expect(mockGraphDegree.computeDegree).toHaveBeenCalledWith(
        REQUESTER,
        'person-subject',
        3,
      );
    });

    it('degree-deny: excludes a FAMILY post when degree exceeds the cap', async () => {
      mockPrisma.feedPost.findMany.mockResolvedValueOnce([
        makePost({ id: 'p-deny', visibleMaxDegree: 2 }),
      ]);
      mockGraphDegree.computeDegree.mockResolvedValue(null); // out of bounds

      const page = await service.getFeed(REQUESTER, { limit: 10 });

      expect(page.items).toHaveLength(0);
    });

    it('owner-allow: includes the requester own FAMILY post without a degree lookup', async () => {
      mockPrisma.feedPost.findMany.mockResolvedValueOnce([
        makePost({ id: 'p-own', subjectPersonId: REQUESTER }),
      ]);

      const page = await service.getFeed(REQUESTER, { limit: 10 });

      expect(page.items.map((i) => i.id)).toEqual(['p-own']);
      expect(mockGraphDegree.computeDegree).not.toHaveBeenCalled();
    });

    it('includes PUBLIC posts without a degree lookup', async () => {
      mockPrisma.feedPost.findMany.mockResolvedValueOnce([
        makePost({
          id: 'p-public',
          subjectPersonId: 'stranger',
          visibilityScope: VisibilityScope.PUBLIC,
        }),
      ]);

      const page = await service.getFeed(REQUESTER, { limit: 10 });

      expect(page.items.map((i) => i.id)).toEqual(['p-public']);
      expect(mockGraphDegree.computeDegree).not.toHaveBeenCalled();
    });

    it('excludes PRIVATE_SELF posts owned by someone else', async () => {
      mockPrisma.feedPost.findMany.mockResolvedValueOnce([
        makePost({
          id: 'p-private',
          subjectPersonId: 'someone-else',
          visibilityScope: VisibilityScope.PRIVATE_SELF,
        }),
      ]);

      const page = await service.getFeed(REQUESTER, { limit: 10 });

      expect(page.items).toHaveLength(0);
    });
  });

  describe('soft-delete', () => {
    it('always pre-filters soft-deleted posts at the query level', async () => {
      mockPrisma.feedPost.findMany.mockResolvedValueOnce([]);

      await service.getFeed(REQUESTER, { limit: 10 });

      const callArg = mockPrisma.feedPost.findMany.mock.calls[0][0];
      expect(callArg.where.deletedAt).toBeNull();
    });
  });

  describe('no-edge-leak', () => {
    it('returns only post content — no degree, path, neighbours, or edges', async () => {
      mockPrisma.feedPost.findMany.mockResolvedValueOnce([
        makePost({ id: 'p-shape', visibleMaxDegree: 4 }),
      ]);
      mockGraphDegree.computeDegree.mockResolvedValue(1);

      const page = await service.getFeed(REQUESTER, { limit: 10 });
      const item = page.items[0];

      expect(Object.keys(item).sort()).toEqual(
        [
          'authorAccountId',
          'body',
          'createdAt',
          'id',
          'lifeEventId',
          'postType',
          'subjectPersonId',
          'updatedAt',
          'visibilityScope',
        ].sort(),
      );
      // Defensive: none of the graph-derived fields must surface.
      const leakKeys = ['degree', 'path', 'neighbours', 'neighbors', 'edges', 'visibleMaxDegree'];
      for (const key of leakKeys) {
        expect(item).not.toHaveProperty(key);
      }
    });
  });

  describe('pagination', () => {
    it('memoises degree per subject across posts in one call', async () => {
      mockPrisma.feedPost.findMany.mockResolvedValueOnce([
        makePost({ id: 'a', subjectPersonId: 'subj', visibleMaxDegree: 3 }),
        makePost({ id: 'b', subjectPersonId: 'subj', visibleMaxDegree: 3 }),
      ]);
      mockGraphDegree.computeDegree.mockResolvedValue(1);

      const page = await service.getFeed(REQUESTER, { limit: 10 });

      expect(page.items.map((i) => i.id)).toEqual(['a', 'b']);
      expect(mockGraphDegree.computeDegree).toHaveBeenCalledTimes(1);
    });

    it('emits a cursor and hasMore when a full batch is returned', async () => {
      const batch = Array.from({ length: 100 }, (_, i) =>
        makePost({
          id: `pub-${i}`,
          subjectPersonId: 'x',
          visibilityScope: VisibilityScope.PUBLIC,
          createdAt: new Date(Date.now() - i * 1000),
        }),
      );
      mockPrisma.feedPost.findMany.mockResolvedValueOnce(batch);

      const page = await service.getFeed(REQUESTER, { limit: 5 });

      expect(page.items).toHaveLength(5);
      expect(page.hasMore).toBe(true);
      expect(page.nextCursor).toBeTruthy();
    });
  });

  describe('getFeedForAccount', () => {
    it('returns an empty feed when the account has no verified self-claim', async () => {
      mockPrisma.claim.findFirst.mockResolvedValueOnce(null);

      const page = await service.getFeedForAccount('account-x');

      expect(page).toEqual({ items: [], nextCursor: null, hasMore: false });
      expect(mockPrisma.feedPost.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createPost', () => {
    it('persists a FAMILY post by default and writes an audit row', async () => {
      mockPrisma.feedPost.create.mockResolvedValue(
        makePost({ id: 'created', visibilityScope: VisibilityScope.FAMILY }),
      );
      mockPrisma.contribution.create.mockResolvedValue({});

      const result = await service.createPost({
        lifeEventId: 'life-event-1',
        authorAccountId: 'account-author',
        subjectPersonId: 'person-subject',
        postType: 'life-event',
      });

      expect(result.id).toBe('created');
      const createArg = mockPrisma.feedPost.create.mock.calls[0][0];
      expect(createArg.data.visibilityScope).toBe(VisibilityScope.FAMILY);
      expect(mockPrisma.contribution.create).toHaveBeenCalledTimes(1);
      const auditArg = mockPrisma.contribution.create.mock.calls[0][0];
      expect(auditArg.data.entityType).toBe('feed_post');
      expect(auditArg.data.entityId).toBe('created');
      expect(auditArg.data.action).toBe('CREATE');
    });
  });
});
