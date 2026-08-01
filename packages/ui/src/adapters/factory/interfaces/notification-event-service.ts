import type {
  NewNotificationEvent,
  NotificationEvent,
  NotificationEventStatus,
} from "@money-insight/ui/types";

export interface NotificationEventStatusUpdate {
  status: NotificationEventStatus;
  sentAt?: string;
  lastError?: string;
  attemptCount?: number;
}

export interface INotificationEventService {
  getNotificationEvents(): Promise<NotificationEvent[]>;
  enqueueNotificationEvent(
    input: NewNotificationEvent,
  ): Promise<NotificationEvent>;
  updateNotificationEventStatus(
    id: string,
    update: NotificationEventStatusUpdate,
  ): Promise<NotificationEvent>;
}
