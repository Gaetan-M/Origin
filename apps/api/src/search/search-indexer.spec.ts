import { Test, TestingModule } from '@nestjs/testing';
import { LifeEventRecordedEvent, VisibilityScope } from '@origin/shared-types';
import { EventPublisher } from '../eventing/event-publisher';
import { InMemorySearchIndexer } from './in-memory-search-indexer';
import {
  LIFE_EVENT_INDEX,
  LifeEventIndexingSubscriber,
} from './life-event-indexing.subscriber';
import {
  SEARCH_INDEXER,
  SearchIndexer,
  SearchScopeMeta,
} from './search-indexer.interface';

const SCOPE_META: SearchScopeMeta = {
  visibilityScope: VisibilityScope.FAMILY,
  ownerPersonId: 'person-1',
  visibleMaxDegree: 2,
};

describe('InMemorySearchIndexer', () => {
  let indexer: InMemorySearchIndexer;

  beforeEach(() => {
    indexer = new InMemorySearchIndexer();
  });

  it('indexes a document together with its scope metadata', async () => {
    await indexer.indexDocument('persons', 'p1', { displayName: 'Ada' }, SCOPE_META);

    const stored = indexer.peek('persons', 'p1');
    expect(stored).toBeDefined();
    expect(stored?.doc).toEqual({ displayName: 'Ada' });
    expect(stored?.scopeMeta).toEqual(SCOPE_META);
    expect(indexer.size('persons')).toBe(1);
  });

  it('upserts: re-indexing the same id replaces the previous document', async () => {
    await indexer.indexDocument('persons', 'p1', { v: 1 }, SCOPE_META);
    await indexer.indexDocument('persons', 'p1', { v: 2 }, SCOPE_META);

    expect(indexer.peek('persons', 'p1')?.doc).toEqual({ v: 2 });
    expect(indexer.size('persons')).toBe(1);
  });

  it('removes a document', async () => {
    await indexer.indexDocument('persons', 'p1', { v: 1 }, SCOPE_META);
    await indexer.removeDocument('persons', 'p1');

    expect(indexer.peek('persons', 'p1')).toBeUndefined();
    expect(indexer.size('persons')).toBe(0);
  });

  it('removing an unknown id is an idempotent no-op', async () => {
    await expect(indexer.removeDocument('persons', 'ghost')).resolves.toBeUndefined();
    await expect(indexer.removeDocument('nope', 'ghost')).resolves.toBeUndefined();
  });

  it('keeps separate buckets per index', async () => {
    await indexer.indexDocument('persons', 'p1', { v: 1 }, SCOPE_META);
    await indexer.indexDocument('life-events', 'p1', { v: 9 }, SCOPE_META);

    expect(indexer.size('persons')).toBe(1);
    expect(indexer.size('life-events')).toBe(1);
    expect(indexer.peek('life-events', 'p1')?.doc).toEqual({ v: 9 });
  });
});

describe('LifeEventIndexingSubscriber', () => {
  let module: TestingModule;
  let subscriber: LifeEventIndexingSubscriber;
  let indexer: InMemorySearchIndexer;

  beforeEach(async () => {
    // Mock the event bus: capture the subscription so onModuleInit wiring is
    // exercised, while tests still call handleLifeEventRecorded directly.
    const eventPublisher: Pick<EventPublisher, 'publish' | 'subscribe'> = {
      publish: jest.fn(),
      subscribe: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        { provide: SEARCH_INDEXER, useClass: InMemorySearchIndexer },
        { provide: EventPublisher, useValue: eventPublisher },
        LifeEventIndexingSubscriber,
      ],
    }).compile();

    subscriber = module.get(LifeEventIndexingSubscriber);
    indexer = module.get<SearchIndexer>(SEARCH_INDEXER) as InMemorySearchIndexer;
  });

  function buildEvent(
    overrides: Partial<LifeEventRecordedEvent['payload']> = {},
  ): LifeEventRecordedEvent {
    return {
      type: 'life-event.recorded',
      version: 1,
      occurredAt: '2026-06-25T10:00:00.000Z',
      actorId: 'account-1',
      correlationId: 'corr-1',
      payload: {
        lifeEventId: 'le-1',
        kind: 'birth',
        personIds: ['person-1', 'person-2'],
        ...overrides,
      },
    };
  }

  it('indexes a life event into the life-events index', async () => {
    await subscriber.handleLifeEventRecorded(buildEvent());

    const stored = indexer.peek(LIFE_EVENT_INDEX, 'le-1');
    expect(stored).toBeDefined();
    expect(stored?.doc).toMatchObject({
      lifeEventId: 'le-1',
      kind: 'birth',
      personIds: ['person-1', 'person-2'],
      occurredAt: '2026-06-25T10:00:00.000Z',
      actorId: 'account-1',
    });
  });

  it('defaults visibility to FAMILY anchored on the primary (first) person', async () => {
    await subscriber.handleLifeEventRecorded(buildEvent());

    const stored = indexer.peek(LIFE_EVENT_INDEX, 'le-1');
    expect(stored?.scopeMeta.visibilityScope).toBe(VisibilityScope.FAMILY);
    expect(stored?.scopeMeta.ownerPersonId).toBe('person-1');
    expect(stored?.scopeMeta.visibleMaxDegree).toBeNull();
  });

  it('tolerates an empty personIds list (null owner anchor)', async () => {
    await subscriber.handleLifeEventRecorded(buildEvent({ personIds: [] }));

    const stored = indexer.peek(LIFE_EVENT_INDEX, 'le-1');
    expect(stored?.scopeMeta.ownerPersonId).toBeNull();
  });
});
