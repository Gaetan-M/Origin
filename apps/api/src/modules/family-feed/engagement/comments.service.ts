import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FamilyFeedService } from '../family-feed.service';

/**
 * S-021 — Comments on family-feed posts.
 *
 * Access to a post's comments (read or write) is gated by
 * {@link FamilyFeedService.assertCanAccessPost}. Comments are soft-deleted and
 * every mutation writes a Contribution audit row. Only the comment's author may
 * delete it.
 */
@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly familyFeed: FamilyFeedService,
  ) {}

  /** List the non-deleted comments on a post the requester can access. */
  async list(feedPostId: string, accountId: string) {
    await this.familyFeed.assertCanAccessPost(feedPostId, accountId);

    return this.prisma.feedComment.findMany({
      where: { feedPostId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Add a comment to a post the requester can access. */
  async add(feedPostId: string, accountId: string, body: string) {
    await this.familyFeed.assertCanAccessPost(feedPostId, accountId);

    const comment = await this.prisma.feedComment.create({
      data: { feedPostId, accountId, body },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'feed_comment',
        entityId: comment.id,
        action: 'CREATE',
        newValue: {
          feedPostId,
          body,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return comment;
  }

  /**
   * Soft-delete a comment. Only the original author may remove it. Idempotent
   * for an already-deleted comment owned by the requester.
   */
  async remove(
    commentId: string,
    accountId: string,
  ): Promise<{ message: string }> {
    const comment = await this.prisma.feedComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.accountId !== accountId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.feedComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'feed_comment',
        entityId: commentId,
        action: 'DELETE',
        oldValue: {
          feedPostId: comment.feedPostId,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { message: 'Comment deleted' };
  }
}
