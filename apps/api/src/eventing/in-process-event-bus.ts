import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { DomainEvent } from '@origin/shared-types';
import {
  EventPublisher,
  type DomainEventHandler,
} from './event-publisher';

/**
 * In-process implementation of {@link EventPublisher} backed by EventEmitter2.
 *
 * This transport delivers events synchronously within a single API process.
 * It is the right default for a monolith / single-service deployment: there is
 * no network hop, no serialization, and handler errors surface immediately.
 *
 * TODO(seam): cross-service delivery. When Origin splits into multiple
 * services (or needs durable, retryable, at-least-once delivery), introduce a
 * `RedisEventBus` / `BullMqEventBus` that also implements {@link EventPublisher}
 * and bind THAT to the EventPublisher token in EventingModule instead of this
 * class. `publish()` would enqueue the (already self-contained, JSON-safe)
 * DomainEvent envelope onto a Redis Stream / BullMQ queue keyed by `type`, and
 * `subscribe()` would register a worker consuming that stream. Because the
 * envelope already carries `correlationId` and `version`, no envelope changes
 * are required — only the transport swaps. Callers depend on EventPublisher,
 * never on this class, so the swap is invisible to them.
 */
@Injectable()
export class InProcessEventBus extends EventPublisher {
  private readonly logger = new Logger(InProcessEventBus.name);

  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  /**
   * Dispatch an event to every handler subscribed to its `type`.
   *
   * A `correlationId` is generated via `node:crypto` when the caller did not
   * supply one, so downstream tracing and idempotency keys always exist. The
   * dispatched envelope is normalised (never mutating the caller's object).
   */
  async publish<TEvent extends DomainEvent<string, unknown>>(
    event: TEvent,
  ): Promise<void> {
    const dispatched: TEvent = event.correlationId
      ? event
      : { ...event, correlationId: randomUUID() };

    this.logger.debug(
      `publish type=${dispatched.type} version=${dispatched.version} ` +
        `correlationId=${dispatched.correlationId}`,
    );

    // emitAsync awaits async handlers and aggregates their results, so a
    // rejecting handler propagates to the publisher (fail-fast in-process).
    await this.emitter.emitAsync(dispatched.type, dispatched);
  }

  /**
   * Register a handler for a given event `type` discriminator.
   */
  subscribe<TEvent extends DomainEvent<string, unknown>>(
    type: TEvent['type'],
    handler: DomainEventHandler<TEvent>,
  ): void {
    this.emitter.on(type, (event: TEvent) => handler(event));
  }
}
