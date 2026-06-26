import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccountRole, EngagementTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parseTargetType } from './dto/target-type.util';
import { ENGAGEMENT_REACTION_TYPES } from './dto/react.dto';
import { BatchSummaryDto } from './dto/batch-summary.dto';
import { SuggestEditDto } from './dto/suggest-edit.dto';
import { ModerationDecision } from './dto/moderate.dto';

const DEFAULT_COMMENT_LIMIT = 20;
const MAX_COMMENT_LIMIT = 50;

const PHOTO_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
type PhotoStatus = (typeof PHOTO_STATUSES)[number];

/** Minimal authenticated actor projection (from the JWT payload on request.user). */
export interface EngagementActor {
  id: string;
  role: AccountRole;
}

interface ReactionTotals {
  reactions: Record<string, number>;
  totalReactions: number;
  myReaction: string | null;
}

interface CommentCursor {
  createdAt: string;
  id: string;
}

/**
 * Engagement layer — polymorphic reactions / comments / contributed photos /
 * ratings / edit-suggestions over the PUBLIC discovery entities (tourism places
 * and cultural content).
 *
 * Every target is validated to exist (and be non-deleted) before any read or
 * write. Writes record a Contribution audit row. The service surfaces only
 * public author display names (full_name) — never phone numbers, account graph
 * data, or any private person field.
 */
