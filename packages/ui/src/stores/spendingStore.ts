import { create } from "zustand";
import type {
  Transaction,
  NewTransaction,
  Account,
  NewAccount,
  FilterState,
  CategorySpending,
  MonthlyAnalysis,
  YearlyAnalysis,
  SpendingBottleneck,
  ProcessedTransaction,
  MonthlyReport,
  TransferParams,
} from "@money-insight/ui/types";
import {
  buildBudgetOverrunEvent,
  matchesSearch,
  MoneyInsightAnalyzer,
  previewBudgetUsageWithTransaction,
} from "@money-insight/ui/lib";
import * as transactionService from "@money-insight/ui/services/transactionService";
import * as accountService from "@money-insight/ui/services/accountService";
import * as balanceAdjustmentService from "@money-insight/ui/services/balanceAdjustmentService";
import { isDebtManagedTransaction } from "@money-insight/ui/services/debtService";
import {
  isTransferTransaction,
  reconstructTransferParams,
} from "@money-insight/ui/services/transferService";
import { useCategoryGroupStore } from "./categoryGroupStore";

// Convert Transaction (from DB) to ProcessedTransaction (for analysis)
function toProcessedTransaction(tx: Transaction): ProcessedTransaction {
  return {
    id: parseInt(tx.id) || 0, // Old interface uses number id
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
    monthName: new Date(tx.date).toLocaleString("default", { month: "long" }),
  };
}

function buildAnalyzerState(transactions: Transaction[]) {
  const processedTransactions = transactions.map(toProcessedTransaction);
  const reportableTransactions = processedTransactions.filter(
    (t) => !t.excludeReport,
  );
  const analyzer = new MoneyInsightAnalyzer(reportableTransactions);
  return { transactions, processedTransactions, analyzer };
}

async function refreshDebtStoreForTransaction(tx?: Transaction): Promise<void> {
  if (!tx || !isDebtManagedTransaction(tx)) return;

  const { useDebtStore } = await import("@money-insight/ui/stores/debtStore");
  const debtStore = useDebtStore.getState();
  if (debtStore.isDbReady) {
    await debtStore.loadDebts();
    if (debtStore.selectedDebtId) {
      await debtStore.loadSettlements(debtStore.selectedDebtId);
    }
  }
}

async function refreshBudgetStoreForTransactionChange(
  beforeTransactions: Transaction[],
  afterTransactions: Transaction[],
  draftTransaction: Transaction,
  originalTransaction?: Transaction,
): Promise<void> {
  const { useBudgetStore } = await import("@money-insight/ui/stores/budgetStore");
  const budgetStore = useBudgetStore.getState();

  if (!budgetStore.isDbReady) {
    await budgetStore.loadBudgets();
  }

  const resolveCategoryName = useCategoryGroupStore.getState().resolveParent;
  const activeBudgets = useBudgetStore
    .getState()
    .budgets.filter((budget) => budget.status === "active");

  for (const budget of activeBudgets) {
    const preview = previewBudgetUsageWithTransaction(
      budget,
      beforeTransactions,
      draftTransaction,
      originalTransaction,
      { resolveCategoryName },
    );

    if (!preview.crossedOverBudget && !preview.worsenedOverBudget) {
      continue;
    }

    try {
      await useBudgetStore.getState().enqueueBudgetEvent(
        buildBudgetOverrunEvent(
          budget,
          preview.after,
          draftTransaction,
          preview.crossedOverBudget ? "crossed" : "worsened",
        ),
      );
    } catch (error) {
      console.error("[money-insight] failed to enqueue budget notification", error);
    }
  }

  await useBudgetStore.getState().refreshUsage(afterTransactions);
}

interface Statistics {
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  avgTransaction: number;
  transactionCount: number;
  categoryCount: number;
  accountCount: number;
  dateRange: { start: Date | undefined; end: Date | undefined };
}

interface WalletBalance {
  account: string;
  balance: number;
  totalIncome: number;
  totalExpense: number;
}

interface SpendingStore {
  // Data
  transactions: Transaction[];
  processedTransactions: ProcessedTransaction[];
  accounts: Account[];
  analyzer: MoneyInsightAnalyzer | null;

  // Filter state
  filter: FilterState;

  // Cached analysis
  statistics: Statistics | null;
  filteredTransactions: Transaction[];
  categorySpending: CategorySpending[];
  monthlyAnalysis: MonthlyAnalysis[];
  yearlyAnalysis: YearlyAnalysis[];
  bottlenecks: SpendingBottleneck[];
  walletBalances: WalletBalance[];
  currentMonthReport: MonthlyReport | null;

