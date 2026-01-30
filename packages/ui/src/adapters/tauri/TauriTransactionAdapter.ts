import { invoke } from "@tauri-apps/api/core";
import type { ITransactionService } from "@/adapters/interfaces";
import type {
  Transaction,
  NewTransaction,
  TransactionFilter,
  ImportResult,
} from "@/types";

/**
 * Tauri adapter for transaction operations using invoke() calls
 */
export class TauriTransactionAdapter implements ITransactionService {
  async getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    return invoke("get_transactions", { filter });
  }

  async addTransaction(transaction: NewTransaction): Promise<Transaction> {
    return invoke("add_transaction", { transaction });
  }

  async updateTransaction(transaction: Transaction): Promise<Transaction> {
    return invoke("update_transaction", { transaction });
  }

  async deleteTransaction(id: string): Promise<void> {
    return invoke("delete_transaction", { id });
  }

  async importTransactions(
    transactions: NewTransaction[],
    filename: string,
  ): Promise<ImportResult> {
    return invoke("import_transactions", { transactions, filename });
  }
}