@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Target resolution
  // ---------------------------------------------------------------------------

  /** Parse the path discriminator (400) and assert the target exists (404). */
  private async resolveTarget(
    rawType: string,
    targetId: string,
  ): Promise<EngagementTargetType> {
    const targetType = parseTargetType(rawType);
    await this.assertTargetExists(targetType, targetId);
    return targetType;
  }

  private async assertTargetExists(
    targetType: EngagementTargetType,
    targetId: string,
  ): Promise<void> {
    const exists =
      targetType === EngagementTargetType.TOURISM_PLACE
        ? await this.prisma.tourismPlace.findFirst({
            where: { id: targetId, deletedAt: null },
            select: { id: true },
          })
        : await this.prisma.culturalContent.findFirst({
            where: { id: targetId, deletedAt: null },
            select: { id: true },
          });
    if (!exists) {
      throw new NotFoundException('Target not found');
    }
  }

  // ---------------------------------------------------------------------------
  // Reactions
  // ---------------------------------------------------------------------------

  private async reactionTotals(
    targetType: EngagementTargetType,
    targetId: string,
    accountId?: string | null,
  ): Promise<ReactionTotals> {
    const grouped = await this.prisma.entityReaction.groupBy({
      by: ['reactionType'],
      where: { targetType, targetId },
      _count: true,
    });

    const reactions: Record<string, number> = {};
    for (const key of ENGAGEMENT_REACTION_TYPES) {
      reactions[key] = 0;
    }
    let totalReactions = 0;
    for (const row of grouped) {
      const count = row._count;
      totalReactions += count;
      if (row.reactionType in reactions) {
        reactions[row.reactionType] = count;
      }
    }

    let myReaction: string | null = null;
    if (accountId) {
      const mine = await this.prisma.entityReaction.findUnique({
        where: {
          targetType_targetId_accountId: { targetType, targetId, accountId },
        },
        select: { reactionType: true },
      });
      myReaction = mine?.reactionType ?? null;
    }

    return { reactions, totalReactions, myReaction };
  }

  async setReaction(
    rawType: string,
    targetId: string,
    accountId: string,
    type: string,
  ): Promise<ReactionTotals> {
    const targetType = await this.resolveTarget(rawType, targetId);

    const existing = await this.prisma.entityReaction.findUnique({
      where: {
        targetType_targetId_accountId: { targetType, targetId, accountId },
      },
      select: { id: true, reactionType: true },
    });

    const reaction = await this.prisma.entityReaction.upsert({
      where: {
        targetType_targetId_accountId: { targetType, targetId, accountId },
      },
      create: { targetType, targetId, accountId, reactionType: type },
      update: { reactionType: type },
    });

    await this.writeAudit(
      accountId,
      'engagement_reaction',
      reaction.id,
      existing ? 'UPDATE' : 'CREATE',
      { targetType, targetId, reactionType: type },
    );

    const totals = await this.reactionTotals(targetType, targetId, accountId);
    return totals;
  }

  async removeReaction(
    rawType: string,
    targetId: string,
    accountId: string,
  ): Promise<ReactionTotals> {
    const targetType = await this.resolveTarget(rawType, targetId);

    const existing = await this.prisma.entityReaction.findUnique({
      where: {
        targetType_targetId_accountId: { targetType, targetId, accountId },
      },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.entityReaction.delete({ where: { id: existing.id } });
      await this.writeAudit(
        accountId,
        'engagement_reaction',
        existing.id,
        'DELETE',
        { targetType, targetId },
      );
    }

    return this.reactionTotals(targetType, targetId, accountId);
  }

  // ---------------------------------------------------------------------------
  // Summary (single + batch)
  // ---------------------------------------------------------------------------

  async getSummary(
    rawType: string,
    targetId: string,
    accountId?: string | null,
  ): Promise<{
    reactions: Record<string, number>;
    totalReactions: number;
    myReaction: string | null;
    commentCount: number;
    photoCount: number;
    rating: { average: number; count: number; mine: number | null } | null;
  }> {
    const targetType = await this.resolveTarget(rawType, targetId);

    const [totals, commentCount, photoCount] = await Promise.all([
      this.reactionTotals(targetType, targetId, accountId),
      this.prisma.entityComment.count({
        where: { targetType, targetId, deletedAt: null },
      }),
      this.prisma.entityPhoto.count({
        where: { targetType, targetId, status: 'APPROVED' },
      }),
    ]);

    let rating: { average: number; count: number; mine: number | null } | null =
      null;
    if (targetType === EngagementTargetType.TOURISM_PLACE) {
      rating = await this.placeRatingSummary(targetId, accountId);
    }

    return {
      reactions: totals.reactions,
      totalReactions: totals.totalReactions,
      myReaction: totals.myReaction,
      commentCount,
      photoCount,
      rating,
    };
  }

  async batchSummary(
    dto: BatchSummaryDto,
  ): Promise<
    Record<
      string,
      {
        totalReactions: number;
        commentCount: number;
        photoCount: number;
        ratingAverage: number | null;
        ratingCount: number;
      }
    >
  > {
    const targetType = parseTargetType(dto.targetType);
    const ids = [...new Set(dto.ids)];

    const result: Record<
      string,
      {
        totalReactions: number;
        commentCount: number;
        photoCount: number;
        ratingAverage: number | null;
        ratingCount: number;
      }
    > = {};
    for (const id of ids) {
      result[id] = {
        totalReactions: 0,
        commentCount: 0,
        photoCount: 0,
        ratingAverage: null,
        ratingCount: 0,
      };
    }
    if (ids.length === 0) {
      return result;
    }

    const isTourism = targetType === EngagementTargetType.TOURISM_PLACE;

    const [reactions, comments, photos, ratings] = await Promise.all([
      this.prisma.entityReaction.groupBy({
        by: ['targetId'],
        where: { targetType, targetId: { in: ids } },
        _count: true,
      }),
      this.prisma.entityComment.groupBy({
        by: ['targetId'],
        where: { targetType, targetId: { in: ids }, deletedAt: null },
        _count: true,
      }),
      this.prisma.entityPhoto.groupBy({
        by: ['targetId'],
        where: { targetType, targetId: { in: ids }, status: 'APPROVED' },
        _count: true,
      }),
      isTourism
        ? this.prisma.placeRating.groupBy({
            by: ['placeId'],
            where: { placeId: { in: ids } },
            _avg: { stars: true },
            _count: true,
          })
        : Promise.resolve(
            [] as Array<{
              placeId: string;
              _avg: { stars: number | null };
              _count: number;
            }>,
          ),
    ]);

    for (const row of reactions) {
      if (result[row.targetId]) result[row.targetId].totalReactions = row._count;
    }
    for (const row of comments) {
      if (result[row.targetId]) result[row.targetId].commentCount = row._count;
    }
    for (const row of photos) {
      if (result[row.targetId]) result[row.targetId].photoCount = row._count;
    }
    for (const row of ratings) {
      const entry = result[row.placeId];
      if (entry) {
        entry.ratingAverage = this.roundAverage(row._avg.stars);
        entry.ratingCount = row._count;
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------

  async listComments(
    rawType: string,
    targetId: string,
    accountId: string | null | undefined,
    rawCursor?: string,
    rawLimit?: string | number,
  ): Promise<{
    items: Array<{
      id: string;
      body: string;
      authorDisplayName: string | null;
      accountId: string;
      createdAt: Date;
      mine: boolean;
    }>;
    nextCursor: string | null;
  }> {
    const targetType = await this.resolveTarget(rawType, targetId);
    const limit = this.clampLimit(rawLimit);
    const cursor = this.decodeCommentCursor(rawCursor);

    const where: Prisma.EntityCommentWhereInput = {
      targetType,
      targetId,
      deletedAt: null,
    };
    const keyset = this.buildCommentKeyset(cursor);
    const finalWhere = keyset ? { AND: [where, keyset] } : where;

    const rows = await this.prisma.entityComment.findMany({
      where: finalWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: { id: true, body: true, accountId: true, createdAt: true },
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const displayNames = await this.resolveDisplayNames(
      pageRows.map((r) => r.accountId),
    );

    const items = pageRows.map((r) => ({
      id: r.id,
      body: r.body,
      authorDisplayName: displayNames.get(r.accountId) ?? null,
      accountId: r.accountId,
      createdAt: r.createdAt,
      mine: !!accountId && r.accountId === accountId,
    }));

    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last
        ? this.encodeCommentCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          })
        : null;

    return { items, nextCursor };
  }

  async addComment(
    rawType: string,
    targetId: string,
    accountId: string,
    body: string,
  ): Promise<{
    id: string;
    body: string;
    authorDisplayName: string | null;
    accountId: string;
    createdAt: Date;
    mine: boolean;
  }> {
    const targetType = await this.resolveTarget(rawType, targetId);

    const comment = await this.prisma.entityComment.create({
      data: { targetType, targetId, accountId, body },
      select: { id: true, body: true, accountId: true, createdAt: true },
    });

    await this.writeAudit(
      accountId,
      'engagement_comment',
      comment.id,
      'CREATE',
      { targetType, targetId, body },
    );

    const displayNames = await this.resolveDisplayNames([accountId]);

    return {
      id: comment.id,
      body: comment.body,
      authorDisplayName: displayNames.get(accountId) ?? null,
      accountId: comment.accountId,
      createdAt: comment.createdAt,
      mine: true,
    };
  }

  /** Soft-delete a comment. Author OR moderator (rank >= MODERATOR) may delete. */
  async deleteComment(commentId: string, actor: EngagementActor): Promise<void> {
    const comment = await this.prisma.entityComment.findUnique({
      where: { id: commentId },
      select: { id: true, accountId: true, deletedAt: true },
    });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    const isModerator = this.isModerator(actor.role);
    if (comment.accountId !== actor.id && !isModerator) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.entityComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    await this.writeAudit(actor.id, 'engagement_comment', commentId, 'DELETE', {
      byModerator: comment.accountId !== actor.id,
    });
  }

  // ---------------------------------------------------------------------------
  // Photos
  // ---------------------------------------------------------------------------

  async listPhotos(
    rawType: string,
    targetId: string,
    accountId?: string | null,
  ): Promise<{
    items: Array<{
      id: string;
      url: string;
      caption: string | null;
      authorDisplayName: string | null;
      createdAt: Date;
    }>;
  }> {
    const targetType = await this.resolveTarget(rawType, targetId);

    const statusFilter: Prisma.EntityPhotoWhereInput = accountId
      ? {
          OR: [
            { status: 'APPROVED' },
            { status: 'PENDING', accountId },
          ],
        }
      : { status: 'APPROVED' };

    const rows = await this.prisma.entityPhoto.findMany({
      where: { targetType, targetId, ...statusFilter },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mediaId: true,
        caption: true,
        accountId: true,
        createdAt: true,
      },
    });

    const displayNames = await this.resolveDisplayNames(
      rows.map((r) => r.accountId),
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        url: `/media/${r.mediaId}/file`,
        caption: r.caption,
        authorDisplayName: displayNames.get(r.accountId) ?? null,
        createdAt: r.createdAt,
      })),
    };
  }

  async addPhoto(
    rawType: string,
    targetId: string,
    accountId: string,
    mediaId: string,
    caption?: string,
  ): Promise<{ id: string; status: 'PENDING' }> {
    const targetType = await this.resolveTarget(rawType, targetId);

    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
      select: { id: true },
    });
    if (!media) {
      throw new NotFoundException('Media not found');
    }

    const photo = await this.prisma.entityPhoto.create({
      data: {
        targetType,
        targetId,
        accountId,
        mediaId,
        caption: caption ?? null,
        status: 'PENDING',
      },
      select: { id: true },
    });

    await this.writeAudit(accountId, 'engagement_photo', photo.id, 'CREATE', {
      targetType,
      targetId,
      mediaId,
    });

    return { id: photo.id, status: 'PENDING' };
  }

  // ---------------------------------------------------------------------------
  // Ratings (tourism-place only)
  // ---------------------------------------------------------------------------

  private async placeRatingSummary(
    placeId: string,
    accountId?: string | null,
  ): Promise<{ average: number; count: number; mine: number | null }> {
    const agg = await this.prisma.placeRating.aggregate({
      where: { placeId },
      _avg: { stars: true },
      _count: true,
    });

    let mine: number | null = null;
    if (accountId) {
      const mineRow = await this.prisma.placeRating.findUnique({
        where: { placeId_accountId: { placeId, accountId } },
        select: { stars: true },
      });
      mine = mineRow?.stars ?? null;
    }

    return {
      average: this.roundAverage(agg._avg.stars) ?? 0,
      count: agg._count,
      mine,
    };
  }

  async ratePlace(
    rawType: string,
    targetId: string,
    accountId: string,
    stars: number,
  ): Promise<{ average: number; count: number; mine: number }> {
    const targetType = parseTargetType(rawType);
    if (targetType !== EngagementTargetType.TOURISM_PLACE) {
      throw new BadRequestException('Ratings are only available for tourism places');
    }
    await this.assertTargetExists(targetType, targetId);

    const existing = await this.prisma.placeRating.findUnique({
      where: { placeId_accountId: { placeId: targetId, accountId } },
      select: { id: true },
    });

    const rating = await this.prisma.placeRating.upsert({
      where: { placeId_accountId: { placeId: targetId, accountId } },
      create: { placeId: targetId, accountId, stars },
      update: { stars },
    });

    await this.writeAudit(
      accountId,
      'place_rating',
      rating.id,
      existing ? 'UPDATE' : 'CREATE',
      { placeId: targetId, stars },
    );

    const summary = await this.placeRatingSummary(targetId, accountId);
    return { average: summary.average, count: summary.count, mine: stars };
  }

  // ---------------------------------------------------------------------------
  // Edit suggestions
  // ---------------------------------------------------------------------------

  async suggestEdit(
    rawType: string,
    targetId: string,
    accountId: string,
    dto: SuggestEditDto,
  ): Promise<{ id: string; status: 'PENDING' }> {
    const targetType = await this.resolveTarget(rawType, targetId);

    const suggestion = await this.prisma.editSuggestion.create({
      data: {
        targetType,
        targetId,
        accountId,
        field: dto.field,
        proposedValue: dto.proposedValue,
        note: dto.note ?? null,
        status: 'PENDING',
      },
      select: { id: true },
    });

    await this.writeAudit(
      accountId,
      'edit_suggestion',
      suggestion.id,
      'CREATE',
      { targetType, targetId, field: dto.field },
    );

    return { id: suggestion.id, status: 'PENDING' };
  }

  // ---------------------------------------------------------------------------
  // Moderation
  // ---------------------------------------------------------------------------

  async listPhotosForModeration(rawStatus?: string): Promise<{
    items: Array<{
      id: string;
      targetType: EngagementTargetType;
      targetId: string;
      url: string;
      caption: string | null;
      authorDisplayName: string | null;
      status: string;
      createdAt: Date;
    }>;
  }> {
    const status = this.parsePhotoStatus(rawStatus);

    const rows = await this.prisma.entityPhoto.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        mediaId: true,
        caption: true,
        accountId: true,
        status: true,
        createdAt: true,
      },
    });

    const displayNames = await this.resolveDisplayNames(
      rows.map((r) => r.accountId),
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        url: `/media/${r.mediaId}/file`,
        caption: r.caption,
        authorDisplayName: displayNames.get(r.accountId) ?? null,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  async moderatePhoto(
    photoId: string,
    actor: EngagementActor,
    decision: ModerationDecision,
  ): Promise<{ id: string; status: string }> {
    const photo = await this.prisma.entityPhoto.findUnique({
      where: { id: photoId },
      select: { id: true },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.entityPhoto.update({
      where: { id: photoId },
      data: {
        status,
        reviewedByAccountId: actor.id,
        reviewedAt: new Date(),
      },
      select: { id: true, status: true },
    });

    await this.writeAudit(actor.id, 'engagement_photo', photoId, 'UPDATE', {
      decision,
      status,
    });

    return updated;
  }

  async listSuggestionsForModeration(rawStatus?: string): Promise<{
    items: Array<{
      id: string;
      targetType: EngagementTargetType;
      targetId: string;
      field: string;
      proposedValue: string;
      note: string | null;
      authorDisplayName: string | null;
      status: string;
      createdAt: Date;
    }>;
  }> {
    const status = this.parseGenericStatus(rawStatus);

    const rows = await this.prisma.editSuggestion.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        field: true,
        proposedValue: true,
        note: true,
        accountId: true,
        status: true,
        createdAt: true,
      },
    });

    const displayNames = await this.resolveDisplayNames(
      rows.map((r) => r.accountId),
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        field: r.field,
        proposedValue: r.proposedValue,
        note: r.note,
        authorDisplayName: displayNames.get(r.accountId) ?? null,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  async moderateSuggestion(
    suggestionId: string,
    actor: EngagementActor,
    decision: ModerationDecision,
  ): Promise<{ id: string; status: string }> {
    const suggestion = await this.prisma.editSuggestion.findUnique({
      where: { id: suggestionId },
      select: { id: true },
    });
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    // Record the decision only — never auto-apply the proposed edit.
    const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.editSuggestion.update({
      where: { id: suggestionId },
      data: {
        status,
        reviewedByAccountId: actor.id,
        reviewedAt: new Date(),
      },
      select: { id: true, status: true },
    });

    await this.writeAudit(actor.id, 'edit_suggestion', suggestionId, 'UPDATE', {
      decision,
      status,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private isModerator(role: AccountRole): boolean {
    return (
      role === AccountRole.MODERATOR ||
      role === AccountRole.ADMIN ||
      role === AccountRole.SUPER_ADMIN
    );
  }

  /** Round to one decimal place, or null when there are no values. */
  private roundAverage(value: number | null): number | null {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null;
    }
    return Math.round(value * 10) / 10;
  }

  private clampLimit(raw?: string | number): number {
    const n =
      typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
    if (n === undefined || n === null || !Number.isFinite(n)) {
      return DEFAULT_COMMENT_LIMIT;
    }
    return Math.min(MAX_COMMENT_LIMIT, Math.max(1, Math.trunc(n)));
  }

  private parsePhotoStatus(raw?: string): PhotoStatus {
    if (!raw) return 'PENDING';
    const upper = raw.toUpperCase();
    if ((PHOTO_STATUSES as readonly string[]).includes(upper)) {
      return upper as PhotoStatus;
    }
    throw new BadRequestException(
      `Unknown status "${raw}". Expected one of: ${PHOTO_STATUSES.join(', ')}`,
    );
  }

  private parseGenericStatus(raw?: string): string {
    if (!raw) return 'PENDING';
    const upper = raw.toUpperCase();
    if ((PHOTO_STATUSES as readonly string[]).includes(upper)) {
      return upper;
    }
    throw new BadRequestException(
      `Unknown status "${raw}". Expected one of: ${PHOTO_STATUSES.join(', ')}`,
    );
  }

  /**
   * Resolve public author display names (account full_name) for a batch of
   * account ids. Only display strings cross this boundary — never phone numbers
   * or any other private field.
   */
  private async resolveDisplayNames(
    accountIds: string[],
  ): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    const unique = [...new Set(accountIds)];
    if (unique.length === 0) {
      return result;
    }
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: unique } },
      select: { id: true, fullName: true },
    });
    for (const a of accounts) {
      result.set(a.id, a.fullName ?? null);
    }
    return result;
  }

  private async writeAudit(
    accountId: string,
    entityType: string,
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    value: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType,
        entityId,
        action,
        newValue:
          action === 'DELETE'
            ? undefined
            : (value as unknown as Prisma.InputJsonValue),
        oldValue:
          action === 'DELETE'
            ? (value as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }

  private encodeCommentCursor(cursor: CommentCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCommentCursor(raw?: string): CommentCursor | null {
    if (!raw) return null;
    try {
      const decoded = JSON.parse(
        Buffer.from(raw, 'base64url').toString('utf8'),
      ) as Partial<CommentCursor>;
      if (
        typeof decoded.createdAt === 'string' &&
        typeof decoded.id === 'string' &&
        !Number.isNaN(Date.parse(decoded.createdAt))
      ) {
        return { createdAt: decoded.createdAt, id: decoded.id };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Keyset "strictly older than the cursor" under (created_at desc, id desc).
   * Uses a millisecond bucket because the cursor timestamp is ms-truncated while
   * Postgres timestamptz keeps microseconds.
   */
  private buildCommentKeyset(
    cursor: CommentCursor | null,
  ): Prisma.EntityCommentWhereInput | null {
    if (!cursor) return null;
    const cursorDate = new Date(cursor.createdAt);
    const cursorNext = new Date(cursorDate.getTime() + 1);
    return {
      OR: [
        { createdAt: { lt: cursorDate } },
        {
          createdAt: { gte: cursorDate, lt: cursorNext },
          id: { lt: cursor.id },
        },
      ],
    };
  }
}
