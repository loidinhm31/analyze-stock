import type {
  Account,
  CreditCardPaymentReminderFields,
  NewAccount,
  NewNotificationEvent,
  Transaction,
} from "@money-insight/ui/types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MONTH_YEAR_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const CREDIT_CARD_ACCOUNT_TYPE = "Credit Card";
const MILLISECONDS_PER_DAY = 86_400_000;
const MIN_SUPPORTED_YEAR = 0;
const MAX_SUPPORTED_YEAR = 9_999;

export type DateOnlyInput = string | Date;

export interface CreditCardStatementTransactionInput {
  date: DateOnlyInput;
  amount: number;
}

export interface CreditCardStatementResult {
  payment_issue_date: string;
  payment_due_date: string;
  total_alert_amount: number;
}

interface IsoDateParts {
  year: number;
  month: number;
  day: number;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function createDateParts(
  year: number,
  month: number,
  day: number,
): IsoDateParts {
  if (
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    throw new Error("Date must be a valid calendar date");
  }
  return { year, month, day };
}

export function parseIsoDate(value: string): IsoDateParts {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) throw new Error("Date must use YYYY-MM-DD format");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return createDateParts(year, month, day);
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateParts(parts: IsoDateParts): string {
  return formatIsoDate(parts.year, parts.month, parts.day);
}

export function getLocalIsoDate(now = new Date()): string {
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function parseDateOnlyString(value: string): IsoDateParts {
  const isoMatch = ISO_DATE_PATTERN.exec(value);
  if (isoMatch) return parseIsoDate(value);

  const dayMonthYearMatch = DAY_MONTH_YEAR_PATTERN.exec(value);
  if (dayMonthYearMatch) {
    return createDateParts(
      Number(dayMonthYearMatch[3]),
      Number(dayMonthYearMatch[2]),
      Number(dayMonthYearMatch[1]),
    );
  }

  throw new Error("Date must use YYYY-MM-DD or DD/MM/YYYY format");
}

function normalizeDateOnly(value: DateOnlyInput): IsoDateParts {
  if (typeof value === "string") return parseDateOnlyString(value);

  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new Error("Date must be a valid Date");
    }
    return createDateParts(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    );
  }

  throw new Error("Date must be YYYY-MM-DD, DD/MM/YYYY, or a valid Date");
}

function toUtcDate(parts: IsoDateParts): Date {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(0, 0, 0, 0);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Date arithmetic overflow");
  }
  return date;
}

function toDayNumber(parts: IsoDateParts): number {
  const dayNumber = toUtcDate(parts).getTime() / MILLISECONDS_PER_DAY;
  if (!Number.isSafeInteger(dayNumber)) {
    throw new Error("Date arithmetic overflow");
  }
  return dayNumber;
}

function fromDayNumber(dayNumber: number): IsoDateParts {
  if (!Number.isSafeInteger(dayNumber)) {
    throw new Error("Date arithmetic overflow");
  }
  const date = new Date(dayNumber * MILLISECONDS_PER_DAY);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Date arithmetic overflow");
  }
  return createDateParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

function addCalendarDays(parts: IsoDateParts, days: number): IsoDateParts {
  if (!Number.isSafeInteger(days)) {
    throw new Error("Date arithmetic overflow");
  }
  return fromDayNumber(toDayNumber(parts) + days);
}

function addCalendarMonthsClamped(
  parts: IsoDateParts,
  months: number,
): IsoDateParts {
  if (!Number.isSafeInteger(months)) {
    throw new Error("Date arithmetic overflow");
  }

  const targetMonthIndex = parts.year * 12 + parts.month - 1 + months;
  if (!Number.isSafeInteger(targetMonthIndex)) {
    throw new Error("Date arithmetic overflow");
  }

  const year = Math.floor(targetMonthIndex / 12);
  const month = (targetMonthIndex % 12) + 1;
  if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) {
    throw new Error("Date arithmetic overflow");
  }

  return createDateParts(
    year,
    month,
    Math.min(parts.day, daysInMonth(year, month)),
  );
}

