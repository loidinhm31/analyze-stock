import { describe, expect, it } from "vitest";
import { getTransactionItemDisplay } from "./TransactionItem";
import type { Transaction } from "@money-insight/ui/types";

function makeTransferTransaction(): Transaction {
  return {
    id: "tx-1",
    source: "transfer",
    transferId: "transfer-1",
    note: JSON.stringify({
      userNote: "Monthly savings",
      toAccount: "Savings",
    }),
    amount: -100_000,
    category: "__transfer__",
    account: "Cash",
    currency: "VND",
    date: "2024-01-10",
    excludeReport: true,
    expense: 100_000,
    income: 0,
    yearMonth: "2024-01",
    year: 2024,
    month: 1,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
    syncVersion: 1,
    syncedAt: null,
  };
}

describe("TransactionItem display helpers", () => {
  it("shows a fallback note for debt settlement transactions", () => {
    expect(
      getTransactionItemDisplay({
        category: "Debt Payment",
        source: "debt_settlement",
      }),
    ).toMatchObject({
      isDebtSettlement: true,
      displayCategory: "Debt Payment",
      displayNote: "Debt settlement",
    });
  });

  it("shows a fallback note for debt initialization transactions", () => {
    expect(
      getTransactionItemDisplay({
        category: "Debt Borrowed",
        source: "debt_initialization",
      }),
    ).toMatchObject({
      isDebtInitialization: true,
      displayCategory: "Debt Borrowed",
      displayNote: "Debt initialization",
    });
  });

  it("normalizes transfer placeholder category and display note", () => {
    expect(
      getTransactionItemDisplay({
        category: "__transfer__",
        source: "transfer",
        transaction: makeTransferTransaction(),
      }),
    ).toMatchObject({
      isTransfer: true,
      displayCategory: "Transfer",
      displayNote: "Monthly savings • Send to Savings",
    });
  });
});
