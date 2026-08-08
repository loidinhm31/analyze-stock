import type {
  Account,
  DashboardAccountTypeKey,
  Transaction,
} from "@money-insight/ui/types";
import {
  getAccountMonthEndBalances,
  getCompatibleTransactions,
  getDateOnly,
  groupTransactionsByAccount,
} from "./account-type-value-history-helpers";

export interface AccountTypeValueHistoryPoint {
  monthEnd: string;
  value: number | null;
}

export interface AccountTypeValueHistory {
  currency: string;
  currentBalance: number;
  monthEndBalances: readonly AccountTypeValueHistoryPoint[];
  trailingMetric: {
    label: "3-month average" | "Net change";
    value: number;
  };
}

const accountTypeKeys = new Map<string, DashboardAccountTypeKey>([
  ["Cash", "cash"],
  ["Bank Account", "bank_account"],
  ["Credit Card", "credit_card"],
  ["Investment", "investment"],
  ["Savings", "savings"],
]);

export function getDashboardAccountTypeKey(
  accountType: string | undefined,
): DashboardAccountTypeKey {
  return accountTypeKeys.get(accountType ?? "") ?? "__other__";
}

export function getAccountBalances(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  asOfDate?: string | Date,
): Map<string, number> {
  const asOfDateOnly = asOfDate ? getDateOnly(asOfDate) : undefined;
  return getAccountBalancesFromGroupedTransactions(
    accounts,
    groupTransactionsByAccount(getCompatibleTransactions(accounts, transactions)),
    asOfDateOnly,
  );
}

function getAccountBalancesFromGroupedTransactions(
  accounts: readonly Account[],
  transactionsByAccount: ReadonlyMap<string, readonly Transaction[]>,
  asOfDateOnly?: string,
): Map<string, number> {
  return new Map(
    accounts.map((account) => [
      account.name,
      account.initialBalance +
        (transactionsByAccount.get(account.name) ?? []).reduce(
          (balance, transaction) =>
            !asOfDateOnly || getDateOnly(transaction.date) <= asOfDateOnly
              ? balance + transaction.income - transaction.expense
              : balance,
          0,
        ),
    ]),
  );
}

export function getCompletedMonthEnds(
  referenceDate: string | Date,
): readonly string[] {
  const referenceDateOnly = getDateOnly(referenceDate);
  const year = Number(referenceDateOnly.slice(0, 4));
  const month = Number(referenceDateOnly.slice(5, 7));
  const previousMonth = new Date(Date.UTC(year, month - 2, 1));

  return Array.from({ length: 12 }, (_, index) => {
    const monthStart = new Date(
      Date.UTC(
        previousMonth.getUTCFullYear(),
        previousMonth.getUTCMonth() - (11 - index),
        1,
      ),
    );
    return new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
    )
      .toISOString()
      .slice(0, 10);
  });
}

export function getAccountTypeValueHistory(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  selectedAccountTypes: readonly DashboardAccountTypeKey[],
  referenceDate: string | Date = new Date(),
): readonly AccountTypeValueHistory[] {
  const referenceDateOnly = getDateOnly(referenceDate);
  const selectedKeys = new Set(selectedAccountTypes);
  const selectedAccounts = accounts.filter((account) =>
    selectedKeys.has(getDashboardAccountTypeKey(account.accountType)),
  );
  const compatibleTransactions = getCompatibleTransactions(
    selectedAccounts,
    transactions,
  );
  const transactionsByAccount = groupTransactionsByAccount(
    compatibleTransactions,
  );
  const currentBalances = getAccountBalancesFromGroupedTransactions(
    selectedAccounts,
    transactionsByAccount,
    referenceDateOnly,
  );
  const monthEnds = getCompletedMonthEnds(referenceDateOnly);
  const accountsByCurrency = new Map<string, Account[]>();

  for (const account of selectedAccounts) {
    const currencyAccounts = accountsByCurrency.get(account.currency) ?? [];
    currencyAccounts.push(account);
    accountsByCurrency.set(account.currency, currencyAccounts);
  }
  const historyByAccount = new Map(
    selectedAccounts.map((account) => [
      account.id,
      getAccountMonthEndBalances(
        account,
        transactionsByAccount.get(account.name) ?? [],
        monthEnds,
      ),
    ]),
  );
  const currentMonth = referenceDateOnly.slice(0, 7);
  const netChangeByAccount = new Map<string, number>();
  for (const [accountName, accountTransactions] of transactionsByAccount) {
    for (const transaction of accountTransactions) {
      const transactionDate = getDateOnly(transaction.date);
      if (
        transactionDate.slice(0, 7) === currentMonth &&
        transactionDate <= referenceDateOnly
      ) {
        netChangeByAccount.set(
          accountName,
          (netChangeByAccount.get(accountName) ?? 0) +
            transaction.income -
            transaction.expense,
        );
      }
    }
  }

  return Array.from(accountsByCurrency, ([currency, currencyAccounts]) => {
    const monthEndBalances = monthEnds.map((monthEnd, index) => {
      let hasValue = false;
      const value = currencyAccounts.reduce((total, account) => {
        const accountValue = historyByAccount.get(account.id)?.[index];
        if (accountValue === null || accountValue === undefined) return total;
        hasValue = true;
        return total + accountValue;
      }, 0);

      return { monthEnd, value: hasValue ? value : null };
    });
    const latestValues = monthEndBalances
      .map((point) => point.value)
      .filter((value): value is number => value !== null)
      .slice(-3);
    const netChange = currencyAccounts.reduce(
      (total, account) => total + (netChangeByAccount.get(account.name) ?? 0),
      0,
    );

    return {
      currency,
      currentBalance: currencyAccounts.reduce(
        (total, account) => total + (currentBalances.get(account.name) ?? 0),
        0,
      ),
      monthEndBalances,
      trailingMetric:
        latestValues.length > 0
          ? {
              label: "3-month average",
              value:
                latestValues.reduce((total, value) => total + value, 0) /
                latestValues.length,
            }
          : { label: "Net change", value: netChange },
    };
  });
}
