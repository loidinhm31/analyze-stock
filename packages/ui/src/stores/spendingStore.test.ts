import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Budget, NotificationEvent, Transaction } from "@money-insight/ui/types";
import { MoneyInsightAnalyzer } from "@money-insight/ui/lib";
import {
  setTransactionService,
  setAccountService,
  setBudgetService,
  setCategoryGroupService,
  setCategoryService,
  resetServices,
} from "@money-insight/ui/adapters";
import {
  createOutgoingTransferNote,
  createIncomingTransferNote,
} from "@money-insight/ui/services/transferService";
import { useBudgetStore } from "./budgetStore";
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

function makeBudgetTransaction(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: "budget-tx-1",
    source: "manual",
    note: "",
    amount: -200,
    category: "Food",
    account: "Cash",
    currency: "VND",
    date: "2024-01-10",
    excludeReport: false,
    expense: 200,
    income: 0,
    yearMonth: "2024-01",
    year: 2024,
    month: 1,
    syncVersion: 1,
    syncedAt: null,
    createdAt: "2024-01-10T00:00:00.000Z",
    updatedAt: "2024-01-10T00:00:00.000Z",
    ...overrides,
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
    setAccountService({
      getAccounts: vi.fn().mockResolvedValue([]),
      addAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn(),
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
    setAccountService({
      getAccounts: vi.fn().mockResolvedValue([]),
      addAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn(),
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

describe("spendingStore budget notifications", () => {
  const account = {
    id: "acc-1",
    name: "Cash",
    currency: "VND",
    initialBalance: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    syncVersion: 1,
    syncedAt: null,
  };
  const budget: Budget = {
    id: "budget-1",
    name: "Food",
    amount: 1000,
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

  beforeEach(() => {
    useSpendingStore.getState().reset();
    useBudgetStore.getState().reset();
    resetServices();

    setAccountService({
      getAccounts: vi.fn().mockResolvedValue([account]),
      addAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn(),
    });
    setBudgetService({
      getBudgets: vi.fn().mockResolvedValue([budget]),
      getBudget: vi.fn(),
      addBudget: vi.fn(),
      updateBudget: vi.fn(),
      deleteBudget: vi.fn(),
      getNotificationEvents: vi.fn().mockResolvedValue([]),
      enqueueNotificationEvent: vi.fn().mockImplementation(
        async (input): Promise<NotificationEvent> => ({
          id: `event-${input.sourceRowId}`,
          priority: input.priority ?? "normal",
          payload: input.payload,
          status: input.status ?? "pending",
          attemptCount: input.attemptCount ?? 0,
          createdAt: "2024-01-10T00:00:00.000Z",
          updatedAt: "2024-01-10T00:00:00.000Z",
          syncVersion: 1,
          syncedAt: null,
          ...input,
        }),
      ),
      updateNotificationEventStatus: vi.fn(),
    });
  });

  it("enqueues one deduped event when a new transaction first crosses the budget", async () => {
    const existing = makeBudgetTransaction({
      id: "tx-1",
      amount: -900,
      expense: 900,
      date: "2024-01-05",
      yearMonth: "2024-01",
      month: 1,
    });
    const created = makeBudgetTransaction({
      id: "tx-2",
      amount: -200,
      expense: 200,
      date: "2024-01-10",
      yearMonth: "2024-01",
      month: 1,
      updatedAt: "2024-01-10T00:00:00.000Z",
    });
    const addTransactionMock = vi.fn().mockResolvedValue(created);
    const enqueueMock = vi.fn().mockImplementation(async (input) => ({
      id: `event-${input.sourceRowId}`,
      priority: input.priority ?? "normal",
      payload: input.payload,
      status: input.status ?? "pending",
      attemptCount: input.attemptCount ?? 0,
      createdAt: "2024-01-10T00:00:00.000Z",
      updatedAt: "2024-01-10T00:00:00.000Z",
      syncVersion: 1,
      syncedAt: null,
      ...input,
    }));

    setBudgetService({
      getBudgets: vi.fn().mockResolvedValue([budget]),
      getBudget: vi.fn(),
      addBudget: vi.fn(),
      updateBudget: vi.fn(),
      deleteBudget: vi.fn(),
      getNotificationEvents: vi.fn().mockResolvedValue([]),
      enqueueNotificationEvent: enqueueMock,
      updateNotificationEventStatus: vi.fn(),
    });

    setTransactionService({
      getTransactions: vi.fn().mockResolvedValue([]),
      addTransaction: addTransactionMock,
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      importTransactions: vi.fn(),
      createTransfer: vi.fn(),
      updateTransfer: vi.fn(),
      deleteTransfer: vi.fn(),
      getTransferPair: vi.fn(),
    });

    useSpendingStore.setState({
      transactions: [existing],
      accounts: [account],
      analyzer: new MoneyInsightAnalyzer([]),
      isDbReady: true,
    });

    await useSpendingStore.getState().addTransaction({
      note: "",
      amount: -200,
      category: "Food",
      account: "Cash",
      currency: "VND",
      date: "2024-01-10",
      excludeReport: false,
      source: "manual",
    });

    expect(addTransactionMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock.mock.calls[0][0].dedupeKey).toBe(
      "money-insight:budget_overrun:budget-1:2024-01-01",
    );
    expect(enqueueMock.mock.calls[0][0].payload?.reason).toBe("crossed");
  });

  it("enqueues a per-transaction deduped event when an edit worsens an existing over-budget cycle", async () => {
    const original = makeBudgetTransaction({
      id: "tx-2",
      amount: -150,
      expense: 150,
      date: "2024-01-10",
      yearMonth: "2024-01",
      month: 1,
      updatedAt: "2024-01-10T00:00:00.000Z",
    });
    const updated = {
      ...original,
      amount: -300,
      expense: 300,
      updatedAt: "2024-01-11T00:00:00.000Z",
    };
    const enqueueMock = vi.fn().mockImplementation(async (input) => ({
      id: "event-1",
      priority: input.priority ?? "normal",
      payload: input.payload,
      status: input.status ?? "pending",
      attemptCount: input.attemptCount ?? 0,
      createdAt: "2024-01-11T00:00:00.000Z",
      updatedAt: "2024-01-11T00:00:00.000Z",
      syncVersion: 1,
      syncedAt: null,
      ...input,
    }));

    setBudgetService({
      getBudgets: vi.fn().mockResolvedValue([budget]),
      getBudget: vi.fn(),
      addBudget: vi.fn(),
      updateBudget: vi.fn(),
      deleteBudget: vi.fn(),
      getNotificationEvents: vi.fn().mockResolvedValue([]),
      enqueueNotificationEvent: enqueueMock,
      updateNotificationEventStatus: vi.fn(),
    });
    setTransactionService({
      getTransactions: vi.fn().mockResolvedValue([]),
      addTransaction: vi.fn(),
      updateTransaction: vi.fn().mockResolvedValue(updated),
      deleteTransaction: vi.fn(),
      importTransactions: vi.fn(),
      createTransfer: vi.fn(),
      updateTransfer: vi.fn(),
      deleteTransfer: vi.fn(),
      getTransferPair: vi.fn(),
    });

    useSpendingStore.setState({
      transactions: [
        makeBudgetTransaction({
          id: "tx-1",
          amount: -1000,
          expense: 1000,
          date: "2024-01-05",
          yearMonth: "2024-01",
          month: 1,
        }),
        original,
      ],
      accounts: [account],
      analyzer: new MoneyInsightAnalyzer([]),
      isDbReady: true,
    });

    await useSpendingStore.getState().updateTransaction(updated);

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock.mock.calls[0][0].dedupeKey).toBe(
      "money-insight:budget_overrun:budget-1:2024-01-01:worsened:tx-2",
    );
    expect(enqueueMock.mock.calls[0][0].payload?.reason).toBe("worsened");
  });

  it("keeps transaction success when budget event enqueue fails", async () => {
    const created = makeBudgetTransaction({
      id: "tx-2",
      amount: -1200,
      expense: 1200,
      date: "2024-01-10",
      yearMonth: "2024-01",
      month: 1,
      updatedAt: "2024-01-10T00:00:00.000Z",
    });
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    setBudgetService({
      getBudgets: vi.fn().mockResolvedValue([budget]),
      getBudget: vi.fn(),
      addBudget: vi.fn(),
      updateBudget: vi.fn(),
      deleteBudget: vi.fn(),
      getNotificationEvents: vi.fn().mockResolvedValue([]),
      enqueueNotificationEvent: vi
        .fn()
        .mockRejectedValue(new Error("notification unavailable")),
      updateNotificationEventStatus: vi.fn(),
    });
    setTransactionService({
      getTransactions: vi.fn().mockResolvedValue([]),
      addTransaction: vi.fn().mockResolvedValue(created),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      importTransactions: vi.fn(),
      createTransfer: vi.fn(),
      updateTransfer: vi.fn(),
      deleteTransfer: vi.fn(),
      getTransferPair: vi.fn(),
    });

    useSpendingStore.setState({
      transactions: [],
      accounts: [account],
      analyzer: new MoneyInsightAnalyzer([]),
      isDbReady: true,
    });

    await expect(
      useSpendingStore.getState().addTransaction({
        note: "",
        amount: -1200,
        category: "Food",
        account: "Cash",
        currency: "VND",
        date: "2024-01-10",
        excludeReport: false,
        source: "manual",
      }),
    ).resolves.toMatchObject({ id: "tx-2" });
    expect(useSpendingStore.getState().transactions).toHaveLength(1);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe("spendingStore.refreshAnalysis", () => {
  beforeEach(() => {
    useSpendingStore.getState().reset();
    resetServices();
    useCategoryGroupStore.setState({
      categories: [],
      groups: [],
      mappings: [],
      lookupMap: new Map(),
      isLoaded: true,
      isLoading: false,
      error: null,
    });
  });

  it("keeps excludeReport transactions visible in filteredTransactions", () => {
    const transfer = makeTransferPair(
      "txfr-003",
      "Cash",
      "Bank",
      100_000,
      "2024-01-15",
    );
    const normalTransaction: Transaction = {
      id: "manual-1",
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

    useSpendingStore.setState({
      ...useSpendingStore.getState(),
      ...((transactions: Transaction[]) => {
        const processedTransactions = transactions.map((tx) => ({
          id: parseInt(tx.id) || 0,
          note: tx.note,
          amount: tx.amount,
          category: tx.category,
          account: tx.account,
          currency: tx.currency,
          date: new Date(tx.date),
          event: tx.event,
          excludeReport: tx.excludeReport,
          expense: tx.expense,
          income: tx.income,
          yearMonth: tx.yearMonth,
          year: tx.year,
          month: tx.month,
          monthName: new Date(tx.date).toLocaleString("default", {
            month: "long",
          }),
        }));
        return {
          transactions,
          processedTransactions,
          analyzer: new MoneyInsightAnalyzer(
            processedTransactions.filter((t: { excludeReport: boolean }) => !t.excludeReport),
          ),
        };
      })([normalTransaction, transfer.outgoing, transfer.incoming]),
      filter: {
        dateRange: null,
        categories: [],
        accounts: ["Cash"],
        search: "",
      },
    });

    useSpendingStore.getState().refreshAnalysis();

    const filtered = useSpendingStore.getState().filteredTransactions;
    expect(filtered.map((t) => t.id)).toEqual(["manual-1", "txfr-003-out"]);
    expect(useSpendingStore.getState().statistics?.transactionCount).toBe(1);
  });

  it("includes account initialBalance in walletBalances", () => {
    const transaction: Transaction = {
      id: "manual-2",
      amount: 50_000,
      expense: 0,
      income: 50_000,
      account: "Savings",
      category: "Income",
      note: "Top up",
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
    const processedTransactions = [transaction].map((tx) => ({
      id: parseInt(tx.id) || 0,
      note: tx.note,
      amount: tx.amount,
      category: tx.category,
      account: tx.account,
      currency: tx.currency,
      date: new Date(tx.date),
      event: tx.event,
      excludeReport: tx.excludeReport,
      expense: tx.expense,
      income: tx.income,
      yearMonth: tx.yearMonth,
      year: tx.year,
      month: tx.month,
      monthName: new Date(tx.date).toLocaleString("default", {
        month: "long",
      }),
    }));

    useSpendingStore.setState({
      ...useSpendingStore.getState(),
      transactions: [transaction],
      processedTransactions,
      accounts: [
        {
          id: "acc-1",
          name: "Savings",
          initialBalance: 100_000,
          currency: "VND",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          syncVersion: 1,
          syncedAt: null,
        },
      ],
      analyzer: new MoneyInsightAnalyzer(processedTransactions),
      filter: {
        dateRange: null,
        categories: [],
        accounts: [],
        search: "",
      },
    });

    useSpendingStore.getState().refreshAnalysis();

    expect(useSpendingStore.getState().walletBalances).toEqual([
      {
        account: "Savings",
        balance: 150_000,
        totalIncome: 50_000,
        totalExpense: 0,
      },
    ]);
  });
});
