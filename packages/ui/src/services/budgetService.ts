import { getBudgetService } from "@money-insight/ui/adapters";
import type {
  Budget,
  NewBudget,
  NewNotificationEvent,
  NotificationEvent,
  NotificationEventStatus,
} from "@money-insight/ui/types";

export async function getBudgets(): Promise<Budget[]> {
  return getBudgetService().getBudgets();
}

export async function getBudget(id: string): Promise<Budget | undefined> {
  return getBudgetService().getBudget(id);
}

export async function addBudget(input: NewBudget): Promise<Budget> {
  return getBudgetService().addBudget(input);
}

export async function updateBudget(budget: Budget): Promise<Budget> {
  return getBudgetService().updateBudget(budget);
}

export async function deleteBudget(id: string): Promise<void> {
  return getBudgetService().deleteBudget(id);
}

export async function getNotificationEvents(): Promise<NotificationEvent[]> {
  return getBudgetService().getNotificationEvents();
}

export async function enqueueNotificationEvent(
  input: NewNotificationEvent,
): Promise<NotificationEvent> {
  return getBudgetService().enqueueNotificationEvent(input);
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
  return getBudgetService().updateNotificationEventStatus(id, {
    status,
    ...options,
  });
}
