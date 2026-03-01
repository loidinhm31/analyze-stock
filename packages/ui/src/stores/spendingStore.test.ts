import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Transaction } from "@money-insight/ui/types";
import {
  setTransactionService,
  setAccountService,
  setCategoryGroupService,
  setCategoryService,
  resetServices,
} from "@money-insight/ui/adapters";
import {
  createOutgoingTransferNote,
  createIncomingTransferNote,
} from "@money-insight/ui/services/transferService";
import { useCategoryGroupStore } from "./categoryGroupStore";
import { useSpendingStore } from "./spendingStore";

// Minimal transfer pair factory (mirrors transferService.test.ts helper)
function makeTransferPair(
  transferId: string,
  fromAccount: string,
  toAccount: string,
  amount: number,
  date = "2024-01-15",
  currency = "VND",
): { outgoing: Transaction; incoming: Transaction } {
  const base = {
    source: "transfer" as const,
    category: "__transfer__",
    currency,
    date,
    excludeReport: true as const,
    yearMonth: date.slice(0, 7),
    year: parseInt(date.slice(0, 4)),
    month: parseInt(date.slice(5, 7)),
    transferId,
    syncVersion: 1,
    syncedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
  return {
    outgoing: {
      ...base,
      id: `${transferId}-out`,
      amount: -Math.abs(amount),
      expense: Math.abs(amount),
      income: 0,
      account: fromAccount,
      note: createOutgoingTransferNote("", toAccount),
    },
    incoming: {
      ...base,
      id: `${transferId}-in`,
      amount: Math.abs(amount),
      expense: 0,
      income: Math.abs(amount),
      account: toAccount,
      note: createIncomingTransferNote("", fromAccount),
    },
  };
}

describe("spendingStore.initFromDatabase", () => {
  beforeEach(() => {
    useSpendingStore.getState().reset();
    useCategoryGroupStore.setState({
      categories: [],
      groups: [],
      mappings: [],
      lookupMap: new Map(),
      isLoaded: false,
      isLoading: false,
      error: null,
    });
    resetServices();
  });

  it("categoryGroups are fully loaded before initFromDatabase resolves", async () => {
    const group = {
      id: "grp-1",
      name: "Food & Dining",
      syncVersion: 1,
      syncedAt: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };
    const mapping = {
      id: "map-1",
      subCategory: "Coffee",
      parentGroupId: "grp-1",
      syncVersion: 1,
      syncedAt: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    setTransactionService({
      getTransactions: vi.fn().mockResolvedValue([]),
      addTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
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
      getCategoryGroups: vi.fn().mockResolvedValue([group]),
      getCategoryGroup: vi.fn(),
      addCategoryGroup: vi.fn(),
      updateCategoryGroup: vi.fn(),
      deleteCategoryGroup: vi.fn(),
      getCategoryMappings: vi.fn().mockResolvedValue([mapping]),
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

    await useSpendingStore.getState().initFromDatabase();

    // By the time initFromDatabase resolves, categoryGroupStore must be fully loaded
    const cgState = useCategoryGroupStore.getState();
    expect(cgState.isLoaded).toBe(true);
    expect(cgState.lookupMap.get("Coffee")).toBe("Food & Dining");

    // Spending store must be ready
    expect(useSpendingStore.getState().isDbReady).toBe(true);
  });
});

describe("spendingStore.updateTransfer", () => {
  beforeEach(() => {
    // Reset store and service factory before every test
    useSpendingStore.getState().reset();
    resetServices();
  });

  it("updates both legs in store.transactions after a successful transfer edit", async () => {
    const transferId = "txfr-001";
    const { outgoing, incoming } = makeTransferPair(
      transferId,
      "Cash",
      "Savings",
      500_000,
    );

    // Simulate updated legs returned by the adapter after editing amount to 750_000
    const updatedOutgoing: Transaction = {
      ...outgoing,
      amount: -750_000,
      expense: 750_000,
    };
    const updatedIncoming: Transaction = {
      ...incoming,
      amount: 750_000,
      income: 750_000,
    };

    // Inject mock service
    setTransactionService({
      getTransactions: vi.fn().mockResolvedValue([]),
      addTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      importTransactions: vi.fn(),
      createTransfer: vi.fn(),
      updateTransfer: vi
        .fn()
        .mockResolvedValue({ outgoing: updatedOutgoing, incoming: updatedIncoming }),
      deleteTransfer: vi.fn(),
      getTransferPair: vi.fn(),
    });

    // Seed store with original pair
    useSpendingStore.setState({
      transactions: [outgoing, incoming],
      isDbReady: true,
    });

    // Act
    await useSpendingStore
      .getState()
      .updateTransfer(transferId, {
        fromAccount: "Cash",
        toAccount: "Savings",
        amount: 750_000,
        date: "2024-01-15",
        note: "",
        currency: "VND",
      });

    const txs = useSpendingStore.getState().transactions;

    // Both legs must be present and reflect the new amount
    const outLeg = txs.find((t) => t.id === outgoing.id);
    const inLeg = txs.find((t) => t.id === incoming.id);

    expect(outLeg).toBeDefined();
    expect(inLeg).toBeDefined();
    expect(outLeg!.amount).toBe(-750_000);
    expect(outLeg!.expense).toBe(750_000);
    expect(inLeg!.amount).toBe(750_000);
    expect(inLeg!.income).toBe(750_000);
  });

  it("preserves unrelated transactions when updating a transfer", async () => {
    const transferId = "txfr-002";
    const { outgoing, incoming } = makeTransferPair(
      transferId,
      "Cash",
      "Bank",
      100_000,
    );

    const unrelated: Transaction = {
      id: "unrelated-1",
      amount: -50_000,
      expense: 50_000,
      income: 0,
      account: "Cash",
      category: "Food",
      note: "Lunch",
      currency: "VND",
      date: "2024-01-10",
      source: "manual",
      excludeReport: false,
      yearMonth: "2024-01",
      year: 2024,
      month: 1,
      syncVersion: 1,
      syncedAt: null,
      createdAt: "2024-01-10T00:00:00Z",
      updatedAt: "2024-01-10T00:00:00Z",
    };

    const updatedOutgoing: Transaction = { ...outgoing, amount: -200_000, expense: 200_000 };
    const updatedIncoming: Transaction = { ...incoming, amount: 200_000, income: 200_000 };

    setTransactionService({
      getTransactions: vi.fn().mockResolvedValue([]),
      addTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      importTransactions: vi.fn(),
      createTransfer: vi.fn(),
      updateTransfer: vi
        .fn()
        .mockResolvedValue({ outgoing: updatedOutgoing, incoming: updatedIncoming }),
      deleteTransfer: vi.fn(),
      getTransferPair: vi.fn(),
    });

    useSpendingStore.setState({
      transactions: [unrelated, outgoing, incoming],
      isDbReady: true,
    });

    await useSpendingStore.getState().updateTransfer(transferId, {
      fromAccount: "Cash",
      toAccount: "Bank",
      amount: 200_000,
      date: "2024-01-15",
      note: "",
      currency: "VND",
    });

    const txs = useSpendingStore.getState().transactions;

    // Unrelated transaction must be untouched
    const unrelatedTx = txs.find((t) => t.id === "unrelated-1");
    expect(unrelatedTx).toBeDefined();
    expect(unrelatedTx!.amount).toBe(-50_000);

    // Transfer legs must be updated
    expect(txs.find((t) => t.id === outgoing.id)!.amount).toBe(-200_000);
    expect(txs.find((t) => t.id === incoming.id)!.amount).toBe(200_000);
  });
});
