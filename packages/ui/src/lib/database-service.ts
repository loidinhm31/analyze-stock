import {
  getTransactionService,
  getCategoryService,
  getAccountService,
  getStatisticsService,
} from "@/adapters";
import type {
  Transaction,
  NewTransaction,
  TransactionFilter,
  Category,
  Account,
  Statistics,
  ImportResult,
} from "@/types";

/**
 * Database service facade that abstracts platform-specific implementations.
 * Uses the ServiceFactory to get the appropriate adapter (Tauri or HTTP).
 */
export const databaseService = {
  /**
   * Get transactions with optional filter
   */
  getTransactions: async (
    filter?: TransactionFilter,
  ): Promise<Transaction[]> => {
    return getTransactionService().getTransactions(filter);
  },

  /**
   * Add a new transaction
   */
  addTransaction: async (tx: NewTransaction): Promise<Transaction> => {
    return getTransactionService().addTransaction(tx);
  },

  /**
   * Update an existing transaction
   */
  updateTransaction: async (tx: Transaction): Promise<Transaction> => {
    return getTransactionService().updateTransaction(tx);
  },

  /**
   * Delete a transaction
   */
  deleteTransaction: async (id: string): Promise<void> => {
    return getTransactionService().deleteTransaction(id);
  },

  /**
   * Import transactions from CSV
   */
  importTransactions: async (
    transactions: NewTransaction[],
    filename: string,
  ): Promise<ImportResult> => {
    return getTransactionService().importTransactions(transactions, filename);
  },

  /**
   * Get all categories
   */
  getCategories: async (): Promise<Category[]> => {
    return getCategoryService().getCategories();
  },

  /**
   * Get all accounts
   */
  getAccounts: async (): Promise<Account[]> => {
    return getAccountService().getAccounts();
  },

  /**
   * Get statistics with optional filter
   */
  getStatistics: async (filter?: TransactionFilter): Promise<Statistics> => {
    return getStatisticsService().getStatistics(filter);
  },
};
