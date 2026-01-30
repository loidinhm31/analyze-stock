import Dexie, { type EntityTable, type Table } from "dexie";
import type {
  Transaction,
  Category,
  Account,
  ImportBatch,
} from "@/types";

export interface SyncMeta {
  key: string;
  value: string;
}

export interface PendingChange {
  id?: number;
  tableName: string;
  rowId: string;
  operation: "create" | "update" | "delete";
  data: Record<string, unknown>;
  version: number;
  createdAt: number;
}

export class SpendingAnalyzerDatabase extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  accounts!: EntityTable<Account, "id">;
  importBatches!: EntityTable<ImportBatch, "id">;
  _syncMeta!: Table<SyncMeta, string>;
  _pendingChanges!: Table<PendingChange, number>;

  constructor() {
    super("SpendingAnalyzerDB");

    this.version(1).stores({
      transactions:
        "id, category, account, date, year_month, year, month, source, import_batch_id",
      categories: "id, name",
      accounts: "id, name",
      importBatches: "id, filename, imported_at",
      _syncMeta: "key",
      _pendingChanges: "++id, tableName, rowId",
    });

    this.transactions = this.table("transactions");
    this.categories = this.table("categories");
    this.accounts = this.table("accounts");
    this.importBatches = this.table("importBatches");
    this._syncMeta = this.table("_syncMeta");
    this._pendingChanges = this.table("_pendingChanges");
  }
}

export const db = new SpendingAnalyzerDatabase();

export function generateId(): string {
  return crypto.randomUUID();
}

export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
