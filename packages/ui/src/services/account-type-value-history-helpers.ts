import type { Account, Transaction } from "@money-insight/ui/types";

type DeletableTransaction = Transaction & { deleted?: boolean };
const isoDatePrefix = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;

function isActiveTransaction(transaction: Transaction): boolean {
  return (transaction as DeletableTransaction).deleted !== true;
}

export function getDateOnly(value: string | Date): string {
  const match = value instanceof Date
    ? [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    : value.match(isoDatePrefix)?.slice(1);
  if (!match) {
    throw new Error("Expected an ISO date or timestamp");
  }
  const [year, month, day] = match.map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error("Expected a valid calendar date");
  }
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

/**
 * Account creation is compared by the calendar date encoded in its ISO value.
 * We intentionally do not convert offsets or Z timestamps to the runtime
 * timezone: synced projections must remain identical across devices, and an
 * account created at local midnight is included on that calendar date.
 */
export function getAccountCreatedDate(createdAt: string): string {
  return getDateOnly(createdAt);
}

export function getCompatibleTransactions(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): Transaction[] {
  const accountCurrencies = new Map(
    accounts.map((account) => [account.name, account.currency]),
  );

  return transactions.filter(
    (transaction) =>
      isActiveTransaction(transaction) &&
      accountCurrencies.get(transaction.account) === transaction.currency,
  );
}

export function groupTransactionsByAccount(
  transactions: readonly Transaction[],
): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const accountTransactions = grouped.get(transaction.account) ?? [];
    accountTransactions.push(transaction);
    grouped.set(transaction.account, accountTransactions);
  }
  return grouped;
}

function getCreatedAtTime(createdAt: string): number {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) {
    throw new Error("Expected a valid transaction timestamp");
  }
  return timestamp;
}

export function sortTransactionsByDateAndCreatedAt(
  transactions: readonly Transaction[],
): Transaction[] {
  return [...transactions].sort(
    (left, right) =>
      getDateOnly(left.date).localeCompare(getDateOnly(right.date)) ||
      getCreatedAtTime(left.createdAt) - getCreatedAtTime(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

export function getAccountMonthEndBalances(
  account: Account,
  transactions: readonly Transaction[],
  monthEnds: readonly string[],
): Array<number | null> {
  const accountTransactions = sortTransactionsByDateAndCreatedAt(transactions);
  const createdAt = getAccountCreatedDate(account.createdAt);
  let balance = account.initialBalance;
  let transactionIndex = 0;

  return monthEnds.map((monthEnd) => {
    if (createdAt > monthEnd) return null;
    while (
      transactionIndex < accountTransactions.length &&
      getDateOnly(accountTransactions[transactionIndex].date) <= monthEnd
    ) {
      const transaction = accountTransactions[transactionIndex++];
      balance += transaction.income - transaction.expense;
    }
    return balance;
  });
}
