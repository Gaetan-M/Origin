import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, VisibilityScope } from '@prisma/client';
import type { LifeEventRecordedEvent } from '@origin/shared-types';
import { LifeEventHandler } from './life-event.handler';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventPublisher } from '../../../eventing/event-publisher';
import { NotificationsService } from '../../notifications/notifications.service';
import { FamilyFeedService } from '../family-feed.service';

/**
 * Builds a LifeEventRecordedEvent envelope for tests.
 */
function makeEvent(
  overrides: Partial<LifeEventRecordedEvent['payload']> = {},
): LifeEventRecordedEvent {
  return {
    type: 'life-event.recorded',
    version: 1,
    occurredAt: '2026-06-25T10:00:00.000Z',
    actorId: 'account-actor',
    correlationId: 'corr-1',
    payload: {
      lifeEventId: 'life-event-1',
      kind: 'birth',
      personIds: ['person-primary'],
      ...overrides,
    },
  };
}

describe('LifeEventHandler', () => {
  let handler: LifeEventHandler;
  let prisma: {
    feedPost: { findFirst: jest.Mock };
    lifeEvent: { findFirst: jest.Mock };
    parentChild: { findMany: jest.Mock };
    unionPartner: { findMany: jest.Mock };
    person: { findMany: jest.Mock };
  };
  let familyFeed: { createPost: jest.Mock };
  let notifications: { createNotification: jest.Mock };
  let publisher: { subscribe: jest.Mock; publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      feedPost: { findFirst: jest.fn() },
      lifeEvent: { findFirst: jest.fn() },
      parentChild: { findMany: jest.fn().mockResolvedValue([]) },
      unionPartner: { findMany: jest.fn().mockResolvedValue([]) },
      person: { findMany: jest.fn().mockResolvedValue([]) },
    };
    familyFeed = { createPost: jest.fn() };
    notifications = { createNotification: jest.fn().mockResolvedValue({}) };
    publisher = { subscribe: jest.fn(), publish: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LifeEventHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: EventPublisher, useValue: publisher },
        { provide: FamilyFeedService, useValue: familyFeed },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    handler = moduleRef.get(LifeEventHandler);
  });

  it('subscribes to life-event.recorded on init', () => {
    handler.onModuleInit();
    expect(publisher.subscribe).toHaveBeenCalledWith(
      'life-event.recorded',
      expect.any(Function),
    );
  });

  it('creates exactly one FeedPost when the same event is delivered twice (idempotent)', async () => {
    // First delivery: no existing post; second delivery: the post now exists.
    prisma.feedPost.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'feed-post-1' });

    prisma.lifeEvent.findFirst.mockResolvedValue({
      primaryPersonId: 'person-primary',
      visibilityScope: VisibilityScope.FAMILY,
      visibleMaxDegree: 2,
      createdByAccountId: 'account-actor',
    });
    familyFeed.createPost.mockResolvedValue({ id: 'feed-post-1' });

    const event = makeEvent();
    await handler.handleLifeEventRecorded(event);
    await handler.handleLifeEventRecorded(event);

    expect(familyFeed.createPost).toHaveBeenCalledTimes(1);
  });

  it('notifies claimed family accounts but never the actor', async () => {
    prisma.feedPost.findFirst.mockResolvedValue(null);
    prisma.lifeEvent.findFirst.mockResolvedValue({
      primaryPersonId: 'person-primary',
      visibilityScope: VisibilityScope.FAMILY,
      visibleMaxDegree: 1,
      createdByAccountId: 'account-actor',
    });
    familyFeed.createPost.mockResolvedValue({ id: 'feed-post-1' });
    // The primary person resolves to two claimed accounts: one is the actor.
    prisma.person.findMany.mockResolvedValue([
      { claimedByAccountId: 'account-actor' },
      { claimedByAccountId: 'account-relative' },
    ]);

    await handler.handleLifeEventRecorded(makeEvent());

    expect(notifications.createNotification).toHaveBeenCalledTimes(1);
    const call = notifications.createNotification.mock.calls[0][0];
    expect(call.accountId).toBe('account-relative');
    expect(call.notificationType).toBe(NotificationType.NEW_FAMILY_MEMBER);
    expect(call.relatedEntityId).toBe('feed-post-1');
  });

  it('does nothing when the life event no longer exists', async () => {
    prisma.feedPost.findFirst.mockResolvedValue(null);
    prisma.lifeEvent.findFirst.mockResolvedValue(null);

    await handler.handleLifeEventRecorded(makeEvent());

    expect(familyFeed.createPost).not.toHaveBeenCalled();
    expect(notifications.createNotification).not.toHaveBeenCalled();
  });
});
