import { describe, expect, it } from "vitest";
import type { Budget, Transaction } from "@money-insight/ui/types";
import { getTransactionBudgetWarning } from "./transaction-budget-warning";

const baseBudget: Budget = {
  id: "budget-1",
  name: "Food Budget",
  amount: 100,
  currency: "VND",
  categoryNames: ["Food"],
  accountNames: [],
  firstCycleStartDate: "2024-01-01",
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  syncVersion: 1,
  syncedAt: null,
};

const baseTransaction: Transaction = {
  id: "tx-1",
  note: "Lunch",
  amount: -80,
  category: "Food",
  account: "Cash",
  currency: "VND",
  date: "2024-01-10",
  excludeReport: false,
  source: "manual",
  expense: 80,
  income: 0,
  yearMonth: "2024-01",
  year: 2024,
  month: 1,
  createdAt: "2024-01-10T00:00:00.000Z",
  updatedAt: "2024-01-10T00:00:00.000Z",
  syncVersion: 1,
  syncedAt: null,
};

describe("getTransactionBudgetWarning", () => {
  it("returns the strongest over-budget breach", () => {
    const warning = getTransactionBudgetWarning(
      [
        baseBudget,
        {
          ...baseBudget,
          id: "budget-2",
          name: "Essentials",
          amount: 95,
        },
      ],
      [baseTransaction],
      {
        amount: -30,
        account: "Cash",
        category: "Food",
        currency: "VND",
        date: "2024-01-12",
        excludeReport: false,
        source: "manual",
      },
    );

    expect(warning).toEqual({
      budgetName: "Essentials",
      overAmount: 15,
      matchingBudgetCount: 2,
    });
  });

  it("returns null when no active budget is exceeded", () => {
    const warning = getTransactionBudgetWarning(
      [{ ...baseBudget, status: "paused" }],
      [baseTransaction],
      {
        amount: -10,
        account: "Cash",
        category: "Food",
        currency: "VND",
        date: "2024-01-12",
        excludeReport: false,
        source: "manual",
      },
    );

    expect(warning).toBeNull();
  });

  it("ignores unrelated budgets that are already over limit", () => {
    const warning = getTransactionBudgetWarning(
      [{ ...baseBudget, amount: 50 }],
      [baseTransaction],
      {
        amount: -10,
        account: "Cash",
        category: "Travel",
        currency: "VND",
        date: "2024-01-12",
        excludeReport: false,
        source: "manual",
      },
    );

    expect(warning).toBeNull();
  });
});
