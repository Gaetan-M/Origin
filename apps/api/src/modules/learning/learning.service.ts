import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  LearningLevel,
  ModerationStatus,
  VisibilityScope,
  type LearningLesson,
  type LessonEnrollment,
} from '@prisma/client';
import type { DomainEvent } from '@origin/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { CreateLessonDto } from './dto/create-lesson.dto';

const LEARNING_LESSON_PUBLISHED_VERSION = 1;
const COMPLETE_PERCENT = 100;

/**
 * Filter for the public lesson catalogue.
 */
export interface ListLessonsFilter {
  languageCode?: string;
  level?: LearningLevel;
}

/**
 * Inline typed payload for the lesson-publication event.
 *
 * Public by construction: it carries ONLY the lesson's own identity and
 * moderation state plus the authoring account — never any family-graph edge,
 * relationship, degree, phone number, or private person data.
 */
export interface LearningLessonPublishedPayload {
  learningLessonId: string;
  title: string;
  languageCode: string | null;
  level: LearningLevel;
  ethnicGroup: string | null;
  isTicketed: boolean;
  moderationStatus: ModerationStatus;
  isFromVerifiedAuthority: boolean;
  authorAccountId: string;
  authorityId: string | null;
}

export type LearningLessonPublishedEvent = DomainEvent<
  'learning.lesson.published',
  LearningLessonPublishedPayload
>;

/**
 * Structured language/culture mini-lessons + learner enrollment & progress.
 *
 * Part of the PUBLIC learning world. A lesson is authored content, optionally
 * attributed to a verified CulturalAuthority. Lessons from a VERIFIED authority
 * are auto-approved (mirroring cultural-content); everything else enters the
 * moderation queue as PENDING. No endpoint here ever references family-graph
 * data — the learning world is fully isolated from the private family graph.
 *
 * Every mutation writes a Contribution audit row and uses soft-delete
 * semantics. A `learning.lesson.published` domain event is emitted on publish.
 */
