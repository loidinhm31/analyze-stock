import { describe, it, expect } from "vitest";
import {
  isAdjustmentTransaction,
  parseAdjustmentNote,
  createAdjustmentNote,
  getBalanceAtDate,
  getBalanceBeforeAdjustment,
  calculateAdjustmentAmount,
  createAdjustment,
  recalculateAdjustments,
} from "./balanceAdjustmentService";
import type { Transaction, Account } from "@money-insight/ui/types";

// Helper to create a mock transaction
function createMockTransaction(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: "1",
    source: "manual",
    note: "",
    amount: 100,
    category: "Food",
    account: "Cash",
    currency: "VND",
    date: "2024-01-15",
    excludeReport: false,
    expense: 100,
    income: 0,
    yearMonth: "2024-01",
    year: 2024,
    month: 1,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    syncVersion: 1,
    syncedAt: null,
    ...overrides,
  };
}

// Helper to create a mock account
function createMockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc1",
    name: "Cash",
    initialBalance: 1000,
    currency: "VND",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    syncVersion: 1,
    syncedAt: null,
    ...overrides,
  };
}

describe("isAdjustmentTransaction", () => {
  it("returns true for balance_adjustment source", () => {
    const tx = createMockTransaction({ source: "balance_adjustment" });
    expect(isAdjustmentTransaction(tx)).toBe(true);
  });

  it("returns false for manual source", () => {
    const tx = createMockTransaction({ source: "manual" });
    expect(isAdjustmentTransaction(tx)).toBe(false);
  });

  it("returns false for csv_import source", () => {
    const tx = createMockTransaction({ source: "csv_import" });
    expect(isAdjustmentTransaction(tx)).toBe(false);
  });
});

describe("parseAdjustmentNote", () => {
  it("parses valid adjustment note", () => {
    const note = '{"targetBalance": 500}';
    expect(parseAdjustmentNote(note)).toEqual({ targetBalance: 500 });
  });

  it("returns null for invalid JSON", () => {
    expect(parseAdjustmentNote("invalid")).toBeNull();
  });

  it("returns null for missing targetBalance", () => {
    expect(parseAdjustmentNote('{"other": 123}')).toBeNull();
  });

  it("returns null for non-number targetBalance", () => {
    expect(parseAdjustmentNote('{"targetBalance": "abc"}')).toBeNull();
  });
});

describe("createAdjustmentNote", () => {
  it("creates valid JSON note", () => {
    const note = createAdjustmentNote(500);
    expect(JSON.parse(note)).toEqual({ targetBalance: 500 });
  });

  it("handles negative target balance", () => {
    const note = createAdjustmentNote(-100);
    expect(JSON.parse(note)).toEqual({ targetBalance: -100 });
  });
});

describe("calculateAdjustmentAmount", () => {
  it("calculates positive adjustment (increase balance)", () => {
    expect(calculateAdjustmentAmount(100, 50)).toBe(50);
  });

  it("calculates negative adjustment (decrease balance)", () => {
    expect(calculateAdjustmentAmount(50, 100)).toBe(-50);
  });

  it("calculates zero adjustment (balance matches)", () => {
    expect(calculateAdjustmentAmount(100, 100)).toBe(0);
  });
});

describe("getBalanceAtDate", () => {
  it("returns initial balance with no transactions", () => {
    const account = createMockAccount({ initialBalance: 1000 });
    expect(getBalanceAtDate([], account, "2024-01-15")).toBe(1000);
  });

  it("includes expense transactions before date", () => {
    const account = createMockAccount({ initialBalance: 1000 });
    const transactions = [
      createMockTransaction({
        id: "1",
        date: "2024-01-10",
        expense: 100,
        income: 0,
      }),
    ];
    // 1000 - 100 = 900
    expect(getBalanceAtDate(transactions, account, "2024-01-15")).toBe(900);
  });

  it("includes income transactions before date", () => {
    const account = createMockAccount({ initialBalance: 1000 });
    const transactions = [
      createMockTransaction({
        id: "1",
        date: "2024-01-10",
        expense: 0,
        income: 200,
      }),
    ];
    // 1000 + 200 = 1200
    expect(getBalanceAtDate(transactions, account, "2024-01-15")).toBe(1200);
  });

  it("excludes transactions after date", () => {
    const account = createMockAccount({ initialBalance: 1000 });
    const transactions = [
      createMockTransaction({
        id: "1",
        date: "2024-01-20",
        expense: 500,
        income: 0,
      }),
    ];
    expect(getBalanceAtDate(transactions, account, "2024-01-15")).toBe(1000);
  });

  it("includes transactions on the same date", () => {
    const account = createMockAccount({ initialBalance: 1000 });
    const transactions = [
      createMockTransaction({
        id: "1",
        date: "2024-01-15",
        expense: 100,
        income: 0,
      }),
    ];
    expect(getBalanceAtDate(transactions, account, "2024-01-15")).toBe(900);
  });

  it("ignores transactions from other accounts", () => {
    const account = createMockAccount({ initialBalance: 1000, name: "Cash" });
    const transactions = [
      createMockTransaction({
        id: "1",
        date: "2024-01-10",
        account: "Bank",
        expense: 500,
        income: 0,
      }),
    ];
    expect(getBalanceAtDate(transactions, account, "2024-01-15")).toBe(1000);
  });
});

