import Dexie, { type EntityTable, type Table } from "dexie";
import type {
  Transaction,
  Category,
  Account,
  ImportBatch,
  CategoryGroup,
  CategoryMapping,
} from "@money-insight/ui/types";

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

export class MoneyInsightDatabase extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  accounts!: EntityTable<Account, "id">;
  importBatches!: EntityTable<ImportBatch, "id">;
  categoryGroups!: EntityTable<CategoryGroup, "id">;
  categoryMappings!: EntityTable<CategoryMapping, "id">;
  _syncMeta!: Table<SyncMeta, string>;
  _pendingChanges!: Table<PendingChange, number>;

  constructor(dbName = "MoneyInsightDB") {
    super(dbName);

    this.version(1).stores({
      transactions:
        "id, category, account, date, yearMonth, year, month, source, importBatchId, transferId, syncVersion, syncedAt",
      categories: "id, name, syncVersion, syncedAt",
      accounts: "id, name, accountType, currency, syncVersion, syncedAt",
      importBatches: "id, filename, importedAt",
      categoryGroups: "id, name, syncVersion, syncedAt",
      categoryMappings: "id, subCategory, parentGroupId, syncVersion, syncedAt",
      _syncMeta: "key",
      _pendingChanges: "++id, tableName, rowId",
    });

    this.transactions = this.table("transactions");
    this.categories = this.table("categories");
    this.accounts = this.table("accounts");
    this.importBatches = this.table("importBatches");
    this.categoryGroups = this.table("categoryGroups");
    this.categoryMappings = this.table("categoryMappings");
    this._syncMeta = this.table("_syncMeta");
    this._pendingChanges = this.table("_pendingChanges");
  }

  async getSyncMeta(key: string): Promise<string | undefined> {
    const record = await this._syncMeta.get(key);
    return record?.value;
  }

  async setSyncMeta(key: string, value: string): Promise<void> {
    await this._syncMeta.put({ key, value });
  }

  async deleteSyncMeta(key: string): Promise<void> {
    await this._syncMeta.delete(key);
  }
}

// =============================================================================
// Per-user DB management
// =============================================================================

let _db: MoneyInsightDatabase | null = null;
let _currentUserId: string | null = null;

async function hashUserId(userId: string): Promise<string> {
  const encoded = new TextEncoder().encode(userId);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

/**
 * Initialize (or reinitialize) the DB for a specific user.
 * If userId is undefined (standalone mode), uses the legacy "MoneyInsightDB" name.
 * Calling with the same userId is a no-op.
 */
export async function initDb(userId?: string): Promise<MoneyInsightDatabase> {
  if (!userId) {
    // Standalone fallback: legacy singleton name preserves existing behavior.
    // If currently open for a user, close it first.
    if (!_db || _currentUserId !== null) {
      if (_db) _db.close();
      _db = new MoneyInsightDatabase("MoneyInsightDB");
      _currentUserId = null;
    }
    return _db;
  }
  if (_db && _currentUserId === userId) return _db;
  if (_db) _db.close();
  const prefix = await hashUserId(userId);
  _db = new MoneyInsightDatabase(`MoneyInsightDB_${prefix}`);
  _currentUserId = userId;
  return _db;
}

/** Returns the active DB instance. Throws if initDb() has not been called. */
export function getDb(): MoneyInsightDatabase {
  if (!_db)
    throw new Error("MoneyInsightDB not initialized. Call initDb() first.");
  return _db;
}

/** Close and delete the current user's IndexedDB. Used on logout. */
export async function deleteCurrentDb(): Promise<void> {
  if (_db) {
    const name = _db.name;
    _db.close();
    await Dexie.delete(name);
    _db = null;
    _currentUserId = null;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export const SYNC_META_KEYS = {
  CHECKPOINT: "checkpoint",
  LAST_SYNC_AT: "lastSyncAt",
} as const;
