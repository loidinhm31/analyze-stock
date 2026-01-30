import type {
  Transaction,
  NewTransaction,
  TransactionFilter,
  ImportResult,
} from "@/types";

/**
 * Transaction service interface
 */
export interface ITransactionService {
  /**
   * Get transactions with optional filter
   */
  getTransactions(filter?: TransactionFilter): Promise<Transaction[]>;

  /**
   * Add a new transaction
   */
  addTransaction(tx: NewTransaction): Promise<Transaction>;

  /**
   * Update an existing transaction
   */
  updateTransaction(tx: Transaction): Promise<Transaction>;

  /**
   * Delete a transaction
   */
  deleteTransaction(id: string): Promise<void>;

  /**
   * Import transactions from CSV
   */
  importTransactions(
    transactions: NewTransaction[],
    filename: string,
  ): Promise<ImportResult>;
}
