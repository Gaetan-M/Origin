import { Test, TestingModule } from '@nestjs/testing';
import { VisibilityScope } from '@origin/shared-types';
import { EventPublisher } from '../eventing/event-publisher';
import {
  CULTURAL_INDEX,
  CulturalContentPublishedEvent,
  CulturalIndexingSubscriber,
} from './cultural-indexing.subscriber';
import { InMemorySearchIndexer } from './in-memory-search-indexer';
import { SEARCH_INDEXER, SearchIndexer } from './search-indexer.interface';

describe('CulturalIndexingSubscriber', () => {
  let module: TestingModule;
  let subscriber: CulturalIndexingSubscriber;
  let indexer: InMemorySearchIndexer;
  let subscribe: jest.Mock;

  beforeEach(async () => {
    // Fake event bus: capture the subscription so onModuleInit wiring is
    // exercised, while tests still call the handler directly.
    subscribe = jest.fn();
    const eventPublisher: Pick<EventPublisher, 'publish' | 'subscribe'> = {
      publish: jest.fn(),
      subscribe,
    };

    module = await Test.createTestingModule({
      providers: [
        { provide: SEARCH_INDEXER, useClass: InMemorySearchIndexer },
        { provide: EventPublisher, useValue: eventPublisher },
        CulturalIndexingSubscriber,
      ],
    }).compile();

    subscriber = module.get(CulturalIndexingSubscriber);
    indexer = module.get<SearchIndexer>(SEARCH_INDEXER) as InMemorySearchIndexer;
  });

  function buildEvent(
    overrides: Partial<CulturalContentPublishedEvent['payload']> = {},
  ): CulturalContentPublishedEvent {
    return {
      type: 'cultural-content.published',
      version: 1,
      occurredAt: '2026-06-26T10:00:00.000Z',
      actorId: 'account-1',
      correlationId: 'corr-1',
      payload: {
        culturalContentId: 'cc-1',
        contentType: 'PROVERB',
        title: 'Un proverbe Bamiléké',
        body: 'La sagesse des anciens.',
        languageCode: 'bbj',
        region: 'Ouest',
        ethnicGroup: 'Bamileke',
        moderationStatus: 'APPROVED',
        isFromVerifiedAuthority: true,
        authorAccountId: 'account-1',
        authorityId: 'authority-1',
        ...overrides,
      },
    };
  }

  it('subscribes to cultural-content.published on module init', () => {
    subscriber.onModuleInit();

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(
      'cultural-content.published',
      expect.any(Function),
    );
  });

  it('the registered handler routes events to the indexer', async () => {
    subscriber.onModuleInit();
    const handler = subscribe.mock.calls[0][1] as (
      event: CulturalContentPublishedEvent,
    ) => Promise<void>;

    await handler(buildEvent());

    expect(indexer.peek(CULTURAL_INDEX, 'cc-1')).toBeDefined();
  });

  it('indexes APPROVED content into the cultural index', async () => {
    await subscriber.handleCulturalContentPublished(buildEvent());

    const stored = indexer.peek(CULTURAL_INDEX, 'cc-1');
    expect(stored).toBeDefined();
    expect(stored?.doc).toMatchObject({
      culturalContentId: 'cc-1',
      contentType: 'PROVERB',
      title: 'Un proverbe Bamiléké',
      body: 'La sagesse des anciens.',
      languageCode: 'bbj',
      region: 'Ouest',
      ethnicGroup: 'Bamileke',
      isFromVerifiedAuthority: true,
      authorAccountId: 'account-1',
      authorityId: 'authority-1',
      publishedAt: '2026-06-26T10:00:00.000Z',
    });
    expect(indexer.size(CULTURAL_INDEX)).toBe(1);
  });

  it('tags indexed documents with PUBLIC scope and no family anchor', async () => {
    await subscriber.handleCulturalContentPublished(buildEvent());

    const stored = indexer.peek(CULTURAL_INDEX, 'cc-1');
    expect(stored?.scopeMeta.visibilityScope).toBe(VisibilityScope.PUBLIC);
    expect(stored?.scopeMeta.ownerPersonId).toBeNull();
    expect(stored?.scopeMeta.visibleMaxDegree).toBeNull();
  });

  it('never leaks family-graph or private fields into the indexed document', async () => {
    await subscriber.handleCulturalContentPublished(buildEvent());

    const doc = indexer.peek(CULTURAL_INDEX, 'cc-1')?.doc ?? {};
    const keys = Object.keys(doc);
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

  it('does NOT index PENDING content', async () => {
    await subscriber.handleCulturalContentPublished(
      buildEvent({ moderationStatus: 'PENDING' }),
    );

    expect(indexer.peek(CULTURAL_INDEX, 'cc-1')).toBeUndefined();
    expect(indexer.size(CULTURAL_INDEX)).toBe(0);
  });

  it('does NOT index REJECTED content', async () => {
    await subscriber.handleCulturalContentPublished(
      buildEvent({ moderationStatus: 'REJECTED' }),
    );

    expect(indexer.peek(CULTURAL_INDEX, 'cc-1')).toBeUndefined();
    expect(indexer.size(CULTURAL_INDEX)).toBe(0);
  });

  it('upserts: re-publishing the same id replaces the previous document', async () => {
    await subscriber.handleCulturalContentPublished(buildEvent());
    await subscriber.handleCulturalContentPublished(
      buildEvent({ title: 'Titre mis à jour' }),
    );

    expect(indexer.peek(CULTURAL_INDEX, 'cc-1')?.doc).toMatchObject({
      title: 'Titre mis à jour',
    });
    expect(indexer.size(CULTURAL_INDEX)).toBe(1);
  });
});
