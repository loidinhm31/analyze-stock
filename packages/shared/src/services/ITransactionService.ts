import type {
  Transaction,
  NewTransaction,
  TransactionFilter,
  ImportResult,
} from "../types";

export interface ITransactionService {
  getTransactions(filter?: TransactionFilter): Promise<Transaction[]>;
  addTransaction(tx: NewTransaction): Promise<Transaction>;
  updateTransaction(tx: Transaction): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  importTransactions(
    transactions: NewTransaction[],
    filename: string,
  ): Promise<ImportResult>;
}
