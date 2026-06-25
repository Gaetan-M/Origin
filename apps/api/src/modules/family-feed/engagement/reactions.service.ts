import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FamilyFeedService } from '../family-feed.service';
import { ReactionType } from './dto/react.dto';

/**
 * S-021 — Reactions on family-feed posts.
 *
 * Every mutation is gated by {@link FamilyFeedService.assertCanAccessPost} (the
 * requester must be able to see the post under the visibility model) and writes
 * a Contribution audit row. Reactions are soft-deleted, never physically
 * removed, so the @@unique([feed_post_id, account_id, reaction_type]) is honored
 * by reactivating a previously-removed row rather than inserting a duplicate.
 */
@Injectable()
export class ReactionsService {
  private readonly logger = new Logger(ReactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly familyFeed: FamilyFeedService,
  ) {}

  /**
   * Add (or re-activate) the requester's reaction of the given type to a post.
   * Idempotent: reacting twice with the same type is a no-op returning the
   * existing reaction.
   */
  async react(
    feedPostId: string,
    accountId: string,
    reactionType: ReactionType,
  ) {
    await this.familyFeed.assertCanAccessPost(feedPostId, accountId);

    const existing = await this.prisma.feedReaction.findUnique({
      where: {
        feedPostId_accountId_reactionType: {
          feedPostId,
          accountId,
          reactionType,
        },
      },
    });

    if (existing && !existing.deletedAt) {
      return existing;
    }

    const reaction = existing
      ? await this.prisma.feedReaction.update({
          where: { id: existing.id },
          data: { deletedAt: null },
        })
      : await this.prisma.feedReaction.create({
          data: { feedPostId, accountId, reactionType },
        });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'feed_reaction',
        entityId: reaction.id,
        action: 'CREATE',
        newValue: {
          feedPostId,
          reactionType,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return reaction;
  }

  /**
   * Soft-delete the requester's reaction of the given type. Idempotent: removing
   * a reaction that is absent (or already removed) returns `{ removed: false }`.
   */
  async unreact(
    feedPostId: string,
    accountId: string,
    reactionType: ReactionType,
  ): Promise<{ removed: boolean }> {
    await this.familyFeed.assertCanAccessPost(feedPostId, accountId);

    const existing = await this.prisma.feedReaction.findUnique({
      where: {
        feedPostId_accountId_reactionType: {
          feedPostId,
          accountId,
          reactionType,
        },
      },
    });

    if (!existing || existing.deletedAt) {
      return { removed: false };
    }

    await this.prisma.feedReaction.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'feed_reaction',
        entityId: existing.id,
        action: 'DELETE',
        oldValue: {
          feedPostId,
          reactionType,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { removed: true };
  }
}
