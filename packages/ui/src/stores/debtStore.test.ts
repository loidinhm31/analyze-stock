import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  Debt,
  DebtSettlement,
  Transaction,
} from "@money-insight/ui/types";
import {
  resetServices,
  setAccountService,
  setCategoryGroupService,
  setCategoryService,
  setDebtService,
  setTransactionService,
} from "@money-insight/ui/adapters";
import { useDebtStore } from "./debtStore";
import { useSpendingStore } from "./spendingStore";

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "debt-1",
    name: "Family loan",
    debtType: "payable",
    counterpartyName: "Aunt",
    accountId: "Cash",
    currency: "VND",
    principalAmount: 1_000_000,
    settledAmount: 0,
    remainingAmount: 1_000_000,
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
  overrides: Partial<DebtSettlement> = {},
): DebtSettlement {
  return {
    id: "settlement-1",
    debtId: "debt-1",
    transactionId: "tx-1",
    accountId: "Cash",
    amount: 250_000,
    settledAt: "2024-01-10",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-10T00:00:00Z",
    syncVersion: 1,
    syncedAt: null,
    ...overrides,
  };
}

function makeDebtSettlementTransaction(): Transaction {
  return {
    id: "tx-1",
    source: "debt_settlement",
    note: "Debt payment: Family loan",
    amount: -250_000,
    category: "Debt Payment",
    account: "Cash",
    currency: "VND",
    date: "2024-01-10",
    excludeReport: false,
    expense: 250_000,
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

function installBaseServices() {
  setTransactionService({
    getTransactions: vi.fn().mockResolvedValue([]),
    addTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn().mockResolvedValue(undefined),
    importTransactions: vi.fn(),
    createTransfer: vi.fn(),
    updateTransfer: vi.fn(),
    deleteTransfer: vi.fn(),
    getTransferPair: vi.fn(),
  });
  setAccountService({
    getAccounts: vi.fn().mockResolvedValue([]),
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
  });
  setCategoryGroupService({
    getCategoryGroups: vi.fn().mockResolvedValue([]),
    getCategoryGroup: vi.fn(),
    addCategoryGroup: vi.fn(),
    updateCategoryGroup: vi.fn(),
    deleteCategoryGroup: vi.fn(),
    getCategoryMappings: vi.fn().mockResolvedValue([]),
    getMappingsForGroup: vi.fn(),
    mapSubCategory: vi.fn(),
    unmapSubCategory: vi.fn(),
    buildCategoryLookup: vi.fn(),
  });
  setCategoryService({
    getCategories: vi.fn().mockResolvedValue([]),
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    renameCategory: vi.fn(),
  });
}

describe("debtStore", () => {
  beforeEach(() => {
    useDebtStore.getState().reset();
    useSpendingStore.getState().reset();
    resetServices();
    installBaseServices();
  });

  it("loads debts with payable and receivable completion sections", async () => {
    setDebtService({
      getDebts: vi.fn().mockResolvedValue([
        makeDebt(),
        makeDebt({
          id: "debt-2",
          debtType: "receivable",
          remainingAmount: 0,
          settledAmount: 1_000_000,
          isCompleted: true,
        }),
      ]),
      getDebt: vi.fn(),
      createDebt: vi.fn(),
      updateDebt: vi.fn(),
      deleteDebt: vi.fn(),
      getSettlements: vi.fn(),
      addSettlement: vi.fn(),
      deleteSettlement: vi.fn(),
      reconcileDebtByTransactionId: vi.fn(),
    });

    await useDebtStore.getState().loadDebts();

    expect(useDebtStore.getState().payableSections.active).toHaveLength(1);
    expect(useDebtStore.getState().receivableSections.completed).toHaveLength(
      1,
    );
  });

  it("adds a settlement, refreshes debt aggregates, and reloads settlement history", async () => {
    const updatedDebt = makeDebt({
      settledAmount: 250_000,
      remainingAmount: 750_000,
    });
    const settlement = makeSettlement();

    setDebtService({
      getDebts: vi.fn().mockResolvedValue([makeDebt()]),
      getDebt: vi.fn().mockResolvedValue(updatedDebt),
      createDebt: vi.fn(),
      updateDebt: vi.fn(),
      deleteDebt: vi.fn(),
      getSettlements: vi.fn().mockResolvedValue([settlement]),
      addSettlement: vi.fn().mockResolvedValue(settlement),
      deleteSettlement: vi.fn(),
      reconcileDebtByTransactionId: vi.fn(),
    });

    useDebtStore.setState({
      debts: [makeDebt()],
      selectedDebtId: "debt-1",
      selectedDebt: makeDebt(),
      isDbReady: true,
    });

    await useDebtStore.getState().addSettlement("debt-1", {
      accountId: "Cash",
      amount: 250_000,
      settledAt: "2024-01-10",
    });

    expect(useDebtStore.getState().selectedDebt?.remainingAmount).toBe(750_000);
    expect(useDebtStore.getState().selectedDebtSettlements).toEqual([
      settlement,
    ]);
  });

  it("refreshes debts when a linked debt-settlement transaction is deleted", async () => {
    const getDebts = vi
      .fn()
      .mockResolvedValue([
        makeDebt({ settledAmount: 0, remainingAmount: 1_000_000 }),
      ]);
    const getSettlements = vi.fn().mockResolvedValue([]);

    setDebtService({
      getDebts,
      getDebt: vi.fn(),
      createDebt: vi.fn(),
      updateDebt: vi.fn(),
      deleteDebt: vi.fn(),
      getSettlements,
      addSettlement: vi.fn(),
      deleteSettlement: vi.fn(),
      reconcileDebtByTransactionId: vi.fn(),
    });

    useDebtStore.setState({
      debts: [makeDebt({ settledAmount: 250_000, remainingAmount: 750_000 })],
      selectedDebtId: "debt-1",
      isDbReady: true,
    });
    useSpendingStore.setState({
      transactions: [makeDebtSettlementTransaction()],
      accounts: [],
      isDbReady: true,
    });

    await useSpendingStore.getState().deleteTransaction("tx-1");

    expect(getDebts).toHaveBeenCalled();
    expect(getSettlements).toHaveBeenCalledWith("debt-1");
    expect(useDebtStore.getState().selectedDebtSettlements).toEqual([]);
  });
});
