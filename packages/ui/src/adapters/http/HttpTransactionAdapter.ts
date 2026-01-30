import { HttpAdapter } from "./HttpAdapter";
import type { ITransactionService } from "@/adapters/interfaces";
import type {
  Transaction,
  NewTransaction,
  TransactionFilter,
  ImportResult,
} from "@/types";

/**
 * HTTP adapter for transaction operations
 */
export class HttpTransactionAdapter
  extends HttpAdapter
  implements ITransactionService
{
  async getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    return this.get<Transaction[]>("/transactions", { filter });
  }

  async addTransaction(transaction: NewTransaction): Promise<Transaction> {
    return this.post<Transaction>("/transactions", transaction);
  }

  async updateTransaction(transaction: Transaction): Promise<Transaction> {
    return this.put<Transaction>("/transactions", transaction);
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.delete<void>(`/transactions/${id}`);
  }

  async importTransactions(
    transactions: NewTransaction[],
    filename: string,
  ): Promise<ImportResult> {
    return this.post<ImportResult>("/transactions/import", {
      transactions,
      filename,
    });
  }
}