function assertInterestFreeDays(interestFreeDays: number): number {
  if (!Number.isSafeInteger(interestFreeDays) || interestFreeDays < 1) {
    throw new Error("Interest-free days must be a positive safe integer");
  }
  return interestFreeDays;
}

function assertPaymentCycleStartDay(paymentCycleStartDay: number): number {
  if (
    !Number.isInteger(paymentCycleStartDay) ||
    paymentCycleStartDay < 1 ||
    paymentCycleStartDay > 31
  ) {
    throw new Error("Payment cycle start day must be an integer from 1 to 31");
  }
  return paymentCycleStartDay;
}

export function normalizeDateOnlyToIso(value: DateOnlyInput): string {
  return formatDateParts(normalizeDateOnly(value));
}

export function calculateCreditCardStatement(
  startCycleDate: DateOnlyInput,
  interestFreeDays: number,
  transactions: CreditCardStatementTransactionInput[],
): CreditCardStatementResult {
  if (!Array.isArray(transactions)) {
    throw new Error("Transactions must be an array");
  }

  const start = normalizeDateOnly(startCycleDate);
  const graceDays = assertInterestFreeDays(interestFreeDays);
  const issue = addCalendarDays(addCalendarMonthsClamped(start, 1), -1);
  const due = addCalendarDays(start, graceDays - 1);
  const startIso = formatIsoDate(start.year, start.month, start.day);
  const issueIso = formatIsoDate(issue.year, issue.month, issue.day);
  let total = 0;

  for (const transaction of transactions) {
    if (!transaction || typeof transaction !== "object") {
      throw new Error("Transaction must include a date and amount");
    }
    const transactionDate = normalizeDateOnly(transaction.date);
    if (
      typeof transaction.amount !== "number" ||
      !Number.isFinite(transaction.amount)
    ) {
      throw new Error("Transaction amount must be finite");
    }

    const transactionIso = formatIsoDate(
      transactionDate.year,
      transactionDate.month,
      transactionDate.day,
    );
    if (transactionIso >= startIso && transactionIso <= issueIso) {
      const nextTotal = total + transaction.amount;
      if (!Number.isFinite(nextTotal)) {
        throw new Error("Transaction total overflow");
      }
      total = nextTotal;
    }
  }

  return {
    payment_issue_date: issueIso,
    payment_due_date: formatIsoDate(due.year, due.month, due.day),
    total_alert_amount: total,
  };
}

export function deriveCreditCardStatementDates(
  paymentCycleStartDate: DateOnlyInput,
  interestFreeDays: number,
): Pick<CreditCardStatementResult, "payment_issue_date" | "payment_due_date"> {
  const statement = calculateCreditCardStatement(
    paymentCycleStartDate,
    interestFreeDays,
    [],
  );
  return {
    payment_issue_date: statement.payment_issue_date,
    payment_due_date: statement.payment_due_date,
  };
}

