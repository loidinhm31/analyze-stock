import type {
  INotificationEventService,
  NotificationEventStatusUpdate,
} from "@money-insight/ui/adapters/factory/interfaces";
import type {
  NewNotificationEvent,
  NotificationEvent,
} from "@money-insight/ui/types";
import { generateId, getDb } from "./database";

export class IndexedDBNotificationEventAdapter implements INotificationEventService {
  async getNotificationEvents(): Promise<NotificationEvent[]> {
    const events = await getDb().notificationEvents.toArray();
    return events.sort((left, right) =>
      right.triggeredAt.localeCompare(left.triggeredAt),
    );
  }

  async enqueueNotificationEvent(
    input: NewNotificationEvent,
  ): Promise<NotificationEvent> {
    const now = new Date().toISOString();
    const event: NotificationEvent = {
      id: generateId(),
      ...input,
      priority: input.priority ?? "normal",
      payload: input.payload ? { ...input.payload } : undefined,
      status: input.status ?? "pending",
      attemptCount: input.attemptCount ?? 0,
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
      syncedAt: null,
    };

    await getDb().notificationEvents.add(event);
    return event;
  }

  async updateNotificationEventStatus(
    id: string,
    update: NotificationEventStatusUpdate,
  ): Promise<NotificationEvent> {
    const existing = await getDb().notificationEvents.get(id);
    if (!existing) {
      throw new Error("Notification event not found");
    }

    const updated: NotificationEvent = {
      ...existing,
      status: update.status,
      sentAt: update.sentAt ?? existing.sentAt,
      lastError: update.lastError,
      attemptCount: update.attemptCount ?? existing.attemptCount,
      updatedAt: new Date().toISOString(),
      syncVersion: (existing.syncVersion || 0) + 1,
      syncedAt: null,
    };

    await getDb().notificationEvents.put(updated);
    return updated;
  }
}