describe("createAdjustment", () => {
  it("creates expense adjustment when balance needs to decrease", () => {
    const adj = createAdjustment("Cash", 800, "2024-01-15", "VND", 1000);
    expect(adj.account).toBe("Cash");
    expect(adj.category).toBe("__balance_adjustment__");
    expect(adj.source).toBe("balance_adjustment");
    expect(adj.amount).toBe(-200);
    expect(adj.excludeReport).toBe(true);
    expect(JSON.parse(adj.note)).toEqual({ targetBalance: 800 });
  });

  it("creates income adjustment when balance needs to increase", () => {
    const adj = createAdjustment("Cash", 1200, "2024-01-15", "VND", 1000);
    expect(adj.amount).toBe(200);
    expect(JSON.parse(adj.note)).toEqual({ targetBalance: 1200 });
  });
});

describe("recalculateAdjustments", () => {
  it("returns empty array when no adjustments exist", () => {
    const account = createMockAccount();
    const transactions = [
      createMockTransaction({ id: "1", expense: 100, income: 0 }),
    ];
    expect(recalculateAdjustments(transactions, account)).toEqual([]);
  });

  it("recalculates adjustment when transaction added before it", () => {
    const account = createMockAccount({ initialBalance: 1000 });
    // Initial state: balance was 1000, adjusted to 800 (adjustment = -200)
    // Then we add a -100 transaction before the adjustment
    // New balance before adjustment = 1000 - 100 = 900
    // New adjustment needed = 800 - 900 = -100

    const adjustmentTx = createMockTransaction({
      id: "adj1",
      source: "balance_adjustment",
      note: '{"targetBalance": 800}',
      date: "2024-01-15",
      expense: 200,
      income: 0,
      createdAt: "2024-01-15T12:00:00Z",
    });

    const newExpenseTx = createMockTransaction({
      id: "tx1",
      date: "2024-01-10",
      expense: 100,
      income: 0,
      createdAt: "2024-01-10T10:00:00Z",
    });

    const transactions = [newExpenseTx, adjustmentTx];
    const updated = recalculateAdjustments(transactions, account);

    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe("adj1");
    expect(updated[0].amount).toBe(-100);
    expect(updated[0].expense).toBe(100); // Changed from 200 to 100
    expect(updated[0].income).toBe(0);
  });

  it("does not update adjustment when amount is unchanged", () => {
    const account = createMockAccount({ initialBalance: 1000 });

    const adjustmentTx = createMockTransaction({
      id: "adj1",
      source: "balance_adjustment",
      note: '{"targetBalance": 800}',
      date: "2024-01-15",
      expense: 200,
      income: 0,
      createdAt: "2024-01-15T12:00:00Z",
    });

    const transactions = [adjustmentTx];
    const updated = recalculateAdjustments(transactions, account);

    expect(updated).toHaveLength(0);
  });

  it("handles multiple adjustments maintaining their targets", () => {
    const account = createMockAccount({ initialBalance: 1000 });

    // First adjustment: 1000 -> 800 (expense 200)
    const adj1 = createMockTransaction({
      id: "adj1",
      source: "balance_adjustment",
      note: '{"targetBalance": 800}',
      date: "2024-01-10",
      expense: 200,
      income: 0,
      createdAt: "2024-01-10T12:00:00Z",
    });

    // Second adjustment: 800 -> 500 (expense 300)
    const adj2 = createMockTransaction({
      id: "adj2",
      source: "balance_adjustment",
      note: '{"targetBalance": 500}',
      date: "2024-01-20",
      expense: 300,
      income: 0,
      createdAt: "2024-01-20T12:00:00Z",
    });

    const transactions = [adj1, adj2];
    const updated = recalculateAdjustments(transactions, account);

    // Both adjustments should maintain their targets, no updates needed
    expect(updated).toHaveLength(0);
  });

  it("converts expense to income adjustment when needed", () => {
    const account = createMockAccount({ initialBalance: 1000 });

    // Original: balance was 1000, adjusted to 800 (expense 200)
    // Add income transaction of 300 before adjustment
    // New balance before adjustment = 1000 + 300 = 1300
    // New adjustment needed = 800 - 1300 = -500 (expense)

    const incomeTx = createMockTransaction({
      id: "tx1",
      date: "2024-01-05",
      expense: 0,
      income: 300,
      createdAt: "2024-01-05T10:00:00Z",
    });

    const adjustmentTx = createMockTransaction({
      id: "adj1",
      source: "balance_adjustment",
      note: '{"targetBalance": 800}',
      date: "2024-01-15",
      expense: 200,
      income: 0,
      createdAt: "2024-01-15T12:00:00Z",
    });

    const transactions = [incomeTx, adjustmentTx];
    const updated = recalculateAdjustments(transactions, account);

    expect(updated).toHaveLength(1);
    expect(updated[0].amount).toBe(-500);
    expect(updated[0].expense).toBe(500);
    expect(updated[0].income).toBe(0);
  });

  it("handles income adjustment converting to expense", () => {
    const account = createMockAccount({ initialBalance: 500 });

    // Original: balance was 500, adjusted to 800 (income 300)
    // Add expense transaction of 200 before adjustment
    // New balance before adjustment = 500 - 200 = 300
    // New adjustment needed = 800 - 300 = 500 (income)

    const expenseTx = createMockTransaction({
      id: "tx1",
      date: "2024-01-05",
      expense: 200,
      income: 0,
      createdAt: "2024-01-05T10:00:00Z",
    });

    const adjustmentTx = createMockTransaction({
      id: "adj1",
      source: "balance_adjustment",
      note: '{"targetBalance": 800}',
      date: "2024-01-15",
      expense: 0,
      income: 300,
      createdAt: "2024-01-15T12:00:00Z",
    });

    const transactions = [expenseTx, adjustmentTx];
    const updated = recalculateAdjustments(transactions, account);

    expect(updated).toHaveLength(1);
    expect(updated[0].amount).toBe(500);
    expect(updated[0].income).toBe(500);
    expect(updated[0].expense).toBe(0);
  });

  it("ignores transactions from other accounts", () => {
    const account = createMockAccount({ initialBalance: 1000, name: "Cash" });

    const bankTx = createMockTransaction({
      id: "tx1",
      account: "Bank",
      date: "2024-01-05",
      expense: 500,
      income: 0,
    });

    const adjustmentTx = createMockTransaction({
      id: "adj1",
      account: "Cash",
      source: "balance_adjustment",
      note: '{"targetBalance": 800}',
      date: "2024-01-15",
      expense: 200,
      income: 0,
      createdAt: "2024-01-15T12:00:00Z",
    });

    const transactions = [bankTx, adjustmentTx];
    const updated = recalculateAdjustments(transactions, account);

    // Adjustment should remain unchanged
    expect(updated).toHaveLength(0);
  });

  it("handles zero adjustment when balance matches target", () => {
    const account = createMockAccount({ initialBalance: 800 });

    const adjustmentTx = createMockTransaction({
      id: "adj1",
      source: "balance_adjustment",
      note: '{"targetBalance": 800}',
      date: "2024-01-15",
      expense: 100, // Incorrect - should be 0
      income: 0,
      createdAt: "2024-01-15T12:00:00Z",
    });

    const transactions = [adjustmentTx];
    const updated = recalculateAdjustments(transactions, account);

    expect(updated).toHaveLength(1);
    expect(updated[0].amount).toBe(0);
    expect(updated[0].expense).toBe(0);
    expect(updated[0].income).toBe(0);
  });
});

