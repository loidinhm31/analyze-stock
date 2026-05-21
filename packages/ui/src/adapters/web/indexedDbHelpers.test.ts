import { describe, expect, it, vi } from "vitest";

vi.mock("./database", () => ({
  getDb: vi.fn(),
  generateId: vi.fn(),
  getCurrentTimestamp: vi.fn(),
}));

import {
  assertDebtType,
  assertPositiveAmount,
  assertTransactionSource,
  buildDebtInitializationTransactionAmount,
  buildDebtInitializationTransactionNote,
  deleteDebtWithSettlements,
  getDebtInitializationCategory,
  recomputeDebt,
} from "./indexedDbHelpers";
import { getDb } from "./database";
import type { Debt, DebtSettlement } from "@money-insight/ui/types";

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "debt-1",
    name: "Family loan",
    debtType: "payable",
    counterpartyName: "Aunt",
    accountId: "Cash",
    currency: "VND",
    principalAmount: 10,
    settledAmount: 0,
    remainingAmount: 10,
    isCompleted: false,
    originatedAt: "2024-01-01",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    syncVersion: 1,
    syncedAt: null,
    ...overrides,
  };
}

function makeSettlement(
  amount: number,
  settledAt: string,
  overrides: Partial<DebtSettlement> = {},
): DebtSettlement {
  return {
    id: `settlement-${settledAt}`,
    debtId: "debt-1",
    transactionId: `tx-${settledAt}`,
    accountId: "Cash",
    amount,
    settledAt,
    createdAt: `${settledAt}T00:00:00Z`,
    updatedAt: `${settledAt}T00:00:00Z`,
    syncVersion: 1,
    syncedAt: null,
    ...overrides,
  };
}

describe("indexedDbHelpers", () => {
  it("recomputes completion from positive settlements only", () => {
    const aggregate = recomputeDebt(makeDebt(), [
      makeSettlement(3, "2024-01-02"),
      makeSettlement(0, "2024-01-03"),
      makeSettlement(-2, "2024-01-04"),
      makeSettlement(7, "2024-01-05"),
    ]);

    expect(aggregate).toEqual({
      settledAmount: 10,
      remainingAmount: 0,
      isCompleted: true,
      completedAt: "2024-01-05",
    });
  });

  it("rolls a debt back to active when a settlement disappears from the aggregate", () => {
    const debt = makeDebt({ principalAmount: 10 });

    expect(
      recomputeDebt(debt, [
        makeSettlement(4, "2024-01-02"),
        makeSettlement(6, "2024-01-03"),
      ]),
    ).toMatchObject({
      settledAmount: 10,
      remainingAmount: 0,
      isCompleted: true,
      completedAt: "2024-01-03",
    });

    expect(recomputeDebt(debt, [makeSettlement(4, "2024-01-02")])).toEqual({
      settledAmount: 4,
      remainingAmount: 6,
      isCompleted: false,
      completedAt: undefined,
    });
  });

  it("rejects invalid runtime enum and amount values", () => {
    expect(() => assertDebtType("loan")).toThrow("Invalid debt type");
    expect(() => assertTransactionSource("sync_import")).toThrow(
      "Invalid transaction source",
    );
    expect(() => assertTransactionSource("debt_initialization")).not.toThrow();
    expect(() => assertPositiveAmount(0)).toThrow("amount must be positive");
  });

  it("builds debt initialization transaction details", () => {
    const payable = makeDebt({ debtType: "payable", principalAmount: 100 });
    const receivable = makeDebt({
      debtType: "receivable",
      principalAmount: 100,
    });

    expect(buildDebtInitializationTransactionAmount(payable)).toBe(100);
    expect(buildDebtInitializationTransactionAmount(receivable)).toBe(-100);
    expect(getDebtInitializationCategory("payable")).toBe("Debt Borrowed");
    expect(getDebtInitializationCategory("receivable")).toBe("Debt Lent");
    expect(buildDebtInitializationTransactionNote(payable)).toBe(
      "Debt borrowed: Family loan",
    );
  });

  it("deletes a debt with its initialization transaction and settlement transactions", async () => {
    const debt = makeDebt({ initialTransactionId: "tx-initial" });
    const settlement = makeSettlement(3, "2024-01-02", {
      id: "settlement-1",
      transactionId: "tx-settlement",
    });
    const mockDb = {
      debts: {
        get: vi.fn().mockResolvedValue(debt),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      debtSettlements: {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([settlement]),
          }),
        }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      transactions: {
        get: vi
          .fn()
          .mockResolvedValueOnce({ id: "tx-initial", syncVersion: 2 })
          .mockResolvedValueOnce({ id: "tx-settlement", syncVersion: 3 }),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      _pendingChanges: {
        add: vi.fn().mockResolvedValue(undefined),
      },
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    await deleteDebtWithSettlements("debt-1");

    expect(mockDb.transactions.delete).toHaveBeenCalledWith("tx-initial");
    expect(mockDb.transactions.delete).toHaveBeenCalledWith("tx-settlement");
    expect(mockDb.debtSettlements.delete).toHaveBeenCalledWith("settlement-1");
    expect(mockDb.debts.delete).toHaveBeenCalledWith("debt-1");
    expect(mockDb._pendingChanges.add).toHaveBeenCalledTimes(4);
  });
});
