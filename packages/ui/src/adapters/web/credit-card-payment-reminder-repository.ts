import type {
  Account,
  JsonObject,
  NotificationEvent,
  NotificationEventStatus,
} from "@money-insight/ui/types";
import {
  buildCreditCardPaymentReminderEvent,
  calculateAccountBalance,
} from "@money-insight/ui/lib";
import { trackDelete } from "./indexedDbHelpers";
import { getDb } from "./database";
import { IndexedDBNotificationEventAdapter } from "./indexed-db-notification-event-adapter";

const EVENT_TYPE = "credit_card_payment_due";
const RECONCILABLE_EVENT_STATUSES: ReadonlySet<NotificationEventStatus> =
  new Set(["pending", "processing", "failed", "sent"]);

function payloadString(
  payload: JsonObject | undefined,
  key: string,
): string | undefined {
  const value = payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function isAccountReminderEvent(
  event: NotificationEvent,
  account: Account,
): boolean {
  return (
    event.eventType === EVENT_TYPE &&
    event.sourceTable === "accounts" &&
    event.sourceRowId === account.id
  );
}

function isCurrentCycleEvent(
  event: NotificationEvent,
  account: Account,
): boolean {
  return (
    isAccountReminderEvent(event, account) &&
    event.sourceVersion === account.syncVersion &&
    event.terminal !== true &&
    RECONCILABLE_EVENT_STATUSES.has(event.status)
  );
}

async function deleteNotificationEvent(
  event: NotificationEvent,
): Promise<void> {
  if (event.syncedAt !== undefined && event.syncedAt !== null) {
    await trackDelete(
      "notificationEvents",
      event.id,
      event.syncVersion || 0,
      event.serverVersion,
    );
  }
  await getDb().notificationEvents.delete(event.id);
}

export async function reconcileCreditCardPaymentReminder(
  account: Account,
): Promise<NotificationEvent | undefined> {
  const db = getDb();
  const [transactions, events] = await Promise.all([
    db.transactions.where("account").equals(account.name).toArray(),
    db.notificationEvents.toArray(),
  ]);
  const accountEvents = events.filter((event) =>
    isAccountReminderEvent(event, account),
  );
  const currentCycleEvents = accountEvents.filter((event) =>
    isCurrentCycleEvent(event, account),
  );
  const activeCycleIsUnconfirmed =
    !!account.nextPaymentDueDate &&
    account.lastPaymentConfirmedDueDate !== account.nextPaymentDueDate;
  const shouldHaveReminder =
    account.accountType === "Credit Card" &&
    account.paymentReminderEnabled === true &&
    activeCycleIsUnconfirmed &&
    calculateAccountBalance(account, transactions) < 0;

  if (!shouldHaveReminder) {
    for (const event of accountEvents) await deleteNotificationEvent(event);
    return undefined;
  }

  const matchingEvent = currentCycleEvents.find(
    (event) =>
      payloadString(event.payload, "paymentDueDate") ===
      account.nextPaymentDueDate,
  );
  for (const event of accountEvents) {
    if (event.id !== matchingEvent?.id) {
      await deleteNotificationEvent(event);
    }
  }
  if (matchingEvent) return matchingEvent;

  return new IndexedDBNotificationEventAdapter().enqueueNotificationEvent(
    buildCreditCardPaymentReminderEvent(account),
  );
}

export async function reconcileCreditCardPaymentRemindersByAccountNames(
  accountNames: Iterable<string>,
): Promise<void> {
  const names = new Set(accountNames);
  if (names.size === 0) return;

  const accounts = await getDb().accounts.toArray();
  for (const account of accounts) {
    if (names.has(account.name)) {
      await reconcileCreditCardPaymentReminder(account);
    }
  }
}

export async function removeCreditCardPaymentReminderEvents(
  accountId: string,
): Promise<void> {
  const events = await getDb().notificationEvents.toArray();
  for (const event of events) {
    if (event.eventType === EVENT_TYPE && event.sourceRowId === accountId) {
      await deleteNotificationEvent(event);
    }
  }
}
