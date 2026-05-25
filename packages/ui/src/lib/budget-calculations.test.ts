import { describe, expect, it } from "vitest";
import type { Budget, Transaction } from "@money-insight/ui/types";
import {
  buildBudgetOverrunEvent,
  calculateBudgetUsage,
  getBudgetCycleForDate,
  previewBudgetUsageWithTransaction,
  transactionMatchesBudget,
} from "./budget-calculations";

const budget: Budget = {
  id: "budget-1",
  name: "Food",
  amount: 1000,
  currency: "VND",
  categoryNames: ["Food"],
  accountNames: [],
  firstCycleStartDate: "2024-01-31",
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  syncVersion: 1,
  syncedAt: null,
};

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    source: "manual",
    note: "",
    amount: -200,
    category: "Food",
    account: "Cash",
    currency: "VND",
    date: "2024-02-10",
    excludeReport: false,
    expense: 200,
    income: 0,
    yearMonth: "2024-02",
    year: 2024,
    month: 2,
    createdAt: "2024-02-10T00:00:00.000Z",
    updatedAt: "2024-02-10T00:00:00.000Z",
    syncVersion: 1,
    syncedAt: null,
    ...overrides,
  };
}

describe("budget-calculations", () => {
  it("clamps monthly cycles for short months", () => {
    expect(getBudgetCycleForDate(budget, "2024-02-15")).toEqual({
      startDate: "2024-01-31",
      endDate: "2024-02-28",
      cycleKey: "2024-01-31",
    });
    expect(getBudgetCycleForDate(budget, "2024-03-02")).toEqual({
      startDate: "2024-02-29",
      endDate: "2024-03-30",
      cycleKey: "2024-02-29",
    });
    expect(getBudgetCycleForDate(budget, "2023-12-15")).toEqual({
      startDate: "2024-01-31",
      endDate: "2024-02-28",
      cycleKey: "2024-01-31",
    });
  });

  it("matches only reportable expense transactions in the same category/account/currency", () => {
    expect(transactionMatchesBudget(makeTransaction(), budget)).toBe(true);
    expect(
      transactionMatchesBudget(makeTransaction({ amount: 250, income: 250, expense: 0 }), budget),
    ).toBe(false);
    expect(transactionMatchesBudget(makeTransaction({ excludeReport: true }), budget)).toBe(false);
    expect(transactionMatchesBudget(makeTransaction({ source: "transfer" }), budget)).toBe(false);
    expect(transactionMatchesBudget(makeTransaction({ currency: "USD" }), budget)).toBe(false);
    expect(
      transactionMatchesBudget(makeTransaction({ category: "Coffee" }), budget, {
        resolveCategoryName: () => "Food",
      }),
    ).toBe(true);
  });

  it("supports category sets and optional account filters", () => {
    const scopedBudget: Budget = {
      ...budget,
      categoryNames: ["Food", "Coffee"],
      accountNames: ["Card"],
    };

    expect(
      transactionMatchesBudget(
        makeTransaction({ category: "Coffee", account: "Card" }),
        scopedBudget,
      ),
    ).toBe(true);
    expect(
      transactionMatchesBudget(
        makeTransaction({ category: "Food", account: "Cash" }),
        scopedBudget,
      ),
    ).toBe(false);
  });

  it("calculates usage for the active cycle only", () => {
    const usage = calculateBudgetUsage(
      budget,
      [
        makeTransaction({ id: "tx-1", amount: -350, expense: 350, date: "2024-02-01" }),
        makeTransaction({ id: "tx-2", amount: -500, expense: 500, date: "2024-02-15" }),
        makeTransaction({ id: "tx-3", amount: -700, expense: 700, date: "2024-03-01" }),
      ],
      "2024-02-20",
    );

    expect(usage.spent).toBe(850);
    expect(usage.remaining).toBe(150);
    expect(usage.isOverBudget).toBe(false);
    expect(usage.matchingTransactionIds).toEqual(["tx-1", "tx-2"]);
  });

  it("counts historical synced transactions immediately for current usage", () => {
    const usage = calculateBudgetUsage(
      budget,
      [
        makeTransaction({
          id: "tx-old",
          amount: -650,
          expense: 650,
          date: "2024-02-02",
          syncedAt: 1_700_000_000,
        }),
        makeTransaction({
          id: "tx-new",
          amount: -200,
          expense: 200,
          date: "2024-02-05",
          syncedAt: null,
        }),
      ],
      "2024-02-20",
    );

    expect(usage.spent).toBe(850);
    expect(usage.matchingTransactionIds).toEqual(["tx-old", "tx-new"]);
  });

  it("detects first crossing and worsening when previewing transactions", () => {
    const currentTransactions = [
      makeTransaction({ id: "tx-1", amount: -700, expense: 700, date: "2024-02-05" }),
      makeTransaction({ id: "tx-2", amount: -250, expense: 250, date: "2024-02-06" }),
    ];

    const crossed = previewBudgetUsageWithTransaction(
      budget,
      currentTransactions,
      makeTransaction({
        id: "tx-3",
        amount: -200,
        expense: 200,
        date: "2024-02-10",
        updatedAt: "2024-02-10T00:00:00.000Z",
      }),
    );
    expect(crossed.crossedOverBudget).toBe(true);
    expect(crossed.worsenedOverBudget).toBe(false);

    const worsened = previewBudgetUsageWithTransaction(
      budget,
      [...currentTransactions, makeTransaction({ id: "tx-3", amount: -200, expense: 200 })],
      makeTransaction({
        id: "tx-3",
        amount: -350,
        expense: 350,
        date: "2024-02-10",
        updatedAt: "2024-02-10T00:00:00.000Z",
      }),
      makeTransaction({
        id: "tx-3",
        amount: -200,
        expense: 200,
        date: "2024-02-10",
      }),
    );
    expect(worsened.crossedOverBudget).toBe(false);
    expect(worsened.worsenedOverBudget).toBe(true);
  });

  it("builds deduped crossing events and per-transaction deduped worsening events", () => {
    const usage = calculateBudgetUsage(
      budget,
      [makeTransaction({ id: "tx-1", amount: -1200, expense: 1200, date: "2024-02-10" })],
      "2024-02-10",
    );

    const crossedEvent = buildBudgetOverrunEvent(
      budget,
      usage,
      { id: "tx-1", updatedAt: "2024-02-10T01:02:03.000Z" },
      "crossed",
    );
    expect(crossedEvent.dedupeKey).toBe(
      "money-insight:budget_overrun:budget-1:2024-01-31",
    );

    const worsenedEvent = buildBudgetOverrunEvent(
      budget,
      usage,
      { id: "tx-1", updatedAt: "2024-02-10T01:02:03.000Z" },
      "worsened",
    );
    expect(worsenedEvent.dedupeKey).toBe(
      "money-insight:budget_overrun:budget-1:2024-01-31:worsened:tx-1",
    );
    expect(worsenedEvent.payload?.reason).toBe("worsened");
  });
});
