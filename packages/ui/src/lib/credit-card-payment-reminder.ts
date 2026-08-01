import type {
  Account,
  CreditCardPaymentReminderFields,
  NewAccount,
  NewNotificationEvent,
  Transaction,
} from "@money-insight/ui/types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CREDIT_CARD_ACCOUNT_TYPE = "Credit Card";

interface IsoDateParts {
  year: number;
  month: number;
  day: number;
}

export function parseIsoDate(value: string): IsoDateParts {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) throw new Error("Date must use YYYY-MM-DD format");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Date must be a valid calendar date");
  }
  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getLocalIsoDate(now = new Date()): string {
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function assertPaymentDueDay(paymentDueDay: number | undefined): number {
  if (
    !Number.isInteger(paymentDueDay) ||
    paymentDueDay === undefined ||
    paymentDueDay < 1 ||
    paymentDueDay > 31
  ) {
    throw new Error("Payment due day must be an integer from 1 to 31");
  }
  return paymentDueDay;
}

function dateForMonth(year: number, month: number, dueDay: number): string {
  return formatIsoDate(year, month, Math.min(dueDay, daysInMonth(year, month)));
}

export function deriveNextPaymentDueDate(
  paymentDueDay: number,
  todayIso: string,
): string {
  const dueDay = assertPaymentDueDay(paymentDueDay);
  const today = parseIsoDate(todayIso);
  const thisMonth = dateForMonth(today.year, today.month, dueDay);
  if (thisMonth >= todayIso) return thisMonth;

  const nextMonth = new Date(Date.UTC(today.year, today.month, 1));
  return dateForMonth(
    nextMonth.getUTCFullYear(),
    nextMonth.getUTCMonth() + 1,
    dueDay,
  );
}

export function advancePaymentDueDate(
  currentDueDate: string,
  paymentDueDay: number,
): string {
  const current = parseIsoDate(currentDueDate);
  const dueDay = assertPaymentDueDay(paymentDueDay);
  const nextMonth = new Date(Date.UTC(current.year, current.month, 1));
  return dateForMonth(
    nextMonth.getUTCFullYear(),
    nextMonth.getUTCMonth() + 1,
    dueDay,
  );
}

function matchesDueDay(date: string, dueDay: number): boolean {
  const parts = parseIsoDate(date);
  return parts.day === Math.min(dueDay, daysInMonth(parts.year, parts.month));
}

export function normalizeCreditCardPaymentReminder(
  input: NewAccount | Account,
  existing: Account | undefined,
  todayIso: string,
): CreditCardPaymentReminderFields {
  if (
    input.accountType !== CREDIT_CARD_ACCOUNT_TYPE ||
    input.paymentReminderEnabled !== true
  ) {
    return {
      paymentDueDay: undefined,
      paymentReminderEnabled: false,
      nextPaymentDueDate: undefined,
      lastPaymentConfirmedDueDate: undefined,
      lastPaymentConfirmedAt: undefined,
    };
  }

  const paymentDueDay = assertPaymentDueDay(input.paymentDueDay);
  const unchangedAnchor = existing?.paymentDueDay === paymentDueDay;
  const existingDueDate = unchangedAnchor
    ? existing.nextPaymentDueDate
    : undefined;
  const nextPaymentDueDate =
    existingDueDate && matchesDueDay(existingDueDate, paymentDueDay)
      ? existingDueDate
      : deriveNextPaymentDueDate(paymentDueDay, todayIso);

  return {
    paymentDueDay,
    paymentReminderEnabled: true,
    nextPaymentDueDate,
    lastPaymentConfirmedDueDate: existing?.lastPaymentConfirmedDueDate,
    lastPaymentConfirmedAt: existing?.lastPaymentConfirmedAt,
  };
}

export function calculateAccountBalance(
  account: Pick<Account, "name" | "initialBalance">,
  transactions: Array<Pick<Transaction, "account" | "amount">>,
): number {
  return transactions.reduce(
    (balance, transaction) =>
      transaction.account === account.name
        ? balance + transaction.amount
        : balance,
    account.initialBalance,
  );
}

export function getPaymentReminderTriggerAt(paymentDueDate: string): string {
  const due = parseIsoDate(paymentDueDate);
  return new Date(
    due.year,
    due.month - 1,
    due.day - 3,
    9,
    0,
    0,
    0,
  ).toISOString();
}

export function buildCreditCardPaymentReminderEvent(
  account: Account,
): NewNotificationEvent {
  if (!account.nextPaymentDueDate) {
    throw new Error("Next payment due date is required");
  }

  return {
    eventType: "credit_card_payment_due",
    title: "Credit card payment due",
    body: `${account.name} is due on ${account.nextPaymentDueDate}. Confirm payment in Money Insight.`,
    priority: "high",
    payload: {
      accountId: account.id,
      paymentDueDate: account.nextPaymentDueDate,
    },
    dedupeKey: `money-insight:credit_card_payment_due:${account.id}:${account.nextPaymentDueDate}`,
    status: "pending",
    triggeredAt: getPaymentReminderTriggerAt(account.nextPaymentDueDate),
    deliveryMode: "daily_until_source_change",
    sourceTable: "accounts",
    sourceRowId: account.id,
    sourceVersion: account.syncVersion,
  };
}
