import { getNotificationEventService } from "@money-insight/ui/adapters";
import type {
  NewNotificationEvent,
  NotificationEvent,
  NotificationEventStatus,
} from "@money-insight/ui/types";

export async function getNotificationEvents(): Promise<NotificationEvent[]> {
  return getNotificationEventService().getNotificationEvents();
}

export async function enqueueNotificationEvent(
  input: NewNotificationEvent,
): Promise<NotificationEvent> {
  return getNotificationEventService().enqueueNotificationEvent(input);
}

export async function updateNotificationEventStatus(
  id: string,
  status: NotificationEventStatus,
  options: {
    sentAt?: string;
    lastError?: string;
    attemptCount?: number;
  } = {},
): Promise<NotificationEvent> {
  return getNotificationEventService().updateNotificationEventStatus(id, {
    status,
    ...options,
  });
}
