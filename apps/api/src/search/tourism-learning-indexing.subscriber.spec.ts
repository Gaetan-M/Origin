import { Test, TestingModule } from '@nestjs/testing';
import { VisibilityScope } from '@origin/shared-types';
import { EventPublisher } from '../eventing/event-publisher';
import { InMemorySearchIndexer } from './in-memory-search-indexer';
import { SEARCH_INDEXER, SearchIndexer } from './search-indexer.interface';
import {
  LEARNING_INDEX,
  LearningLessonPublishedEvent,
  TOURISM_INDEX,
  TourismLearningIndexingSubscriber,
  TourismPlaceVerifiedEvent,
} from './tourism-learning-indexing.subscriber';

describe('TourismLearningIndexingSubscriber', () => {
  let module: TestingModule;
  let subscriber: TourismLearningIndexingSubscriber;
  let indexer: InMemorySearchIndexer;
  let subscribe: jest.Mock;

  beforeEach(async () => {
    // Fake event bus: capture subscriptions so onModuleInit wiring is exercised,
    // while tests still call the handlers directly.
    subscribe = jest.fn();
    const eventPublisher: Pick<EventPublisher, 'publish' | 'subscribe'> = {
      publish: jest.fn(),
      subscribe,
    };

    module = await Test.createTestingModule({
      providers: [
        { provide: SEARCH_INDEXER, useClass: InMemorySearchIndexer },
        { provide: EventPublisher, useValue: eventPublisher },
        TourismLearningIndexingSubscriber,
      ],
    }).compile();

    subscriber = module.get(TourismLearningIndexingSubscriber);
    indexer = module.get<SearchIndexer>(SEARCH_INDEXER) as InMemorySearchIndexer;
  });

  function buildTourismEvent(
    overrides: Partial<TourismPlaceVerifiedEvent['payload']> = {},
  ): TourismPlaceVerifiedEvent {
    return {
      type: 'tourism-place.verified',
      version: 1,
      occurredAt: '2026-06-26T10:00:00.000Z',
      actorId: 'account-mod',
      correlationId: 'corr-t-1',
      payload: {
        tourismPlaceId: 'tp-1',
        name: 'Chefferie de Bandjoun',
        description: 'Un site patrimonial majeur.',
        region: 'Ouest',
        category: 'CHEFFERIE',
        latitude: '5.366000',
        longitude: '10.416000',
        source: 'MINISTRY',
        sourceRef: 'https://mintour.gov.cm/sites/bandjoun',
        verified: true,
        mediaId: 'media-1',
        ...overrides,
      },
    };
  }

  function buildLearningEvent(
    overrides: Partial<LearningLessonPublishedEvent['payload']> = {},
  ): LearningLessonPublishedEvent {
    return {
      type: 'learning-lesson.published',
      version: 1,
      occurredAt: '2026-06-26T11:00:00.000Z',
      actorId: 'account-1',
      correlationId: 'corr-l-1',
      payload: {
        learningLessonId: 'll-1',
        title: 'Saluer en Ghomala',
        description: 'Leçon 1 : les salutations.',
        content: 'Bonjour se dit ...',
        languageCode: 'bbj',
        level: 'BEGINNER',
        ethnicGroup: 'Bamileke',
        moderationStatus: 'APPROVED',
        isFromVerifiedAuthority: true,
        authorAccountId: 'account-1',
        authorityId: 'authority-1',
        isTicketed: false,
        ...overrides,
      },
    };
  }

  describe('module init wiring', () => {
    it('subscribes to both domain events on module init', () => {
      subscriber.onModuleInit();

      expect(subscribe).toHaveBeenCalledTimes(2);
      expect(subscribe).toHaveBeenCalledWith(
        'tourism-place.verified',
        expect.any(Function),
      );
      expect(subscribe).toHaveBeenCalledWith(
        'learning-lesson.published',
        expect.any(Function),
      );
    });

    it('routes tourism events through the registered handler to the indexer', async () => {
      subscriber.onModuleInit();
      const handler = subscribe.mock.calls.find(
        (c) => c[0] === 'tourism-place.verified',
      )?.[1] as (event: TourismPlaceVerifiedEvent) => Promise<void>;

      await handler(buildTourismEvent());

      expect(indexer.peek(TOURISM_INDEX, 'tp-1')).toBeDefined();
    });

    it('routes learning events through the registered handler to the indexer', async () => {
      subscriber.onModuleInit();
      const handler = subscribe.mock.calls.find(
        (c) => c[0] === 'learning-lesson.published',
      )?.[1] as (event: LearningLessonPublishedEvent) => Promise<void>;

      await handler(buildLearningEvent());

      expect(indexer.peek(LEARNING_INDEX, 'll-1')).toBeDefined();
    });
  });

  describe('tourism indexing', () => {
    it('indexes a VERIFIED place into the tourism index', async () => {
      await subscriber.handleTourismPlaceVerified(buildTourismEvent());

      const stored = indexer.peek(TOURISM_INDEX, 'tp-1');
      expect(stored).toBeDefined();
      expect(stored?.doc).toMatchObject({
        tourismPlaceId: 'tp-1',
        name: 'Chefferie de Bandjoun',
        description: 'Un site patrimonial majeur.',
        region: 'Ouest',
        category: 'CHEFFERIE',
        latitude: '5.366000',
        longitude: '10.416000',
        source: 'MINISTRY',
        sourceRef: 'https://mintour.gov.cm/sites/bandjoun',
        mediaId: 'media-1',
        verifiedAt: '2026-06-26T10:00:00.000Z',
      });
      expect(indexer.size(TOURISM_INDEX)).toBe(1);
    });

    it('tags tourism documents with PUBLIC scope and no family anchor', async () => {
      await subscriber.handleTourismPlaceVerified(buildTourismEvent());

      const stored = indexer.peek(TOURISM_INDEX, 'tp-1');
      expect(stored?.scopeMeta.visibilityScope).toBe(VisibilityScope.PUBLIC);
      expect(stored?.scopeMeta.ownerPersonId).toBeNull();
      expect(stored?.scopeMeta.visibleMaxDegree).toBeNull();
    });

    it('carries provenance (source + sourceRef) but never the verified flag as a doc field', async () => {
      await subscriber.handleTourismPlaceVerified(buildTourismEvent());

      const doc = indexer.peek(TOURISM_INDEX, 'tp-1')?.doc ?? {};
      expect(doc.source).toBe('MINISTRY');
      expect(doc.sourceRef).toBe('https://mintour.gov.cm/sites/bandjoun');
      // 'verified' is a gate, not a stored business field.
      expect(Object.keys(doc)).not.toContain('verified');
    });

    it('does NOT index an UNVERIFIED place', async () => {
      await subscriber.handleTourismPlaceVerified(
        buildTourismEvent({ verified: false }),
      );

      expect(indexer.peek(TOURISM_INDEX, 'tp-1')).toBeUndefined();
      expect(indexer.size(TOURISM_INDEX)).toBe(0);
    });

    it('never leaks family-graph or private fields into the tourism document', async () => {
      await subscriber.handleTourismPlaceVerified(buildTourismEvent());

      const keys = Object.keys(indexer.peek(TOURISM_INDEX, 'tp-1')?.doc ?? {});
      for (const forbidden of [
        'personIds',
        'ownerPersonId',
        'phoneNumber',
        'relationships',
        'degree',
        'visibleMaxDegree',
      ]) {
        expect(keys).not.toContain(forbidden);
      }
    });

    it('upserts: re-verifying the same place replaces the previous document', async () => {
      await subscriber.handleTourismPlaceVerified(buildTourismEvent());
      await subscriber.handleTourismPlaceVerified(
        buildTourismEvent({ name: 'Nom mis à jour' }),
      );

      expect(indexer.peek(TOURISM_INDEX, 'tp-1')?.doc).toMatchObject({
        name: 'Nom mis à jour',
      });
      expect(indexer.size(TOURISM_INDEX)).toBe(1);
    });
  });

  describe('learning indexing', () => {
    it('indexes an APPROVED lesson into the learning index', async () => {
      await subscriber.handleLearningLessonPublished(buildLearningEvent());

      const stored = indexer.peek(LEARNING_INDEX, 'll-1');
      expect(stored).toBeDefined();
      expect(stored?.doc).toMatchObject({
        learningLessonId: 'll-1',
        title: 'Saluer en Ghomala',
        description: 'Leçon 1 : les salutations.',
        content: 'Bonjour se dit ...',
        languageCode: 'bbj',
        level: 'BEGINNER',
        ethnicGroup: 'Bamileke',
        isFromVerifiedAuthority: true,
        authorAccountId: 'account-1',
        authorityId: 'authority-1',
        isTicketed: false,
        publishedAt: '2026-06-26T11:00:00.000Z',
      });
      expect(indexer.size(LEARNING_INDEX)).toBe(1);
    });

    it('tags learning documents with PUBLIC scope and no family anchor', async () => {
      await subscriber.handleLearningLessonPublished(buildLearningEvent());

      const stored = indexer.peek(LEARNING_INDEX, 'll-1');
      expect(stored?.scopeMeta.visibilityScope).toBe(VisibilityScope.PUBLIC);
      expect(stored?.scopeMeta.ownerPersonId).toBeNull();
      expect(stored?.scopeMeta.visibleMaxDegree).toBeNull();
    });

    it('does NOT index a PENDING lesson', async () => {
      await subscriber.handleLearningLessonPublished(
        buildLearningEvent({ moderationStatus: 'PENDING' }),
      );

      expect(indexer.peek(LEARNING_INDEX, 'll-1')).toBeUndefined();
      expect(indexer.size(LEARNING_INDEX)).toBe(0);
    });

    it('does NOT index a REJECTED lesson', async () => {
      await subscriber.handleLearningLessonPublished(
        buildLearningEvent({ moderationStatus: 'REJECTED' }),
      );

      expect(indexer.peek(LEARNING_INDEX, 'll-1')).toBeUndefined();
      expect(indexer.size(LEARNING_INDEX)).toBe(0);
    });

    it('never leaks family-graph or private fields into the learning document', async () => {
      await subscriber.handleLearningLessonPublished(buildLearningEvent());

      const keys = Object.keys(indexer.peek(LEARNING_INDEX, 'll-1')?.doc ?? {});
      for (const forbidden of [
        'personIds',
        'ownerPersonId',
        'phoneNumber',
        'relationships',
        'degree',
        'visibleMaxDegree',
      ]) {
        expect(keys).not.toContain(forbidden);
      }
    });

    it('upserts: re-publishing the same lesson replaces the previous document', async () => {
      await subscriber.handleLearningLessonPublished(buildLearningEvent());
      await subscriber.handleLearningLessonPublished(
        buildLearningEvent({ title: 'Titre mis à jour' }),
      );

      expect(indexer.peek(LEARNING_INDEX, 'll-1')?.doc).toMatchObject({
        title: 'Titre mis à jour',
      });
      expect(indexer.size(LEARNING_INDEX)).toBe(1);
    });
  });

  it('keeps the tourism and learning indexes isolated from each other', async () => {
    await subscriber.handleTourismPlaceVerified(buildTourismEvent());
    await subscriber.handleLearningLessonPublished(buildLearningEvent());

    expect(indexer.size(TOURISM_INDEX)).toBe(1);
    expect(indexer.size(LEARNING_INDEX)).toBe(1);
    expect(indexer.peek(LEARNING_INDEX, 'tp-1')).toBeUndefined();
    expect(indexer.peek(TOURISM_INDEX, 'll-1')).toBeUndefined();
  });
});
