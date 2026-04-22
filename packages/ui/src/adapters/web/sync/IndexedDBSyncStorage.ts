import type {
  Checkpoint,
  PullRecord,
  SyncRecord,
} from "@money-insight/shared/types";
import {
  getDb,
  getCurrentTimestamp,
  SYNC_META_KEYS,
} from "@money-insight/ui/adapters/web";

export class IndexedDBSyncStorage {
  async getPendingChanges(): Promise<SyncRecord[]> {
    const records: SyncRecord[] = [];

    // Unsynced transactions
    const transactions = await getDb().transactions.toArray();
    for (const tx of transactions) {
      if (tx.syncedAt === undefined || tx.syncedAt === null) {
        records.push({
          tableName: "transactions",
          rowId: tx.id,
          data: {
            source: tx.source,
            note: tx.note,
            amount: tx.amount,
            category: tx.category,
            account: tx.account,
            currency: tx.currency,
            date: tx.date,
            event: tx.event,
            excludeReport: tx.excludeReport,
            expense: tx.expense,
            income: tx.income,
            yearMonth: tx.yearMonth,
            year: tx.year,
            month: tx.month,
            createdAt: tx.createdAt,
            updatedAt: tx.updatedAt,
          },
          version: tx.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Unsynced categories
    const categories = await getDb().categories.toArray();
    for (const cat of categories) {
      if (cat.syncedAt === undefined || cat.syncedAt === null) {
        records.push({
          tableName: "categories",
          rowId: cat.id,
          data: {
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            isExpense: cat.isExpense,
          },
          version: cat.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Unsynced accounts
    const accounts = await getDb().accounts.toArray();
    for (const acc of accounts) {
      if (acc.syncedAt === undefined || acc.syncedAt === null) {
        records.push({
          tableName: "accounts",
          rowId: acc.id,
          data: {
            name: acc.name,
            accountType: acc.accountType,
            icon: acc.icon,
          },
          version: acc.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Pending deletes
    const pendingDeletes = await getDb()._pendingChanges
      .filter((change) => change.operation === "delete")
      .toArray();
    for (const change of pendingDeletes) {
      records.push({
        tableName: change.tableName,
        rowId: change.rowId,
        data: {},
        version: change.version,
        deleted: true,
      });
    }

    return records;
  }

  async hasPendingChanges(): Promise<boolean> {
    const pendingDeletes = await getDb()._pendingChanges
      .filter((c) => c.operation === "delete")
      .count();
    if (pendingDeletes > 0) return true;
    const tables = [getDb().transactions, getDb().categories, getDb().accounts];
    for (const table of tables) {
      const count = await table.filter((r) => r.syncedAt === undefined || r.syncedAt === null).count();
      if (count > 0) return true;
    }
    return false;
  }

  async getPendingChangesCount(): Promise<number> {
    let count = 0;

    const transactions = await getDb().transactions.toArray();
    count += transactions.filter(
      (t) => t.syncedAt === undefined || t.syncedAt === null,
    ).length;

    const categories = await getDb().categories.toArray();
    count += categories.filter(
      (c) => c.syncedAt === undefined || c.syncedAt === null,
    ).length;

    const accounts = await getDb().accounts.toArray();
    count += accounts.filter(
      (a) => a.syncedAt === undefined || a.syncedAt === null,
    ).length;

    count += await getDb()._pendingChanges
      .filter((change) => change.operation === "delete")
      .count();

    return count;
  }

  async markSynced(
    recordIds: Array<{ tableName: string; rowId: string }>,
  ): Promise<void> {
    const now = getCurrentTimestamp();

    await getDb().transaction(
      "rw",
      [getDb()._pendingChanges, getDb().transactions, getDb().categories, getDb().accounts],
      async () => {
        for (const { tableName, rowId } of recordIds) {
          await getDb()._pendingChanges.where({ tableName, rowId }).delete();

          const table = this.getTable(tableName);
          if (table) {
            const exists = await table.get(rowId);
            if (exists) {
              await table.update(rowId, { syncedAt: now });
            }
          }
        }
      },
    );
  }

  async applyRemoteChanges(records: PullRecord[]): Promise<void> {
    const now = getCurrentTimestamp();

    const nonDeleted = records.filter((r) => !r.deleted);
    const deleted = records.filter((r) => r.deleted);

    // All 3 tables are independent, but keep consistent ordering
    nonDeleted.sort(
      (a, b) =>
        this.getTableOrder(a.tableName) - this.getTableOrder(b.tableName),
    );
    deleted.sort(
      (a, b) =>
        this.getTableOrder(b.tableName) - this.getTableOrder(a.tableName),
    );

    await getDb().transaction(
      "rw",
      [getDb().transactions, getDb().categories, getDb().accounts],
      async () => {
        for (const record of nonDeleted) {
          await this.upsertRecord(record, now);
        }
        for (const record of deleted) {
          await this.deleteRecord(record);
        }
      },
    );
  }

  private async upsertRecord(
    record: PullRecord,
    syncedAt: number,
  ): Promise<void> {
    const table = this.getTable(record.tableName);
    if (!table) {
      console.warn(`Unknown table: ${record.tableName}`);
      return;
    }

    const data: Record<string, unknown> = {
      ...(record.data as any),
      id: record.rowId,
      syncVersion: record.version,
      syncedAt: syncedAt,
    };

    if (!data.createdAt) {
      data.createdAt = new Date(syncedAt * 1000).toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await table.put(data as any);
  }

  private async deleteRecord(record: PullRecord): Promise<void> {
    const table = this.getTable(record.tableName);
    if (!table) return;
    await table.delete(record.rowId);
  }

  async getCheckpoint(): Promise<Checkpoint | undefined> {
    const checkpointJson = await getDb().getSyncMeta(SYNC_META_KEYS.CHECKPOINT);
    if (!checkpointJson) return undefined;
    try {
      return JSON.parse(checkpointJson) as Checkpoint;
    } catch {
      return undefined;
    }
  }

  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    await getDb().setSyncMeta(SYNC_META_KEYS.CHECKPOINT, JSON.stringify(checkpoint));
  }

  async getLastSyncAt(): Promise<number | undefined> {
    const value = await getDb().getSyncMeta(SYNC_META_KEYS.LAST_SYNC_AT);
    return value ? parseInt(value, 10) : undefined;
  }

  async saveLastSyncAt(timestamp: number): Promise<void> {
    await getDb().setSyncMeta(SYNC_META_KEYS.LAST_SYNC_AT, timestamp.toString());
  }

  async clearPendingChanges(): Promise<void> {
    await getDb()._pendingChanges.clear();
  }

  private getTable(tableName: string) {
    switch (tableName) {
      case "transactions":
        return getDb().transactions;
      case "categories":
        return getDb().categories;
      case "accounts":
        return getDb().accounts;
      default:
        return undefined;
    }
  }

  private getTableOrder(tableName: string): number {
    switch (tableName) {
      case "categories":
      case "accounts":
        return 0;
      case "transactions":
        return 1;
      default:
        return 99;
    }
  }
}
