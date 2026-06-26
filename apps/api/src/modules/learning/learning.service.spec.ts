import { Test, TestingModule } from '@nestjs/testing';
import {
  LearningLevel,
  ModerationStatus,
  VisibilityScope,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { LearningService } from './learning.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { CreateLessonDto } from './dto/create-lesson.dto';

const ACCOUNT_ID = 'account-author';

function makeDto(overrides: Partial<CreateLessonDto> = {}): CreateLessonDto {
  return {
    title: overrides.title ?? 'Les salutations en bassa',
    description: overrides.description,
    content: overrides.content,
    languageCode: overrides.languageCode ?? 'bas',
    level: overrides.level,
    ethnicGroup: overrides.ethnicGroup,
    authorityId: overrides.authorityId,
    mediaId: overrides.mediaId,
    isTicketed: overrides.isTicketed,
    liveSessionId: overrides.liveSessionId,
    position: overrides.position,
  };
}

describe('LearningService', () => {
  let service: LearningService;

  const tx = {
    learningLesson: { create: jest.fn() },
    lessonEnrollment: { upsert: jest.fn(), update: jest.fn() },
    contribution: { create: jest.fn() },
  };

  const mockPrisma = {
    culturalAuthority: { findFirst: jest.fn() },
    learningLesson: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    lessonEnrollment: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    contribution: { create: jest.fn() },
    $transaction: jest.fn(
      async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
    ),
  };

  const mockEventPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tx.learningLesson.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'lesson-1',
        ...data,
      }),
    );
    tx.lessonEnrollment.upsert.mockImplementation(
      async ({ create }: { create: Record<string, unknown> }) => ({
        id: 'enrollment-1',
        progressPercent: 0,
        completedAt: null,
        ...create,
      }),
    );
    tx.lessonEnrollment.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'enrollment-1',
        lessonId: 'lesson-1',
        accountId: ACCOUNT_ID,
        ...data,
      }),
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LearningService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = moduleRef.get(LearningService);
  });

  describe('createLesson', () => {
    it('auto-approves a lesson from a VERIFIED authority and links it', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue({
        id: 'authority-1',
        accountId: ACCOUNT_ID,
        verified: true,
      });

      const result = await service.createLesson(ACCOUNT_ID, makeDto());

      const created = tx.learningLesson.create.mock.calls[0][0].data;
      expect(created.moderationStatus).toBe(ModerationStatus.APPROVED);
      expect(created.visibilityScope).toBe(VisibilityScope.PUBLIC);
      expect(created.authorityId).toBe('authority-1');
      expect(created.level).toBe(LearningLevel.BEGINNER);
      expect(result.moderationStatus).toBe(ModerationStatus.APPROVED);
    });

    it('leaves a lesson from a normal author PENDING', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue(null);

      const result = await service.createLesson(ACCOUNT_ID, makeDto());

      const created = tx.learningLesson.create.mock.calls[0][0].data;
      expect(created.moderationStatus).toBe(ModerationStatus.PENDING);
      expect(created.visibilityScope).toBe(VisibilityScope.PUBLIC);
      expect(result.moderationStatus).toBe(ModerationStatus.PENDING);
    });

    it('writes a Contribution audit row and publishes an event', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue(null);

      await service.createLesson(ACCOUNT_ID, makeDto());

      expect(tx.contribution.create).toHaveBeenCalledTimes(1);
      const audit = tx.contribution.create.mock.calls[0][0].data;
      expect(audit.accountId).toBe(ACCOUNT_ID);
      expect(audit.entityType).toBe('learning_lesson');
      expect(audit.entityId).toBe('lesson-1');
      expect(audit.action).toBe('CREATE');

      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
      const event = mockEventPublisher.publish.mock.calls[0][0];
      expect(event.type).toBe('learning.lesson.published');
      expect(event.payload).toMatchObject({
        learningLessonId: 'lesson-1',
        authorAccountId: ACCOUNT_ID,
        moderationStatus: ModerationStatus.PENDING,
      });
    });

    it('rejects publishing under an authority the account does not own', async () => {
      mockPrisma.culturalAuthority.findFirst.mockResolvedValue(null);

      await expect(
        service.createLesson(ACCOUNT_ID, makeDto({ authorityId: 'other-authority' })),
      ).rejects.toThrow();
      expect(tx.learningLesson.create).not.toHaveBeenCalled();
    });
  });

  describe('enroll', () => {
    it('upserts an enrollment for an APPROVED public lesson and audits it', async () => {
      mockPrisma.learningLesson.findFirst.mockResolvedValue({ id: 'lesson-1' });

      const result = await service.enroll('lesson-1', ACCOUNT_ID);

      expect(tx.lessonEnrollment.upsert).toHaveBeenCalledTimes(1);
      const args = tx.lessonEnrollment.upsert.mock.calls[0][0];
      expect(args.where).toEqual({
        lessonId_accountId: { lessonId: 'lesson-1', accountId: ACCOUNT_ID },
      });
      // Re-enrolling must not reset progress.
      expect(args.update).toEqual({});
      expect(result.id).toBe('enrollment-1');
      expect(tx.contribution.create.mock.calls[0][0].data.entityType).toBe(
        'lesson_enrollment',
      );
    });

    it('rejects enrollment when the lesson is not publicly available', async () => {
      mockPrisma.learningLesson.findFirst.mockResolvedValue(null);

      await expect(service.enroll('lesson-1', ACCOUNT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.lessonEnrollment.upsert).not.toHaveBeenCalled();
    });
  });

  describe('updateProgress', () => {
    it('sets completedAt when reaching 100%', async () => {
      mockPrisma.lessonEnrollment.findUnique.mockResolvedValue({ id: 'enrollment-1' });

      const result = await service.updateProgress('lesson-1', ACCOUNT_ID, 100);

      const data = tx.lessonEnrollment.update.mock.calls[0][0].data;
      expect(data.progressPercent).toBe(100);
      expect(data.completedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('leaves completedAt null below 100%', async () => {
      mockPrisma.lessonEnrollment.findUnique.mockResolvedValue({ id: 'enrollment-1' });

      await service.updateProgress('lesson-1', ACCOUNT_ID, 40);

      const data = tx.lessonEnrollment.update.mock.calls[0][0].data;
      expect(data.progressPercent).toBe(40);
      expect(data.completedAt).toBeNull();
    });

    it('throws when no enrollment exists', async () => {
      mockPrisma.lessonEnrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProgress('lesson-1', ACCOUNT_ID, 50),
      ).rejects.toThrow(NotFoundException);
      expect(tx.lessonEnrollment.update).not.toHaveBeenCalled();
    });
  });

  describe('listLessons', () => {
    it('queries only APPROVED + PUBLIC lessons ordered by position then recency', async () => {
      mockPrisma.learningLesson.findMany.mockResolvedValue([]);

      await service.listLessons({ languageCode: 'bas', level: LearningLevel.BEGINNER });

      const args = mockPrisma.learningLesson.findMany.mock.calls[0][0];
      expect(args.where).toMatchObject({
        deletedAt: null,
        moderationStatus: ModerationStatus.APPROVED,
        visibilityScope: VisibilityScope.PUBLIC,
        languageCode: 'bas',
        level: LearningLevel.BEGINNER,
      });
      expect(args.orderBy).toEqual([{ position: 'asc' }, { createdAt: 'desc' }]);
    });
  });
});