export function isCreditCardPaymentReminderComplete(
  fields: Pick<
    CreditCardPaymentReminderFields,
    "paymentCycleStartDate" | "interestFreeDays"
  > &
    Partial<
      Pick<
        CreditCardPaymentReminderFields,
        "paymentCycleStartDay" | "nextPaymentDueDate"
      >
    > & { id?: string },
): boolean {
  try {
    if (!fields.paymentCycleStartDate) return false;
    const startDate = normalizeDateOnlyToIso(fields.paymentCycleStartDate);
    assertInterestFreeDays(fields.interestFreeDays ?? Number.NaN);
    const isFullAccount = "id" in fields;
    if (isFullAccount) {
      if (fields.paymentCycleStartDate !== startDate) return false;
      assertPaymentCycleStartDay(fields.paymentCycleStartDay ?? Number.NaN);
      const derived = deriveCreditCardStatementDates(
        startDate,
        fields.interestFreeDays!,
      );
      if (fields.nextPaymentDueDate !== derived.payment_due_date) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function advancePaymentCycleStartDate(
  currentCycleStartDate: DateOnlyInput,
  paymentCycleStartDay: number,
): string {
  const current = normalizeDateOnly(currentCycleStartDate);
  const anchorDay = assertPaymentCycleStartDay(paymentCycleStartDay);
  const targetMonthIndex = current.year * 12 + current.month;
  if (!Number.isSafeInteger(targetMonthIndex)) {
    throw new Error("Date arithmetic overflow");
  }

  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = (targetMonthIndex % 12) + 1;
  return dateForMonth(targetYear, targetMonth, anchorDay);
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
  return formatDateParts(
    createDateParts(year, month, Math.min(dueDay, daysInMonth(year, month))),
  );
}

export function deriveNextPaymentDueDate(
  paymentDueDay: number,
  todayIso: string,
): string {
  const dueDay = assertPaymentDueDay(paymentDueDay);
  const today = parseIsoDate(todayIso);
  const thisMonth = dateForMonth(today.year, today.month, dueDay);
  if (thisMonth >= todayIso) return thisMonth;

  const nextMonth = addCalendarMonthsClamped(today, 1);
  return dateForMonth(nextMonth.year, nextMonth.month, dueDay);
}

export function advancePaymentDueDate(
  currentDueDate: string,
  paymentDueDay: number,
): string {
  const current = parseIsoDate(currentDueDate);
  const dueDay = assertPaymentDueDay(paymentDueDay);
  const nextMonth = addCalendarMonthsClamped(current, 1);
  return dateForMonth(nextMonth.year, nextMonth.month, dueDay);
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
      paymentDueDay: input.paymentDueDay ?? existing?.paymentDueDay,
      paymentCycleStartDate: undefined,
      paymentCycleStartDay: undefined,
      interestFreeDays: undefined,
      paymentReminderEnabled: false,
      nextPaymentDueDate: undefined,
      lastPaymentConfirmedDueDate: undefined,
      lastPaymentConfirmedAt: undefined,
    };
  }

  parseIsoDate(todayIso);
  if (!input.paymentCycleStartDate) {
    throw new Error("Payment cycle start date is required");
  }

  const start = normalizeDateOnly(input.paymentCycleStartDate);
  const paymentCycleStartDate = formatDateParts(start);
  const interestFreeDays = assertInterestFreeDays(
    input.interestFreeDays ?? Number.NaN,
  );
  const paymentCycleStartDay =
    existing?.paymentCycleStartDate === paymentCycleStartDate &&
    existing.paymentCycleStartDay !== undefined
      ? assertPaymentCycleStartDay(existing.paymentCycleStartDay)
      : start.day;
  const nextPaymentDueDate = deriveCreditCardStatementDates(
    paymentCycleStartDate,
    interestFreeDays,
  ).payment_due_date;
  const unchangedCycle =
    existing?.paymentCycleStartDate === paymentCycleStartDate &&
    existing?.paymentCycleStartDay === paymentCycleStartDay &&
    existing?.interestFreeDays === interestFreeDays &&
    existing?.nextPaymentDueDate === nextPaymentDueDate;

  return {
    paymentDueDay: input.paymentDueDay ?? existing?.paymentDueDay,
    paymentCycleStartDate,
    paymentCycleStartDay,
    interestFreeDays,
    paymentReminderEnabled: true,
    nextPaymentDueDate,
    lastPaymentConfirmedDueDate: unchangedCycle
      ? existing?.lastPaymentConfirmedDueDate
      : undefined,
    lastPaymentConfirmedAt: unchangedCycle
      ? existing?.lastPaymentConfirmedAt
      : undefined,
  };
}

/**
 * @deprecated Use calculateCreditCardStatement for reminder decisions. This
 * retains the legacy lifetime-balance API for existing display/report users.
 */
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
    body: `Your credit card payment is due on ${account.nextPaymentDueDate}. Confirm payment in Money Insight.`,
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
