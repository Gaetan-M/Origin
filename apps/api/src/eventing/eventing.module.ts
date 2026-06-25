import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventPublisher } from './event-publisher';
import { InProcessEventBus } from './in-process-event-bus';

/**
 * Eventing backbone for the platform.
 *
 * Provides a single {@link EventPublisher} abstraction so application code can
 * publish/subscribe to typed DomainEvent envelopes without knowing the
 * transport. The default binding is the synchronous {@link InProcessEventBus}.
 *
 * To move to cross-service delivery (see TODO(seam) in InProcessEventBus),
 * swap the `useClass` below for a Redis/BullMQ-backed implementation — every
 * consumer that injects `EventPublisher` keeps working unchanged.
 *
 * EventEmitterModule.forRoot() is registered here (locally scoped) so the
 * underlying EventEmitter2 is available for injection into InProcessEventBus.
 */
@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    InProcessEventBus,
    { provide: EventPublisher, useExisting: InProcessEventBus },
    // String-token alias so consumers wiring against the 'EventPublisher'
    // token (e.g. the life-events module's EVENT_PUBLISHER) resolve the same
    // single instance as the class-token consumers (e.g. the fan-out handler).
    { provide: 'EventPublisher', useExisting: InProcessEventBus },
  ],
  exports: [EventPublisher, 'EventPublisher'],
})
export class EventingModule {}
