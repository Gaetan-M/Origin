import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, VisibilityScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_MAX_DEGREE,
  GraphDegreeService,
} from '../authorization/graph-degree.service';

/**
 * A single sanitised feed item. This is the ONLY shape that leaves the service
 * for the read API. It intentionally carries no family-graph data: no computed
 * degree, no relationship path, no neighbour/relative identities — only the
 * post's own content. Leaking any of those would expose the requester's
 * private family structure, which the degree gate exists to protect.
 */
export interface FeedItem {
  id: string;
  lifeEventId: string | null;
  /** The person the post is about (the post's own subject, not a relative graph edge). */
  subjectPersonId: string | null;
  authorAccountId: string;
  postType: string;
  body: string | null;
  visibilityScope: VisibilityScope;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedPage {
  items: FeedItem[];
  /** Opaque cursor to pass back as `cursor` for the next page, or null when exhausted. */
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FeedPagination {
  cursor?: string;
  limit?: number;
}

export interface CreateFeedPostInput {
  lifeEventId?: string | null;
  authorAccountId: string;
  /** Visibility OWNER personId — the person the event is about. */
  subjectPersonId: string | null;
  postType: string;
  body?: string | null;
  visibilityScope?: VisibilityScope;
  visibleMaxDegree?: number | null;
}

interface KeysetCursor {
  createdAt: string;
  id: string;
}

/** Hard cap on candidate rows scanned per getFeed call — DoS guard on degree BFS. */
const MAX_CANDIDATES_SCANNED = 500;
/** Default page size when the caller does not specify one. */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
/** Size of each DB fetch while filtering candidates down to visible posts. */
const SCAN_BATCH_SIZE = 100;

/**
 * Degree-bounded private family feed (read + core write helper).
 *
 * Read path enforces the visibility model post-by-post against the requesting
 * person, reusing {@link GraphDegreeService} for FAMILY-scope degree checks.
 * The DB query can only pre-filter on scope + soft-delete; the degree gate is
 * applied in-process, so pagination is keyset over *candidates* and a page may
 * legitimately return fewer than `limit` items while `hasMore` is still true.
 */
@Injectable()
export class FamilyFeedService {
  private readonly logger = new Logger(FamilyFeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphDegree: GraphDegreeService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Convenience wrapper for the controller: resolves the account's claimed
   * person node, then delegates to {@link getFeed}. An account with no verified
   * self-claim has no position in the graph and therefore an empty family feed.
   */
  async getFeedForAccount(
    accountId: string,
    pagination: FeedPagination = {},
  ): Promise<FeedPage> {
    const requesterPersonId = await this.resolveRequesterPersonId(accountId);
    if (!requesterPersonId) {
      return { items: [], nextCursor: null, hasMore: false };
    }
    return this.getFeed(requesterPersonId, pagination);
  }

  /**
   * Returns the feed posts the requester may see, newest first.
   *
   * A post is visible when it is PUBLIC, when the requester is the owner
   * (subject) of the post, or when the post is FAMILY-scope and the requester's
   * shortest family-graph degree to the subject is within the post's
   * `visibleMaxDegree` (falling back to the configured family max degree).
   */
  async getFeed(
    requesterPersonId: string,
    pagination: FeedPagination = {},
  ): Promise<FeedPage> {
    const limit = this.clampLimit(pagination.limit);
    const startCursor = this.decodeCursor(pagination.cursor);

    const items: FeedItem[] = [];
    // Memoise degree per subject within this single request — many posts can
    // share a subject, and each BFS is the dominant cost.
    const degreeCache = new Map<string, number | null>();

    let cursor = startCursor;
    let scanned = 0;
    let lastScannedCursor: KeysetCursor | null = null;
    let exhausted = false;

    while (items.length < limit && scanned < MAX_CANDIDATES_SCANNED) {
      const batch = await this.fetchCandidateBatch(cursor, SCAN_BATCH_SIZE);
      if (batch.length === 0) {
        exhausted = true;
        break;
      }

      for (const post of batch) {
        scanned += 1;
        lastScannedCursor = {
          createdAt: post.createdAt.toISOString(),
          id: post.id,
        };

        const visible = await this.canSee(requesterPersonId, post, degreeCache);
        if (visible) {
          items.push(this.toFeedItem(post));
          if (items.length >= limit) {
            break;
          }
        }
      }

      cursor = lastScannedCursor;
      if (batch.length < SCAN_BATCH_SIZE) {
        exhausted = true;
        break;
      }
    }

    const hasMore = !exhausted;
    return {
      items,
      nextCursor: hasMore && lastScannedCursor ? this.encodeCursor(lastScannedCursor) : null,
      hasMore,
    };
  }

  /**
   * Persists a FeedPost (used by the life-event fan-out handler) and writes the
   * mandatory audit row. Defaults visibility to FAMILY per the visibility model.
   */
  async createPost(input: CreateFeedPostInput): Promise<FeedItem> {
    const post = await this.prisma.feedPost.create({
      data: {
        lifeEventId: input.lifeEventId ?? null,
        authorAccountId: input.authorAccountId,
        subjectPersonId: input.subjectPersonId,
        postType: input.postType,
        body: input.body ?? null,
        visibilityScope: input.visibilityScope ?? VisibilityScope.FAMILY,
        visibleMaxDegree: input.visibleMaxDegree ?? null,
      },
    });

    await this.prisma.contribution.create({
      data: {
        accountId: input.authorAccountId,
        entityType: 'feed_post',
        entityId: post.id,
        action: 'CREATE',
        newValue: {
          postType: input.postType,
          visibilityScope: post.visibilityScope,
          lifeEventId: input.lifeEventId ?? null,
        } as unknown as Prisma.JsonObject,
      },
    });

    return this.toFeedItem(post);
  }

  /**
   * Loads a single post and asserts the requesting account may access it,
   * applying the exact same visibility rules as the feed read path. Throws
   * NotFound when the post is absent/soft-deleted and Forbidden when it exists
   * but the requester cannot see it. Returns the sanitised item on success.
   *
   * Used by the engagement (reactions/comments) services as their access gate.
   */
  async assertCanAccessPost(
    feedPostId: string,
    accountId: string,
  ): Promise<FeedItem> {
    const post = await this.prisma.feedPost.findFirst({
      where: { id: feedPostId, deletedAt: null },
      select: {
        id: true,
        lifeEventId: true,
        subjectPersonId: true,
        authorAccountId: true,
        postType: true,
        body: true,
        visibilityScope: true,
        visibleMaxDegree: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!post) {
      throw new NotFoundException('Content not accessible');
    }

    const requesterPersonId = await this.resolveRequesterPersonId(accountId);
    // A requester with no graph node can still see PUBLIC content, nothing else.
    const visible = requesterPersonId
      ? await this.canSee(requesterPersonId, post, new Map())
      : post.visibilityScope === VisibilityScope.PUBLIC;

    if (!visible) {
      throw new ForbiddenException('Content not accessible');
    }
    return this.toFeedItem(post);
  }

  /**
   * Resolves the person node an account is claimed as (verified self-claim).
   */
  private async resolveRequesterPersonId(
    accountId: string,
  ): Promise<string | null> {
    const claim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
      select: { personId: true },
    });
    return claim?.personId ?? null;
  }

  /**
   * Fetches the next batch of candidate posts (scope-prefiltered, non-deleted)
   * after the given keyset cursor, ordered newest-first.
   */
  private async fetchCandidateBatch(
    cursor: KeysetCursor | null,
    take: number,
  ): Promise<FeedPostRow[]> {
    const where: Prisma.FeedPostWhereInput = {
      deletedAt: null,
      visibilityScope: {
        in: [
          VisibilityScope.PUBLIC,
          VisibilityScope.FAMILY,
          VisibilityScope.PRIVATE_SELF,
        ],
      },
    };

    if (cursor) {
      const cursorDate = new Date(cursor.createdAt);
      // Keyset: strictly older than the cursor by (created_at, id).
      where.OR = [
        { createdAt: { lt: cursorDate } },
        { createdAt: cursorDate, id: { lt: cursor.id } },
      ];
    }

    return this.prisma.feedPost.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      select: {
        id: true,
        lifeEventId: true,
        subjectPersonId: true,
        authorAccountId: true,
        postType: true,
        body: true,
        visibilityScope: true,
        visibleMaxDegree: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Visibility decision for a single post. Mirrors VisibilityGuard semantics but
   * operates on a collection item rather than a guarded route.
   */
  private async canSee(
    requesterPersonId: string,
    post: FeedPostRow,
    degreeCache: Map<string, number | null>,
  ): Promise<boolean> {
    switch (post.visibilityScope) {
      case VisibilityScope.PUBLIC:
        return true;

      case VisibilityScope.PRIVATE_SELF:
        return (
          post.subjectPersonId !== null &&
          post.subjectPersonId === requesterPersonId
        );

      case VisibilityScope.FAMILY: {
        if (!post.subjectPersonId) {
          // No owner node -> cannot evaluate family closeness -> fail closed.
          return false;
        }
        if (post.subjectPersonId === requesterPersonId) {
          return true;
        }
        const maxDegree = this.resolveMaxDegree(post.visibleMaxDegree);
        const cacheKey = `${post.subjectPersonId}:${maxDegree}`;
        let degree = degreeCache.get(cacheKey);
        if (degree === undefined) {
          degree = await this.graphDegree.computeDegree(
            requesterPersonId,
            post.subjectPersonId,
            maxDegree,
          );
          degreeCache.set(cacheKey, degree);
        }
        return degree !== null && degree <= maxDegree;
      }

      default:
        // Unknown scope -> fail closed.
        return false;
    }
  }

  private resolveMaxDegree(postMaxDegree: number | null): number {
    return (
      postMaxDegree ??
      this.config.get<number>('authorization.familyMaxDegree', DEFAULT_MAX_DEGREE)
    );
  }

  private clampLimit(limit?: number): number {
    if (limit === undefined || !Number.isFinite(limit)) {
      return DEFAULT_LIMIT;
    }
    return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)));
  }

  /** Strips all graph/degree data — only the post's own content leaves here. */
  private toFeedItem(post: FeedPostRow): FeedItem {
    return {
      id: post.id,
      lifeEventId: post.lifeEventId,
      subjectPersonId: post.subjectPersonId,
      authorAccountId: post.authorAccountId,
      postType: post.postType,
      body: post.body,
      visibilityScope: post.visibilityScope,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private encodeCursor(cursor: KeysetCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(raw?: string): KeysetCursor | null {
    if (!raw) {
      return null;
    }
    try {
      const decoded = JSON.parse(
        Buffer.from(raw, 'base64url').toString('utf8'),
      ) as Partial<KeysetCursor>;
      if (
        typeof decoded.createdAt === 'string' &&
        typeof decoded.id === 'string' &&
        !Number.isNaN(Date.parse(decoded.createdAt))
      ) {
        return { createdAt: decoded.createdAt, id: decoded.id };
      }
      return null;
    } catch {
      // Invalid/garbage cursor -> start from the beginning rather than 500.
      this.logger.debug('Ignoring malformed feed cursor');
      return null;
    }
  }
}

/**
 * The exact selected row shape from {@link FamilyFeedService.fetchCandidateBatch}.
 * Kept local so the service depends on field names, not a generated mega-type.
 */
interface FeedPostRow {
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