  // Selected items for drill-down
  selectedCategory: string | null;
  selectedMonth: string | null;
  selectedYear: number | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  isDbReady: boolean;
  valuesHidden: boolean;

  // Actions
  initFromDatabase: () => Promise<void>;
  addTransaction: (tx: NewTransaction) => Promise<Transaction>;
  updateTransaction: (tx: Transaction) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  importFromCSV: (
    transactions: NewTransaction[],
    filename: string,
  ) => Promise<void>;
  loadTransactions: (transactions: ProcessedTransaction[]) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  clearFilter: () => void;
  selectCategory: (category: string | null) => void;
  selectMonth: (month: string | null) => void;
  selectYear: (year: number | null) => void;
  refreshAnalysis: () => void;
  reset: () => void;
  toggleValuesHidden: () => void;

  // Account actions
  addAccount: (account: NewAccount) => Promise<Account>;
  updateAccount: (account: Account) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;

  // Balance adjustment actions
  adjustBalance: (
    accountName: string,
    targetBalance: number,
    date: string,
  ) => Promise<Transaction>;
  recalculateAdjustmentsForAccount: (accountName: string) => Promise<void>;

  // Transfer actions
  createTransfer: (
    params: TransferParams,
  ) => Promise<{ outgoing: Transaction; incoming: Transaction }>;
  updateTransfer: (
    transferId: string,
    params: TransferParams,
  ) => Promise<{ outgoing: Transaction; incoming: Transaction }>;
  deleteTransfer: (transferId: string) => Promise<void>;
}

const initialFilter: FilterState = {
  dateRange: null,
  categories: [],
  accounts: [],
  search: "",
};

