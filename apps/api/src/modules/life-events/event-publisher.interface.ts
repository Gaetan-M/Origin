import type { DomainEvent } from '@origin/shared-types';

/**
 * DI token for the domain-event publisher abstraction.
 *
 * The concrete provider is supplied by the eventing module (dev-1). This
 * module depends on it only through the {@link EventPublisher} interface and
 * this token, so the two can be developed and registered independently.
 */
export const EVENT_PUBLISHER = 'EventPublisher';

/**
 * Minimal publisher contract this module relies on. Kept intentionally narrow
 * (single `publish` method) so any concrete eventing transport — in-process
 * EventEmitter, outbox table, message bus — can satisfy it.
 */
export interface EventPublisher {
  publish<TType extends string, TPayload>(
    event: DomainEvent<TType, TPayload>,
  ): Promise<void>;
}