describe("getBalanceBeforeAdjustment", () => {
  it("excludes the adjustment transaction itself", () => {
    const account = createMockAccount({ initialBalance: 1000 });

    const adjustmentTx = createMockTransaction({
      id: "adj1",
      source: "balance_adjustment",
      date: "2024-01-15",
      expense: 200,
      income: 0,
      createdAt: "2024-01-15T12:00:00Z",
    });

    const transactions = [adjustmentTx];
    const balance = getBalanceBeforeAdjustment(
      transactions,
      account,
      adjustmentTx,
    );

    // Should be just initial balance, not affected by the adjustment itself
    expect(balance).toBe(1000);
  });

  it("includes earlier adjustments", () => {
    const account = createMockAccount({ initialBalance: 1000 });

    const adj1 = createMockTransaction({
      id: "adj1",
      source: "balance_adjustment",
      date: "2024-01-10",
      expense: 200,
      income: 0,
      createdAt: "2024-01-10T12:00:00Z",
    });

    const adj2 = createMockTransaction({
      id: "adj2",
      source: "balance_adjustment",
      date: "2024-01-20",
      expense: 100,
      income: 0,
      createdAt: "2024-01-20T12:00:00Z",
    });

    const transactions = [adj1, adj2];
    const balance = getBalanceBeforeAdjustment(transactions, account, adj2);

    // Should include adj1: 1000 - 200 = 800
    expect(balance).toBe(800);
  });
});
