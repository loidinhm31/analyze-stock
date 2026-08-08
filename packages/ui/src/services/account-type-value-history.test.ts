import { describe, expect, it } from "vitest";
import type { Account, Transaction } from "@money-insight/ui/types";
import {
  getAccountBalances,
  getAccountTypeValueHistory,
  getCompletedMonthEnds,
  getDashboardAccountTypeKey,
} from "./account-type-value-history";
import { sortTransactionsByDateAndCreatedAt } from "./account-type-value-history-helpers";

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "cash",
    name: "Cash",
    accountType: "Cash",
    initialBalance: 100,
    currency: "VND",
    createdAt: "2025-07-01T00:00:00.000Z",
    updatedAt: "2025-07-01T00:00:00.000Z",
    syncVersion: 1,
    syncedAt: null,
    ...overrides,
  };
}

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "transaction",
    source: "manual",
    note: "",
    amount: 0,
    category: "Other",
    account: "Cash",
    currency: "VND",
    date: "2026-07-01",
    excludeReport: false,
    expense: 0,
    income: 0,
    yearMonth: "2026-07",
    year: 2026,
    month: 7,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    syncVersion: 1,
    syncedAt: null,
    ...overrides,
  };
}

describe("account type values", () => {
  it("maps only canonical labels directly and buckets all others", () => {
    expect(getDashboardAccountTypeKey("Bank Account")).toBe("bank_account");
    expect(getDashboardAccountTypeKey("Bank")).toBe("__other__");
    expect(getDashboardAccountTypeKey("constructor")).toBe("__other__");
    expect(getDashboardAccountTypeKey(undefined)).toBe("__other__");
  });

  it("builds the twelve completed calendar month ends", () => {
    const monthEnds = getCompletedMonthEnds("2026-08-08");

    expect(monthEnds).toHaveLength(12);
    expect(monthEnds[0]).toBe("2025-08-31");
    expect(monthEnds.at(-1)).toBe("2026-07-31");
    expect(getCompletedMonthEnds("2024-03-01").at(-1)).toBe("2024-02-29");
    expect(getCompletedMonthEnds(new Date(2026, 8, 1)).at(-1)).toBe(
      "2026-08-31",
    );
    expect(() => getCompletedMonthEnds("2026-02-31")).toThrow(
      "Expected a valid calendar date",
    );
  });

  it("keeps January as the previous completed month at a February boundary", () => {
    const monthEnds = getCompletedMonthEnds("2026-02-01");

    expect(monthEnds.at(-1)).toBe("2026-01-31");
  });

  it("calculates current balances without mutating inputs or using tombstones", () => {
    const accounts = [account()];
    const transactions = [
      transaction({ id: "income", income: 30 }),
      { ...transaction({ id: "deleted", income: 500 }), deleted: true },
      transaction({ id: "mismatched-currency", currency: "USD", income: 100 }),
    ];
    const transactionIds = transactions.map((item) => item.id);

    expect(getAccountBalances(accounts, transactions).get("Cash")).toBe(130);
    expect(transactions.map((item) => item.id)).toEqual(transactionIds);
  });
});