@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Author a new PUBLIC mini-lesson.
   *
   * Auto-approves when the author owns a VERIFIED CulturalAuthority; otherwise
   * the lesson is PENDING moderation. Writes an audit Contribution and publishes
   * a `learning.lesson.published` event.
   */
  async createLesson(
    authorAccountId: string,
    dto: CreateLessonDto,
  ): Promise<LearningLesson> {
    const verifiedAuthority = await this.prisma.culturalAuthority.findFirst({
      where: { accountId: authorAccountId, verified: true, deletedAt: null },
    });

    // If the author pins the lesson to an explicit authority, that authority
    // must belong to them — a lesson cannot be published under someone else's
    // identity.
    if (dto.authorityId) {
      const owned = await this.prisma.culturalAuthority.findFirst({
        where: { id: dto.authorityId, accountId: authorAccountId, deletedAt: null },
        select: { id: true },
      });
      if (!owned) {
        throw new ForbiddenException(
          'You cannot publish under an authority you do not own / Vous ne pouvez pas publier sous une autorité qui ne vous appartient pas',
        );
      }
    }

    const isFromVerifiedAuthority = verifiedAuthority !== null;
    const moderationStatus = isFromVerifiedAuthority
      ? ModerationStatus.APPROVED
      : ModerationStatus.PENDING;

    const lesson = await this.prisma.$transaction(async (tx) => {
      const created = await tx.learningLesson.create({
        data: {
          authorAccountId,
          authorityId: dto.authorityId ?? verifiedAuthority?.id ?? null,
          title: dto.title,
          description: dto.description ?? null,
          content: dto.content ?? null,
          languageCode: dto.languageCode ?? null,
          level: dto.level ?? LearningLevel.BEGINNER,
          ethnicGroup: dto.ethnicGroup ?? null,
          mediaId: dto.mediaId ?? null,
          isTicketed: dto.isTicketed ?? false,
          liveSessionId: dto.liveSessionId ?? null,
          position: dto.position ?? 0,
          visibilityScope: VisibilityScope.PUBLIC,
          moderationStatus,
        },
      });

      await this.writeContribution(tx, authorAccountId, created.id, 'CREATE', {
        title: created.title,
        languageCode: created.languageCode,
        level: created.level,
        moderationStatus,
      });

      return created;
    });

    await this.publishLessonPublished(lesson, isFromVerifiedAuthority);

    return lesson;
  }

  /**
   * List APPROVED + PUBLIC lessons for the public catalogue, optionally filtered
   * by taught language and/or level. Ordered by curriculum position then recency.
   */
  async listLessons(filter: ListLessonsFilter = {}): Promise<LearningLesson[]> {
    return this.prisma.learningLesson.findMany({
      where: {
        deletedAt: null,
        moderationStatus: ModerationStatus.APPROVED,
        visibilityScope: VisibilityScope.PUBLIC,
        ...(filter.languageCode ? { languageCode: filter.languageCode } : {}),
        ...(filter.level ? { level: filter.level } : {}),
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Fetch a single lesson. APPROVED + PUBLIC lessons are visible to everyone;
   * the author may additionally read their own not-yet-approved lessons.
   */
  async getLesson(
    id: string,
    requesterAccountId: string,
  ): Promise<LearningLesson> {
    const lesson = await this.prisma.learningLesson.findFirst({
      where: { id, deletedAt: null },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found / Leçon introuvable');
    }

    const isPubliclyVisible =
      lesson.moderationStatus === ModerationStatus.APPROVED &&
      lesson.visibilityScope === VisibilityScope.PUBLIC;
    const isAuthor = lesson.authorAccountId === requesterAccountId;
    if (!isPubliclyVisible && !isAuthor) {
      throw new NotFoundException('Lesson not found / Leçon introuvable');
    }

    return lesson;
  }

  /**
   * Enroll the calling account into a lesson (idempotent upsert).
   *
   * The lesson must be publicly available (APPROVED + PUBLIC). Re-enrolling is a
   * no-op that preserves any existing progress.
   */
  async enroll(
    lessonId: string,
    accountId: string,
  ): Promise<LessonEnrollment> {
    await this.assertEnrollableLesson(lessonId);

    const enrollment = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.lessonEnrollment.upsert({
        where: { lessonId_accountId: { lessonId, accountId } },
        // Re-enrolling must not reset existing progress.
        update: {},
        create: { lessonId, accountId, progressPercent: 0 },
      });

      await this.writeEnrollmentContribution(tx, accountId, upserted.id, 'ENROLL', {
        lessonId,
        progressPercent: upserted.progressPercent,
      });

      return upserted;
    });

    return enrollment;
  }

  /**
   * Update an enrolled learner's progress. Reaching 100% stamps `completed_at`;
   * dropping back below 100% clears it. Requires an existing enrollment.
   */
  async updateProgress(
    lessonId: string,
    accountId: string,
    percent: number,
  ): Promise<LessonEnrollment> {
    const existing = await this.prisma.lessonEnrollment.findUnique({
      where: { lessonId_accountId: { lessonId, accountId } },
    });
    if (!existing) {
      throw new NotFoundException(
        'You are not enrolled in this lesson / Vous n’êtes pas inscrit à cette leçon',
      );
    }

    const completedAt = percent >= COMPLETE_PERCENT ? new Date() : null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lessonEnrollment.update({
        where: { lessonId_accountId: { lessonId, accountId } },
        data: { progressPercent: percent, completedAt },
      });

      await this.writeEnrollmentContribution(
        tx,
        accountId,
        updated.id,
        'UPDATE_PROGRESS',
        { lessonId, progressPercent: percent, completed: completedAt !== null },
      );

      return updated;
    });
  }

  // --- internals -----------------------------------------------------------

  private async assertEnrollableLesson(lessonId: string): Promise<void> {
    const lesson = await this.prisma.learningLesson.findFirst({
      where: {
        id: lessonId,
        deletedAt: null,
        moderationStatus: ModerationStatus.APPROVED,
        visibilityScope: VisibilityScope.PUBLIC,
      },
      select: { id: true },
    });
    if (!lesson) {
      throw new NotFoundException(
        'Lesson not available for enrollment / Leçon indisponible à l’inscription',
      );
    }
  }

  private async publishLessonPublished(
    lesson: LearningLesson,
    isFromVerifiedAuthority: boolean,
  ): Promise<void> {
    const event: LearningLessonPublishedEvent = {
      type: 'learning.lesson.published',
      version: LEARNING_LESSON_PUBLISHED_VERSION,
      occurredAt: new Date().toISOString(),
      actorId: lesson.authorAccountId,
      correlationId: randomUUID(),
      payload: {
        learningLessonId: lesson.id,
        title: lesson.title,
        languageCode: lesson.languageCode,
        level: lesson.level,
        ethnicGroup: lesson.ethnicGroup,
        isTicketed: lesson.isTicketed,
        moderationStatus: lesson.moderationStatus,
        isFromVerifiedAuthority,
        authorAccountId: lesson.authorAccountId,
        authorityId: lesson.authorityId,
      },
    };

    try {
      await this.eventPublisher.publish(event);
    } catch (err) {
      // The lesson already committed; a publish failure must not surface as a
      // request error. The eventing layer owns retry/outbox semantics.
      this.logger.error(
        `Failed to publish learning.lesson.published for ${lesson.id}: ${
          (err as Error).message
        }`,
      );
    }
  }

  private async writeContribution(
    tx: Prisma.TransactionClient,
    accountId: string,
    entityId: string,
    action: string,
    newValue: Prisma.InputJsonValue,
  ): Promise<void> {
    await tx.contribution.create({
      data: {
        accountId,
        entityType: 'learning_lesson',
        entityId,
        action,
        newValue,
      },
    });
  }

  private async writeEnrollmentContribution(
    tx: Prisma.TransactionClient,
    accountId: string,
    entityId: string,
    action: string,
    newValue: Prisma.InputJsonValue,
  ): Promise<void> {
    await tx.contribution.create({
      data: {
        accountId,
        entityType: 'lesson_enrollment',
        entityId,
        action,
        newValue,
      },
    });
  }
}
