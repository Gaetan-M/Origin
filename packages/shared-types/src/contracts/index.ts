/**
 * Versioned domain-event contracts.
 *
 * These are pure compile-time types (no runtime dependencies). They describe
 * the wire shape of domain events published across the platform.
 *
 * Versioning rule: a breaking change to a payload means introducing a NEW
 * `version` value (and a new concrete event type), never editing an existing
 * contract in place. Consumers branch on `type` + `version`.
 */

import type { LifeStatus } from '../enums/index.js';

/**
 * Generic versioned envelope wrapping every domain event.
 *
 * @typeParam TType    - the string literal discriminator (e.g. 'person.created').
 * @typeParam TPayload - the event-specific payload shape.
 */
export interface DomainEvent<TType extends string, TPayload> {
  /** Discriminator identifying the kind of event. */
  type: TType;
  /** Contract version. A breaking payload change requires a new value. */
  version: number;
  /** ISO 8601 timestamp of when the event occurred. */
  occurredAt: string;
  /** Account id that triggered the event, or null for system-originated events. */
  actorId: string | null;
  /** Correlation id used to trace a chain of related events. */
  correlationId: string;
  /** Event-specific payload. */
  payload: TPayload;
}

// --- Concrete event contracts (examples) -----------------------------------

export interface PersonCreatedPayload {
  personId: string;
  displayName: string;
  lifeStatus: LifeStatus;
}

/** Emitted when a new Person node is created in the global graph. */
export type PersonCreatedEvent = DomainEvent<'person.created', PersonCreatedPayload>;

export type LifeEventKind = 'birth' | 'death' | 'union';

export interface LifeEventRecordedPayload {
  lifeEventId: string;
  kind: LifeEventKind;
  personIds: string[];
}

/** Emitted when a life event (birth, death, union) is recorded. */
export type LifeEventRecordedEvent = DomainEvent<
  'life-event.recorded',
  LifeEventRecordedPayload
>;