describe("getAccountTypeValueHistory", () => {
  const referenceDate = "2026-08-08";

  it("keeps currencies separate and calculates current value, history, and average", () => {
    const vndCash = account();
    const vndNewCash = account({
      id: "new-cash",
      name: "New Cash",
      initialBalance: 50,
      createdAt: "2026-07-31T00:00:00.000Z",
    });
    const usdBank = account({
      id: "usd-bank",
      name: "USD Bank",
      accountType: "Bank Account",
      initialBalance: 25,
      currency: "USD",
    });
    const transactions: Array<Transaction & { deleted?: boolean }> = [
      transaction({ id: "aug", date: "2025-08-10", expense: 10 }),
      transaction({ id: "may", date: "2026-05-10", income: 50 }),
      transaction({
        id: "transfer",
        date: "2026-06-10",
        expense: 40,
        source: "transfer",
      }),
      transaction({
        id: "adjustment",
        date: "2026-07-10",
        income: 20,
        source: "balance_adjustment",
        createdAt: "2026-07-10T12:00:00.000Z",
      }),
      transaction({
        id: "same-day-transfer",
        date: "2026-07-10",
        expense: 2,
        source: "transfer",
        createdAt: "2026-07-10T09:00:00.000Z",
      }),
      transaction({ id: "current", date: "2026-08-01", expense: 5 }),
      transaction({ id: "future", date: "2026-08-09", income: 100 }),
      { ...transaction({ id: "deleted", income: 500 }), deleted: true },
      transaction({
        id: "usd",
        account: "USD Bank",
        currency: "USD",
        income: 10,
      }),
      transaction({
        id: "mismatched-currency",
        account: "USD Bank",
        currency: "VND",
        income: 100,
      }),
    ];
    const transactionIds = transactions.map((item) => item.id);
    const history = getAccountTypeValueHistory(
      [vndCash, vndNewCash, usdBank],
      transactions,
      ["cash", "bank_account"],
      referenceDate,
    );

    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      currency: "VND",
      currentBalance: 163,
      trailingMetric: { label: "3-month average", value: 408 / 3 },
    });
    expect(history[0].monthEndBalances[10]).toMatchObject({
      monthEnd: "2026-06-30",
      value: 100,
    });
    expect(history[0].monthEndBalances[11]).toMatchObject({
      monthEnd: "2026-07-31",
      value: 168,
    });
    expect(history[1]).toMatchObject({ currency: "USD", currentBalance: 35 });
    expect(transactions.map((item) => item.id)).toEqual(transactionIds);
  });

  it("uses null before account creation and Net change when no month end exists", () => {
    const other = account({
      id: "new-other",
      name: "New Other",
      accountType: "Brokerage",
      currency: "EUR",
      initialBalance: 70,
      createdAt: "2026-08-01T00:00:00.000Z",
    });
    const history = getAccountTypeValueHistory(
      [other],
      [
        transaction({
          account: "New Other",
          currency: "EUR",
          date: "2026-08-02",
          income: 12,
        }),
        transaction({
          account: "New Other",
          currency: "EUR",
          date: "2026-08-09",
          income: 100,
        }),
      ],
      ["__other__"],
      referenceDate,
    );

    expect(history).toEqual([
      expect.objectContaining({
        currency: "EUR",
        currentBalance: 82,
        monthEndBalances: expect.arrayContaining([
          expect.objectContaining({ monthEnd: "2026-07-31", value: null }),
        ]),
        trailingMetric: { label: "Net change", value: 12 },
      }),
    ]);
  });

  it("uses the encoded account calendar date at local midnight", () => {
    const januaryAccount = account({
      createdAt: "2026-01-31T00:00:00-05:00",
      initialBalance: 70,
    });
    const history = getAccountTypeValueHistory(
      [januaryAccount],
      [],
      ["cash"],
      "2026-02-01",
    );

    expect(history[0].monthEndBalances.at(-1)).toEqual({
      monthEnd: "2026-01-31",
      value: 70,
    });
  });

  it("orders same-day transactions by createdAt timestamp", () => {
    const transactions = [
      transaction({
        id: "later",
        date: "2026-01-15",
        createdAt: "2026-01-15T12:00:00Z",
        income: 10,
      }),
      transaction({
        id: "earlier",
        date: "2026-01-15",
        createdAt: "2026-01-15T09:00:00Z",
        expense: 3,
      }),
    ];

    expect(sortTransactionsByDateAndCreatedAt(transactions).map((tx) => tx.id)).toEqual([
      "earlier",
      "later",
    ]);
    expect(
      getAccountTypeValueHistory(
        [account({ createdAt: "2025-01-01T00:00:00Z" })],
        transactions,
        ["cash"],
        "2026-02-01",
      )[0].monthEndBalances.at(-1),
    ).toEqual({ monthEnd: "2026-01-31", value: 107 });
  });

  it("returns no series when the selection has no matching account", () => {
    expect(
      getAccountTypeValueHistory(
        [account()],
        [],
        ["investment"],
        referenceDate,
      ),
    ).toEqual([]);
  });
});
