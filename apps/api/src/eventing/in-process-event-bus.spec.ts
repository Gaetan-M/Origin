import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PersonCreatedEvent } from '@origin/shared-types';
import { LifeStatus } from '@origin/shared-types';
import { InProcessEventBus } from './in-process-event-bus';

/**
 * Builds a valid PersonCreatedEvent envelope. `correlationId` is overridable so
 * tests can exercise both the supplied-id and generated-id paths.
 */
function buildPersonCreated(
  correlationId: string,
): PersonCreatedEvent {
  return {
    type: 'person.created',
    version: 1,
    occurredAt: '2026-06-25T10:00:00.000Z',
    actorId: 'account-1',
    correlationId,
    payload: {
      personId: 'person-1',
      displayName: 'Ada Lovelace',
      lifeStatus: LifeStatus.ALIVE,
    },
  };
}

describe('InProcessEventBus', () => {
  let emitter: EventEmitter2;
  let bus: InProcessEventBus;

  beforeEach(() => {
    emitter = new EventEmitter2();
    bus = new InProcessEventBus(emitter);
  });

  it('delivers a published event to a handler subscribed by type', async () => {
    const received: PersonCreatedEvent[] = [];
    bus.subscribe<PersonCreatedEvent>('person.created', (event) => {
      received.push(event);
    });

    await bus.publish(buildPersonCreated('corr-1'));

    expect(received).toHaveLength(1);
    expect(received[0]?.payload.personId).toBe('person-1');
    expect(received[0]?.correlationId).toBe('corr-1');
  });

  it('awaits async handlers before publish resolves', async () => {
    let settled = false;
    bus.subscribe<PersonCreatedEvent>('person.created', async () => {
      await Promise.resolve();
      settled = true;
    });

    await bus.publish(buildPersonCreated('corr-2'));

    expect(settled).toBe(true);
  });

  it('propagates a rejecting handler to the publisher (fail-fast)', async () => {
    bus.subscribe<PersonCreatedEvent>('person.created', () => {
      throw new Error('handler boom');
    });

    await expect(bus.publish(buildPersonCreated('corr-3'))).rejects.toThrow(
      'handler boom',
    );
  });

  it('generates a correlationId via node:crypto when absent', async () => {
    const received: PersonCreatedEvent[] = [];
    bus.subscribe<PersonCreatedEvent>('person.created', (event) => {
      received.push(event);
    });

    await bus.publish(buildPersonCreated(''));

    const id = received[0]?.correlationId;
    expect(id).toBeTruthy();
    // RFC-4122 v4 UUID shape proves it came from randomUUID().
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('does not mutate the caller envelope when generating a correlationId', async () => {
    const original = buildPersonCreated('');
    bus.subscribe<PersonCreatedEvent>('person.created', () => undefined);

    await bus.publish(original);

    expect(original.correlationId).toBe('');
  });

  it('preserves idempotency-friendly metadata (type/version/correlationId) across redelivery', async () => {
    const seen: Array<{
      type: string;
      version: number;
      correlationId: string;
    }> = [];
    bus.subscribe<PersonCreatedEvent>('person.created', (event) => {
      seen.push({
        type: event.type,
        version: event.version,
        correlationId: event.correlationId,
      });
    });

    const event = buildPersonCreated('stable-corr');
    // Simulate at-least-once redelivery of the SAME envelope.
    await bus.publish(event);
    await bus.publish(event);

    expect(seen).toHaveLength(2);
    expect(seen[0]).toEqual(seen[1]);
    expect(seen[0]?.correlationId).toBe('stable-corr');
  });

  it('routes events only to handlers of the matching type', async () => {
    const personHandler = jest.fn();
    const otherHandler = jest.fn();
    bus.subscribe<PersonCreatedEvent>('person.created', personHandler);
    bus.subscribe('life-event.recorded', otherHandler);

    await bus.publish(buildPersonCreated('corr-4'));

    expect(personHandler).toHaveBeenCalledTimes(1);
    expect(otherHandler).not.toHaveBeenCalled();
  });
});
