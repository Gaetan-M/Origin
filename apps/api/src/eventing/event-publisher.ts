import type { DomainEvent } from '@origin/shared-types';

/**
 * A handler for a single domain-event type.
 *
 * Handlers must be idempotency-friendly: the same event (identified by its
 * `correlationId` + `type` + payload) may, under an at-least-once transport,
 * be delivered more than once. Handlers should therefore tolerate replays.
 *
 * @typeParam TEvent - the concrete DomainEvent shape this handler consumes.
 */
export type DomainEventHandler<TEvent extends DomainEvent<string, unknown>> = (
  event: TEvent,
) => void | Promise<void>;

/**
 * Abstraction over the platform event bus.
 *
 * Application code depends on this contract rather than on a concrete
 * transport, so the in-process implementation can later be swapped for a
 * cross-service transport (Redis Streams / BullMQ) without touching callers.
 *
 * Events are typed on the '@origin/shared-types' DomainEvent envelope so that
 * `type`, `version`, `occurredAt`, `actorId`, `correlationId` and `payload`
 * are consistent across publishers and subscribers.
 */
export abstract class EventPublisher {
  /**
   * Publish a domain event to all subscribed handlers.
   *
   * Implementations MUST ensure `correlationId` is populated (generating one
   * when the caller leaves it empty) so downstream tracing always has a value.
   *
   * @typeParam TEvent - the concrete DomainEvent shape being published.
   * @param event - the event envelope to dispatch.
   */
  abstract publish<TEvent extends DomainEvent<string, unknown>>(
    event: TEvent,
  ): Promise<void>;

  /**
   * Subscribe a handler to a given event `type` discriminator.
   *
   * @typeParam TEvent - the concrete DomainEvent shape the handler consumes.
   * @param type - the event `type` discriminator (e.g. 'person.created').
   * @param handler - the callback invoked for each matching event.
   */
  abstract subscribe<TEvent extends DomainEvent<string, unknown>>(
    type: TEvent['type'],
    handler: DomainEventHandler<TEvent>,
  ): void;
}
