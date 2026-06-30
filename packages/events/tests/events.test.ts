import { describe, expect, it, vi } from 'vitest';
import { createDomainEvent } from '../src/create-event.js';
import { EventTypes } from '../src/event-types.js';
import { InMemoryEventBus } from '../src/in-memory-event-bus.js';

describe('@ih/events', () => {
  it('creates domain events with defaults', () => {
    const event = createDomainEvent({
      type: EventTypes.UserRegistered,
      organizationId: 'org-123',
      payload: {
        userId: 'user-123',
      },
    });

    expect(event.id).toBeTypeOf('string');
    expect(event.type).toBe('user.registered');
    expect(event.organizationId).toBe('org-123');
    expect(event.occurredAt).toBeTypeOf('string');
    expect(event.payload).toEqual({
      userId: 'user-123',
    });
  });

  it('publishes events to subscribed handlers', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    bus.subscribe(EventTypes.JournalPosted, handler);

    const event = createDomainEvent({
      type: EventTypes.JournalPosted,
      organizationId: 'org-123',
      payload: {
        journalId: 'journal-123',
      },
    });

    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('unsubscribes handlers', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe(EventTypes.InvoicePaid, handler);
    unsubscribe();

    const event = createDomainEvent({
      type: EventTypes.InvoicePaid,
      organizationId: 'org-123',
      payload: {
        invoiceId: 'invoice-123',
      },
    });

    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });
});
