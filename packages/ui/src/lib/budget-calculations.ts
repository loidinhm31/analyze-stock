import type {
  Budget,
  NewNotificationEvent,
  NewTransaction,
  Transaction,
} from "@money-insight/ui/types";

type BudgetTransactionLike = Pick<
  NewTransaction,
  "amount" | "account" | "category" | "currency" | "date" | "excludeReport" | "source"
> &
  Partial<Pick<Transaction, "id" | "updatedAt">>;

export interface BudgetCycle {
  startDate: string;
  endDate: string;
  cycleKey: string;
}

export interface BudgetUsage extends BudgetCycle {
  budgetId: string;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  matchingTransactionIds: string[];
}

export interface BudgetUsagePreview {
  before: BudgetUsage;
  after: BudgetUsage;
  crossedOverBudget: boolean;
  worsenedOverBudget: boolean;
}

interface BudgetCalculationOptions {
  resolveCategoryName?: (categoryName: string) => string;
}

function parseIsoDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getClampedUtcDate(year: number, monthIndex: number, dayOfMonth: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(dayOfMonth, lastDay)));
}

function shiftMonth(date: Date, monthDelta: number, dayOfMonth: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + monthDelta;
  return getClampedUtcDate(year, month, dayOfMonth);
}

function isReportableExpense(tx: BudgetTransactionLike): boolean {
  return !tx.excludeReport && tx.amount < 0 && tx.source !== "transfer" && tx.source !== "balance_adjustment";
}

export function getBudgetCycleForDate(
  budget: Budget,
  date: string,
): BudgetCycle {
  const firstCycleStart = parseIsoDate(budget.firstCycleStartDate);
  const targetDate = parseIsoDate(date);
  const cycleDay = firstCycleStart.getUTCDate();

  if (targetDate < firstCycleStart) {
    const nextCycleStart = shiftMonth(firstCycleStart, 1, cycleDay);
    const endDate = new Date(nextCycleStart.getTime() - 86_400_000);

    return {
      startDate: formatIsoDate(firstCycleStart),
      endDate: formatIsoDate(endDate),
      cycleKey: formatIsoDate(firstCycleStart),
    };
  }

  let cycleStart = getClampedUtcDate(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    cycleDay,
  );

  if (cycleStart > targetDate) {
    cycleStart = shiftMonth(cycleStart, -1, cycleDay);
  }

  const nextCycleStart = shiftMonth(cycleStart, 1, cycleDay);
  const endDate = new Date(nextCycleStart.getTime() - 86_400_000);

  return {
    startDate: formatIsoDate(cycleStart),
    endDate: formatIsoDate(endDate),
    cycleKey: formatIsoDate(cycleStart),
  };
}

export function transactionMatchesBudget(
  tx: BudgetTransactionLike,
  budget: Budget,
  options: BudgetCalculationOptions = {},
): boolean {
  if (!isReportableExpense(tx) || tx.currency !== budget.currency) {
    return false;
  }

  const resolvedCategory = options.resolveCategoryName?.(tx.category) ?? tx.category;
  if (!budget.categoryNames.includes(resolvedCategory)) {
    return false;
  }

  return budget.accountNames.length === 0 || budget.accountNames.includes(tx.account);
}

export function calculateBudgetUsage(
  budget: Budget,
  transactions: Transaction[],
  asOfDate: string,
  options: BudgetCalculationOptions = {},
): BudgetUsage {
  const cycle = getBudgetCycleForDate(budget, asOfDate);
  const matchingTransactions = transactions.filter(
    (tx) =>
      tx.date >= cycle.startDate &&
      tx.date <= cycle.endDate &&
      transactionMatchesBudget(tx, budget, options),
  );
  const spent = matchingTransactions.reduce((total, tx) => total + Math.abs(tx.amount), 0);
  const remaining = budget.amount - spent;

  return {
    ...cycle,
    budgetId: budget.id,
    spent,
    remaining,
    percentUsed: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
    isOverBudget: spent > budget.amount,
    matchingTransactionIds: matchingTransactions.map((tx) => tx.id),
  };
}

function buildPreviewTransaction(
  draftTx: BudgetTransactionLike,
  originalTx?: Transaction,
): Transaction {
  return {
    id: draftTx.id ?? originalTx?.id ?? "draft-budget-transaction",
    source: draftTx.source ?? originalTx?.source ?? "manual",
    note: originalTx?.note ?? "",
    importBatchId: originalTx?.importBatchId,
    transferId: originalTx?.transferId,
    amount: draftTx.amount,
    category: draftTx.category,
    account: draftTx.account,
    currency: draftTx.currency,
    date: draftTx.date,
    event: originalTx?.event,
    excludeReport: draftTx.excludeReport,
    expense: draftTx.amount < 0 ? Math.abs(draftTx.amount) : 0,
    income: draftTx.amount > 0 ? draftTx.amount : 0,
    yearMonth: draftTx.date.slice(0, 7),
    year: parseInt(draftTx.date.slice(0, 4), 10),
    month: parseInt(draftTx.date.slice(5, 7), 10),
    createdAt: originalTx?.createdAt ?? "",
    updatedAt: draftTx.updatedAt ?? originalTx?.updatedAt ?? "",
    syncVersion: originalTx?.syncVersion ?? 0,
    syncedAt: originalTx?.syncedAt ?? null,
  };
}

export function previewBudgetUsageWithTransaction(
  budget: Budget,
  transactions: Transaction[],
  draftTx: BudgetTransactionLike,
  originalTx?: Transaction,
  options: BudgetCalculationOptions = {},
): BudgetUsagePreview {
  const withoutOriginal = originalTx
    ? transactions.filter((tx) => tx.id !== originalTx.id)
    : transactions;
  const insertedTx = buildPreviewTransaction(draftTx, originalTx);
  const after = calculateBudgetUsage(
    budget,
    [...withoutOriginal, insertedTx],
    draftTx.date,
    options,
  );
  const before = calculateBudgetUsage(budget, transactions, draftTx.date, options);

  return {
    before,
    after,
    crossedOverBudget: before.spent <= budget.amount && after.spent > budget.amount,
    worsenedOverBudget: before.spent > budget.amount && after.spent > before.spent,
  };
}

export function buildBudgetOverrunEvent(
  budget: Budget,
  usage: BudgetUsage,
  triggeringTransaction: Pick<Transaction, "id" | "updatedAt">,
  reason: "crossed" | "worsened",
): NewNotificationEvent {
  const spentFormatted = usage.spent.toLocaleString("en-US");
  const amountFormatted = budget.amount.toLocaleString("en-US");

  return {
    eventType: "budget_overrun",
    title: `Budget exceeded: ${budget.name}`,
    body: `${budget.name} spent ${spentFormatted}/${amountFormatted} ${budget.currency}.`,
    priority: "high",
    payload: {
      budgetId: budget.id,
      cycleKey: usage.cycleKey,
      startDate: usage.startDate,
      endDate: usage.endDate,
      spent: usage.spent,
      amount: budget.amount,
      currency: budget.currency,
      reason,
      triggeringTransactionId: triggeringTransaction.id,
    },
    dedupeKey:
      reason === "crossed"
        ? `money-insight:budget_overrun:${budget.id}:${usage.cycleKey}`
        : `money-insight:budget_overrun:${budget.id}:${usage.cycleKey}:worsened:${triggeringTransaction.id}`,
    triggeredAt: triggeringTransaction.updatedAt ?? new Date().toISOString(),
    sourceTable: "transactions",
    sourceRowId: triggeringTransaction.id,
  };
}
