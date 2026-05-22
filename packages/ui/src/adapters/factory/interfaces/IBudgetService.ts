import type {
  Budget,
  NewBudget,
  NewNotificationEvent,
  NotificationEvent,
  NotificationEventStatus,
} from "@money-insight/ui/types";

export interface INotificationEventStatusUpdate {
  status: NotificationEventStatus;
  sentAt?: string;
  lastError?: string;
  attemptCount?: number;
}

export interface IBudgetService {
  getBudgets(): Promise<Budget[]>;
  getBudget(id: string): Promise<Budget | undefined>;
  addBudget(input: NewBudget): Promise<Budget>;
  updateBudget(budget: Budget): Promise<Budget>;
  deleteBudget(id: string): Promise<void>;
  getNotificationEvents(): Promise<NotificationEvent[]>;
  enqueueNotificationEvent(
    input: NewNotificationEvent,
  ): Promise<NotificationEvent>;
  updateNotificationEventStatus(
    id: string,
    update: INotificationEventStatusUpdate,
  ): Promise<NotificationEvent>;
}