export const useSpendingStore = create<SpendingStore>()((set, get) => ({
  // Initial state
  transactions: [],
  processedTransactions: [],
  accounts: [],
  analyzer: null,
  filter: initialFilter,
  statistics: null,
  filteredTransactions: [],
  categorySpending: [],
  monthlyAnalysis: [],
  yearlyAnalysis: [],
  bottlenecks: [],
  walletBalances: [],
  currentMonthReport: null,
  selectedCategory: null,
  selectedMonth: null,
  selectedYear: null,
  isLoading: false,
  error: null,
  isDbReady: false,
  valuesHidden: false,

  // Initialize from database
  initFromDatabase: async () => {
    set({ isLoading: true, error: null });

    try {
      // All 3 must complete before refreshAnalysis() reads categoryGroupStore.lookupMap
      const [transactions, accounts] = await Promise.all([
        transactionService.getTransactions(),
        accountService.getAccounts(),
        useCategoryGroupStore.getState().loadFromDatabase(), // void — awaited for side-effect
      ]);
      set({
        ...buildAnalyzerState(transactions),
        accounts,
        isLoading: false,
        isDbReady: true,
      });

      get().refreshAnalysis();
    } catch (error) {
      console.error("Failed to initialize from database:", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load data",
        isDbReady: false,
      });
    }
  },

  // Add a new transaction
  addTransaction: async (tx) => {
    set({ isLoading: true });

    try {
      const previousTransactions = get().transactions;
      const transaction = await transactionService.addTransaction(tx);
      let transactions = [...get().transactions, transaction];

      // Sync accounts: IndexedDBTransactionAdapter auto-creates missing accounts in DB;
      // reload if the transaction's account isn't already in store state.
      const existingAccount = get().accounts.find((a) => a.name === tx.account);
      if (!existingAccount && tx.account?.trim()) {
        const freshAccounts = await accountService.getAccounts();
        set({ accounts: freshAccounts });
      }

      // Recalculate adjustments for the affected account
      const account =
        existingAccount ?? get().accounts.find((a) => a.name === tx.account);
      if (account) {
        const updatedAdjs = balanceAdjustmentService.recalculateAdjustments(
          transactions,
          account,
        );
        // Update adjustment transactions in DB and local state
        for (const adj of updatedAdjs) {
          await transactionService.updateTransaction(adj);
          transactions = transactions.map((t) => (t.id === adj.id ? adj : t));
        }
      }

      set({ ...buildAnalyzerState(transactions), isLoading: false });
      get().refreshAnalysis();
      await refreshBudgetStoreForTransactionChange(
        previousTransactions,
        transactions,
        transaction,
      );
      return transaction;
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to add transaction",
      });
      throw error;
    }
  },

  // Update an existing transaction
  updateTransaction: async (tx) => {
    // Auto-escalate: transfer legs must always be updated as a pair
    const storedTx = get().transactions.find((t) => t.id === tx.id);
    if (storedTx && isTransferTransaction(storedTx) && storedTx.transferId) {
      // `pair` includes the stale stored version of tx.id. reconstructTransferParams
      // merges `tx` on top of the stored leg, so the caller's updated fields win.
      const pair = get().transactions.filter(
        (t) => t.transferId === storedTx.transferId,
      );
      const params = reconstructTransferParams(tx, pair);
      if (params) {
        const { outgoing, incoming } = await get().updateTransfer(
          storedTx.transferId,
          params,
        );
        return tx.id === outgoing.id ? outgoing : incoming;
      }
      // Pair incomplete in store (corrupted sync state) — fall through to single-leg
      // update so the edit is not silently dropped. Dev adapter guard will log a warning.
      console.warn(
        `[money-insight] updateTransaction: transfer pair incomplete for transferId=${storedTx.transferId}. Updating single leg id=${tx.id}.`,
      );
    }

    set({ isLoading: true });

    try {
      const previousTransactions = get().transactions;
      const updated = await transactionService.updateTransaction(tx);
      let transactions = get().transactions.map((t) =>
        t.id === updated.id ? updated : t,
      );

      // Recalculate adjustments for the affected account
      // Skip if this is an adjustment being updated (to avoid infinite loop)
      if (!balanceAdjustmentService.isAdjustmentTransaction(updated)) {
        const account = get().accounts.find((a) => a.name === tx.account);
        if (account) {
          const updatedAdjs = balanceAdjustmentService.recalculateAdjustments(
            transactions,
            account,
          );
          for (const adj of updatedAdjs) {
            await transactionService.updateTransaction(adj);
            transactions = transactions.map((t) => (t.id === adj.id ? adj : t));
          }
        }
      }

      set({ ...buildAnalyzerState(transactions), isLoading: false });
      get().refreshAnalysis();
      await refreshBudgetStoreForTransactionChange(
        previousTransactions,
        transactions,
        updated,
        storedTx,
      );
      return updated;
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update transaction",
      });
      throw error;
    }
  },

  // Delete a transaction
  deleteTransaction: async (id) => {
    // If it's a transfer leg, delete both sides atomically via deleteTransfer
    const tx = get().transactions.find((t) => t.id === id);
    if (tx && isTransferTransaction(tx) && tx.transferId) {
      return get().deleteTransfer(tx.transferId);
    }

    set({ isLoading: true });

    try {
      // Get the transaction before deleting to know which account to recalculate
      const deletedTx = get().transactions.find((t) => t.id === id);
      await transactionService.deleteTransaction(id);
      if (deletedTx && isDebtManagedTransaction(deletedTx)) {
        await refreshDebtStoreForTransaction(deletedTx);
        await get().initFromDatabase();
        return;
      }

      let transactions = get().transactions.filter((t) => t.id !== id);

      // Recalculate adjustments for the affected account
      if (
        deletedTx &&
        !balanceAdjustmentService.isAdjustmentTransaction(deletedTx)
      ) {
        const account = get().accounts.find(
          (a) => a.name === deletedTx.account,
        );
        if (account) {
          const updatedAdjs = balanceAdjustmentService.recalculateAdjustments(
            transactions,
            account,
          );
          for (const adj of updatedAdjs) {
            await transactionService.updateTransaction(adj);
            transactions = transactions.map((t) => (t.id === adj.id ? adj : t));
          }
        }
      }

      set({ ...buildAnalyzerState(transactions), isLoading: false });
      get().refreshAnalysis();
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete transaction",
      });
      throw error;
    }
  },

  // Import transactions from CSV
  importFromCSV: async (transactions, filename) => {
    set({ isLoading: true });

    try {
      const result = await transactionService.importTransactions(
        transactions,
        filename,
      );
      console.log(
        `Imported ${result.importedCount} transactions, skipped ${result.skippedCount}`,
      );

      // Reload all transactions from database
      await get().initFromDatabase();
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to import transactions",
      });
      throw error;
    }
  },

  // Legacy method for backward compatibility with existing CSV import flow
  loadTransactions: (transactions) => {
    const reportableTransactions = transactions.filter((t) => !t.excludeReport);
    const analyzer = new MoneyInsightAnalyzer(reportableTransactions);
    set({
      processedTransactions: transactions,
      analyzer,
      isLoading: false,
      error: null,
    });
    get().refreshAnalysis();
  },

  // Update filter
  setFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    }));
    get().refreshAnalysis();
  },

  // Clear all filters
  clearFilter: () => {
    set({ filter: initialFilter });
    get().refreshAnalysis();
  },

  // Select category for drill-down
  selectCategory: (category) => {
    set({ selectedCategory: category });
  },

  // Select month for drill-down
  selectMonth: (month) => {
    set({ selectedMonth: month });
  },

  // Select year for drill-down
  selectYear: (year) => {
    set({ selectedYear: year });
  },

  // Refresh all analysis
  refreshAnalysis: () => {
    const { analyzer, filter, transactions, accounts } = get();
    if (!analyzer) return;

    set({ isLoading: true });

    try {
      const filteredProcessed = analyzer.filterTransactions(filter);
      const statistics = analyzer.getStatistics(filteredProcessed);

      // Get category lookup map from category group store
      const { lookupMap } = useCategoryGroupStore.getState();

      // Use grouped analysis if mappings exist, otherwise flat
      const categorySpending =
        lookupMap.size > 0
          ? analyzer.analyzeCategorySpendingGrouped(
              filteredProcessed,
              lookupMap,
            )
          : analyzer.analyzeCategorySpending(filteredProcessed);
      const monthlyAnalysis = analyzer.analyzeMonthly(filteredProcessed);
      const yearlyAnalysis = analyzer.analyzeYearly(filteredProcessed);
      const bottlenecks =
        lookupMap.size > 0
          ? analyzer.detectBottlenecksGrouped(filteredProcessed, lookupMap)
          : analyzer.detectBottlenecks(filteredProcessed);

      // Filter Transaction[] for display (same logic as analyzer.filterTransactions),
      // but keep excludeReport transactions visible in account/transaction history.
      let filteredTransactions = [...transactions];
      if (filter.dateRange) {
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = new Date(t.date);
          return (
            date >= filter.dateRange!.startDate &&
            date <= filter.dateRange!.endDate
          );
        });
      }
      if (filter.categories.length > 0) {
        filteredTransactions = filteredTransactions.filter((t) =>
          filter.categories.includes(t.category),
        );
      }
      if (filter.accounts.length > 0) {
        filteredTransactions = filteredTransactions.filter((t) =>
          filter.accounts.includes(t.account),
        );
      }
      if (filter.search?.trim()) {
        filteredTransactions = filteredTransactions.filter((t) =>
          matchesSearch(t, filter.search!),
        );
      }

      // Calculate wallet balances using ALL transactions (not filtered, not excludeReport-filtered).
      // Transfer legs are intentionally included: an outgoing transfer reduces fromAccount balance
      // and the incoming leg increases toAccount balance, correctly reflecting actual money movement.
      const walletMap = new Map<
        string,
        { initialBalance: number; totalIncome: number; totalExpense: number }
      >();
      for (const account of accounts) {
        walletMap.set(account.name, {
          initialBalance: account.initialBalance,
          totalIncome: 0,
          totalExpense: 0,
        });
      }
      for (const tx of transactions) {
        const current = walletMap.get(tx.account) || {
          initialBalance: 0,
          totalIncome: 0,
          totalExpense: 0,
        };
        walletMap.set(tx.account, {
          initialBalance: current.initialBalance,
          totalIncome: current.totalIncome + tx.income,
          totalExpense: current.totalExpense + tx.expense,
        });
      }
      const walletBalances: WalletBalance[] = Array.from(walletMap.entries())
        .map(([account, data]) => ({
          account,
          balance: data.initialBalance + data.totalIncome - data.totalExpense,
          totalIncome: data.totalIncome,
          totalExpense: data.totalExpense,
        }))
        .sort((a, b) => b.balance - a.balance);

      // Calculate current month report
      const currentMonthReport = analyzer.getMonthlyReport();

      set({
        statistics,
        filteredTransactions,
        categorySpending,
        monthlyAnalysis,
        yearlyAnalysis,
        bottlenecks,
        walletBalances,
        currentMonthReport,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  },

  // Reset everything
  reset: () => {
    set({
      transactions: [],
      processedTransactions: [],
      accounts: [],
      analyzer: null,
      filter: initialFilter,
      statistics: null,
      filteredTransactions: [],
      categorySpending: [],
      monthlyAnalysis: [],
      yearlyAnalysis: [],
      bottlenecks: [],
      walletBalances: [],
      currentMonthReport: null,
      selectedCategory: null,
      selectedMonth: null,
      selectedYear: null,
      isLoading: false,
      error: null,
      isDbReady: false,
    });
  },

  // Toggle values visibility
  toggleValuesHidden: () => {
    set((state) => ({ valuesHidden: !state.valuesHidden }));
  },

  // Add a new account
  addAccount: async (account) => {
    set({ isLoading: true });

    try {
      const newAccount = await accountService.addAccount(account);
      set((state) => ({
        accounts: [...state.accounts, newAccount],
        isLoading: false,
      }));
      return newAccount;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to add account",
      });
      throw error;
    }
  },

  // Update an existing account
  updateAccount: async (account) => {
    set({ isLoading: true });

    try {
      const updated = await accountService.updateAccount(account);
      set((state) => ({
        accounts: state.accounts.map((a) =>
          a.id === updated.id ? updated : a,
        ),
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to update account",
      });
      throw error;
    }
  },

  // Delete an account
  deleteAccount: async (id) => {
    set({ isLoading: true });

    try {
      await accountService.deleteAccount(id);
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to delete account",
      });
      throw error;
    }
  },

  // Adjust balance for an account
  adjustBalance: async (accountName, targetBalance, date) => {
    set({ isLoading: true });

    try {
      const { transactions, accounts } = get();
      const account = accounts.find((a) => a.name === accountName);
      if (!account) {
        throw new Error(`Account "${accountName}" not found`);
      }

      // Calculate current balance at the adjustment date
      const currentBalance = balanceAdjustmentService.getBalanceAtDate(
        transactions,
        account,
        date,
      );

      // Create adjustment transaction
      const adjustmentData = balanceAdjustmentService.createAdjustment(
        accountName,
        targetBalance,
        date,
        account.currency,
        currentBalance,
      );

      // Add the adjustment transaction
      const transaction =
        await transactionService.addTransaction(adjustmentData);
      const newTransactions = [...transactions, transaction];
      set({ ...buildAnalyzerState(newTransactions), isLoading: false });
      get().refreshAnalysis();
      return transaction;
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to adjust balance",
      });
      throw error;
    }
  },

  // Create a transfer between two accounts
  createTransfer: async (params) => {
    set({ isLoading: true });

    try {
      const { outgoing, incoming } =
        await transactionService.createTransfer(params);
      const knownAccountNames = new Set(get().accounts.map((a) => a.name));
      if (
        !knownAccountNames.has(params.fromAccount) ||
        !knownAccountNames.has(params.toAccount)
      ) {
        const freshAccounts = await accountService.getAccounts();
        set({ accounts: freshAccounts });
      }
      set((state) => ({
        ...buildAnalyzerState([...state.transactions, outgoing, incoming]),
        isLoading: false,
      }));
      get().refreshAnalysis();
      return { outgoing, incoming };
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to create transfer",
      });
      throw error;
    }
  },

  // Update both legs of a transfer atomically
  updateTransfer: async (transferId, params) => {
    set({ isLoading: true });

    try {
      const { outgoing, incoming } = await transactionService.updateTransfer(
        transferId,
        params,
      );
      const knownAccountNames = new Set(get().accounts.map((a) => a.name));
      if (
        !knownAccountNames.has(params.fromAccount) ||
        !knownAccountNames.has(params.toAccount)
      ) {
        const freshAccounts = await accountService.getAccounts();
        set({ accounts: freshAccounts });
      }

      set((state) => ({
        ...buildAnalyzerState(
          state.transactions.map((t) => {
            if (t.id === outgoing.id) return outgoing;
            if (t.id === incoming.id) return incoming;
            return t;
          }),
        ),
        isLoading: false,
      }));
      get().refreshAnalysis();
      return { outgoing, incoming };
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to update transfer",
      });
      throw error;
    }
  },

  // Delete both legs of a transfer atomically
  deleteTransfer: async (transferId) => {
    set({ isLoading: true });

    try {
      await transactionService.deleteTransfer(transferId);
      set((state) => ({
        ...buildAnalyzerState(
          state.transactions.filter((t) => t.transferId !== transferId),
        ),
        isLoading: false,
      }));
      get().refreshAnalysis();
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to delete transfer",
      });
      throw error;
    }
  },

  // Recalculate adjustments for a specific account
  recalculateAdjustmentsForAccount: async (accountName) => {
    const { transactions, accounts } = get();
    const account = accounts.find((a) => a.name === accountName);
    if (!account) return;

    const updatedAdjs = balanceAdjustmentService.recalculateAdjustments(
      transactions,
      account,
    );

    if (updatedAdjs.length === 0) return;

    set({ isLoading: true });

    try {
      let updatedTransactions = [...transactions];

      for (const adj of updatedAdjs) {
        await transactionService.updateTransaction(adj);
        updatedTransactions = updatedTransactions.map((t) =>
          t.id === adj.id ? adj : t,
        );
      }

      set({ ...buildAnalyzerState(updatedTransactions), isLoading: false });
      get().refreshAnalysis();
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to recalculate adjustments",
      });
      throw error;
    }
  },
}));
