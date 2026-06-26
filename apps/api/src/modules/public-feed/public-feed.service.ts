import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CulturalContentType,
  ModerationStatus,
  Prisma,
  VisibilityScope,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * A single sanitised PUBLIC discovery-feed item.
 *
 * This is the ONLY shape that leaves the service for the public read API. It
 * carries exclusively public cultural-heritage fields plus author/authority
 * display info. It NEVER carries family-graph data: no relationships, no
 * degrees, no phone numbers, no private person data, not even the author's
 * account id. The public world is fully decoupled from the private family
 * world; leaking any graph edge here would defeat that separation.
 */
export interface PublicFeedItem {
  id: string;
  contentType: CulturalContentType;
  title: string;
  body: string | null;
  languageCode: string | null;
  region: string | null;
  ethnicGroup: string | null;
  mediaId: string | null;
  /** Optional external hero image URL (e.g. Wikimedia Commons). */
  imageUrl: string | null;
  /** Display name to attribute the content to (authority name preferred). */
  authorDisplayName: string | null;
  /** Whether the content originates from a verified authority/expert/chefferie. */
  authorityVerified: boolean;
  createdAt: Date;
}

export interface PublicFeedPage {
  items: PublicFeedItem[];
  /** Opaque cursor to pass back as `cursor` for the next page, or null when exhausted. */
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PublicFeedQuery {
  cursor?: string;
  limit?: number;
  contentType?: CulturalContentType;
  ethnicGroup?: string;
}

/** Result of opting a private FeedPost into the public world. */
export interface PublishFeedPostResult {
  id: string;
  visibilityScope: VisibilityScope;
  publishedAt: Date;
}

/**
 * Keyset cursor for the public feed.
 *
 * Sort order is (verified-authority first, then newest first): the boolean is
 * the primary key so verified content always leads, with (created_at, id) as
 * the deterministic tie-breaker.
 */
interface PublicKeysetCursor {
  verified: boolean;
  createdAt: string;
  id: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Exact selected row shape from the candidate query. Kept local so the service
 * depends on field names, not a generated mega-type.
 */
interface CulturalContentRow {
  id: string;
  contentType: CulturalContentType;
  title: string;
  body: string | null;
  languageCode: string | null;
  region: string | null;
  ethnicGroup: string | null;
  mediaId: string | null;
  imageUrl: string | null;
  authorAccountId: string;
  authorityId: string | null;
  isFromVerifiedAuthority: boolean;
  createdAt: Date;
}

/**
 * Public cultural-heritage discovery feed.
 *
 * Read path returns only APPROVED + PUBLIC + non-deleted CulturalContent,
 * ranked verified-authority-first then newest-first, keyset-paginated. The DB
 * does all the filtering; the service only projects rows down to the public
 * item shape and resolves display attribution. There is intentionally no
 * visibility/degree gate here — by construction nothing private can match the
 * query, and the projected payload exposes no graph data.
 */
@Injectable()
export class PublicFeedService {
  private readonly logger = new Logger(PublicFeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a page of the public discovery feed.
   *
   * Only content that is simultaneously APPROVED, PUBLIC and not soft-deleted is
   * eligible. Results lead with verified-authority content, then fall back to
   * newest-first. Pagination is keyset over (verified, created_at, id).
   */
  async getPublicFeed(query: PublicFeedQuery = {}): Promise<PublicFeedPage> {
    const limit = this.clampLimit(query.limit);
    const cursor = this.decodeCursor(query.cursor);

    const baseWhere: Prisma.CulturalContentWhereInput = {
      deletedAt: null,
      moderationStatus: ModerationStatus.APPROVED,
      visibilityScope: VisibilityScope.PUBLIC,
      ...(query.contentType ? { contentType: query.contentType } : {}),
      ...(query.ethnicGroup ? { ethnicGroup: query.ethnicGroup } : {}),
    };

    const keyset = this.buildKeysetFilter(cursor);
    const where: Prisma.CulturalContentWhereInput = keyset
      ? { AND: [baseWhere, keyset] }
      : baseWhere;

    // Fetch one extra row to detect whether a further page exists.
    const rows = (await this.prisma.culturalContent.findMany({
      where,
      orderBy: [
        { isFromVerifiedAuthority: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit + 1,
      select: {
        id: true,
        contentType: true,
        title: true,
        body: true,
        languageCode: true,
        region: true,
        ethnicGroup: true,
        mediaId: true,
        imageUrl: true,
        authorAccountId: true,
        authorityId: true,
        isFromVerifiedAuthority: true,
        createdAt: true,
      },
    })) as CulturalContentRow[];

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const displayNames = await this.resolveDisplayNames(pageRows);
    const items = pageRows.map((row) => this.toPublicItem(row, displayNames));

    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last
        ? this.encodeCursor({
            verified: last.isFromVerifiedAuthority,
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          })
        : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Opt-in publish: flips a single private FeedPost to PUBLIC visibility for its
   * author only.
   *
   * Verifies the requester owns the post, then promotes that one item and writes
   * the mandatory Contribution audit row. The public projection of a FeedPost
   * still strips all graph edges, so making a post public never exposes the
   * author's family structure.
   */
  async publishFeedPost(
    feedPostId: string,
    accountId: string,
  ): Promise<PublishFeedPostResult> {
    const post = await this.prisma.feedPost.findFirst({
      where: { id: feedPostId, deletedAt: null },
      select: { id: true, authorAccountId: true, visibilityScope: true },
    });
    if (!post) {
      throw new NotFoundException('Content not accessible');
    }
    if (post.authorAccountId !== accountId) {
      // Only the author may publish their own post into the public world.
      throw new ForbiddenException('Content not accessible');
    }

    const previousScope = post.visibilityScope;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.feedPost.update({
        where: { id: feedPostId },
        data: { visibilityScope: VisibilityScope.PUBLIC },
        select: { id: true, visibilityScope: true, updatedAt: true },
      });

      await tx.contribution.create({
        data: {
          accountId,
          entityType: 'feed_post',
          entityId: feedPostId,
          action: 'UPDATE',
          oldValue: {
            visibilityScope: previousScope,
          } as unknown as Prisma.JsonObject,
          newValue: {
            visibilityScope: VisibilityScope.PUBLIC,
            publishedToPublicFeed: true,
          } as unknown as Prisma.JsonObject,
        },
      });

      return result;
    });

    return {
      id: updated.id,
      visibilityScope: updated.visibilityScope,
      publishedAt: updated.updatedAt,
    };
  }

  /**
   * Resolves the attribution display name for a batch of rows.
   *
   * Verified authorities (chefferies/experts/institutions) are attributed by
   * their public display_name; otherwise the content falls back to the author
   * account's full_name. Only display strings cross this boundary — never the
   * account id, phone number, or any other private field.
   */
  private async resolveDisplayNames(
    rows: CulturalContentRow[],
  ): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    if (rows.length === 0) {
      return result;
    }

    const authorityIds = [
      ...new Set(
        rows
          .map((row) => row.authorityId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const accountIds = [
      ...new Set(rows.map((row) => row.authorAccountId)),
    ];

    const [authorities, accounts] = await Promise.all([
      authorityIds.length > 0
        ? this.prisma.culturalAuthority.findMany({
            where: { id: { in: authorityIds }, deletedAt: null },
            select: { id: true, displayName: true },
          })
        : Promise.resolve([] as { id: string; displayName: string }[]),
      this.prisma.account.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, fullName: true },
      }),
    ]);

    const authorityNames = new Map(
      authorities.map((a) => [a.id, a.displayName]),
    );
    const accountNames = new Map(accounts.map((a) => [a.id, a.fullName]));

    for (const row of rows) {
      const authorityName = row.authorityId
        ? authorityNames.get(row.authorityId) ?? null
        : null;
      result.set(
        row.id,
        authorityName ?? accountNames.get(row.authorAccountId) ?? null,
      );
    }
    return result;
  }

  /** Projects a row to the public item shape — strips every non-public field. */
  private toPublicItem(
    row: CulturalContentRow,
    displayNames: Map<string, string | null>,
  ): PublicFeedItem {
    return {
      id: row.id,
      contentType: row.contentType,
      title: row.title,
      body: row.body,
      languageCode: row.languageCode,
      region: row.region,
      ethnicGroup: row.ethnicGroup,
      mediaId: row.mediaId,
      imageUrl: row.imageUrl,
      authorDisplayName: displayNames.get(row.id) ?? null,
      authorityVerified: row.isFromVerifiedAuthority,
      createdAt: row.createdAt,
    };
  }

  /**
   * Builds the keyset WHERE for "strictly after" the cursor under the ordering
   * (verified desc, created_at desc, id desc).
   *
   * Verified rows (true) all precede unverified rows (false), so the boolean is
   * the outermost comparison; (created_at, id) breaks ties within a verified
   * band.
   */
  private buildKeysetFilter(
    cursor: PublicKeysetCursor | null,
  ): Prisma.CulturalContentWhereInput | null {
    if (!cursor) {
      return null;
    }
    const cursorDate = new Date(cursor.createdAt);
    // The cursor timestamp is millisecond-truncated (it round-trips through a JS
    // Date / ISO string), while Postgres timestamptz keeps microseconds. A strict
    // `createdAt = cursorDate` therefore never matches rows whose sub-millisecond
    // part is non-zero — and when a whole batch is inserted with a single NOW()
    // (e.g. the discovery seed) ALL rows share that timestamp, so the second page
    // came back empty. Match the entire millisecond bucket
    // [cursorDate, cursorDate + 1ms) and tie-break by id instead.
    const cursorDateNext = new Date(cursorDate.getTime() + 1);
    const olderInSameBand: Prisma.CulturalContentWhereInput = {
      OR: [
        { createdAt: { lt: cursorDate } },
        {
          createdAt: { gte: cursorDate, lt: cursorDateNext },
          id: { lt: cursor.id },
        },
      ],
    };

    if (cursor.verified) {
      // After a verified row: remaining verified rows that are older, plus the
      // entire unverified band.
      return {
        OR: [
          { isFromVerifiedAuthority: false },
          { isFromVerifiedAuthority: true, ...olderInSameBand },
        ],
      };
    }
    // Already inside the unverified band: only older unverified rows remain.
    return { isFromVerifiedAuthority: false, ...olderInSameBand };
  }

  private clampLimit(limit?: number): number {
    if (limit === undefined || !Number.isFinite(limit)) {
      return DEFAULT_LIMIT;
    }
    return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)));
  }

  private encodeCursor(cursor: PublicKeysetCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(raw?: string): PublicKeysetCursor | null {
    if (!raw) {
      return null;
    }
    try {
      const decoded = JSON.parse(
        Buffer.from(raw, 'base64url').toString('utf8'),
      ) as Partial<PublicKeysetCursor>;
      if (
        typeof decoded.verified === 'boolean' &&
        typeof decoded.createdAt === 'string' &&
        typeof decoded.id === 'string' &&
        !Number.isNaN(Date.parse(decoded.createdAt))
      ) {
        return {
          verified: decoded.verified,
          createdAt: decoded.createdAt,
          id: decoded.id,
        };
      }
      return null;
    } catch {
      // Invalid/garbage cursor -> start from the beginning rather than 500.
      this.logger.debug('Ignoring malformed public feed cursor');
      return null;
    }
  }
}
