import type { IndexableType } from "dexie";
import type {
  Checkpoint,
  PullRecord,
  SyncRecord,
} from "@money-insight/shared/types";
import {
  assertDebtType,
  assertPositiveAmount,
  assertTransactionSource,
  deleteRemoteDebtAndLinkedTransactions,
  deleteRemoteSettlementAndLinkedTransaction,
  getDb,
  getCurrentTimestamp,
  SYNC_META_KEYS,
  reconcileDebtFromSettlements,
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
            transferId: tx.transferId,
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
            initialBalance: acc.initialBalance,
            currency: acc.currency,
            createdAt: acc.createdAt,
            updatedAt: acc.updatedAt,
          },
          version: acc.syncVersion || 1,
          deleted: false,
        });
      }
    }

    const debts = await getDb().debts.toArray();
    for (const debt of debts) {
      if (debt.syncedAt === undefined || debt.syncedAt === null) {
        records.push({
          tableName: "debts",
          rowId: debt.id,
          data: {
            name: debt.name,
            debtType: debt.debtType,
            counterpartyName: debt.counterpartyName,
            description: debt.description,
            initialTransactionId: debt.initialTransactionId,
            accountId: debt.accountId,
            currency: debt.currency,
            principalAmount: debt.principalAmount,
            settledAmount: debt.settledAmount,
            remainingAmount: debt.remainingAmount,
            isCompleted: debt.isCompleted,
            originatedAt: debt.originatedAt,
            dueDate: debt.dueDate,
            completedAt: debt.completedAt,
            createdAt: debt.createdAt,
            updatedAt: debt.updatedAt,
          },
          version: debt.syncVersion || 1,
          deleted: false,
        });
      }
    }

    const debtSettlements = await getDb().debtSettlements.toArray();
    for (const settlement of debtSettlements) {
      if (settlement.syncedAt === undefined || settlement.syncedAt === null) {
        records.push({
          tableName: "debtSettlements",
          rowId: settlement.id,
          data: {
            debtId: settlement.debtId,
            transactionId: settlement.transactionId,
            accountId: settlement.accountId,
            amount: settlement.amount,
            settledAt: settlement.settledAt,
            note: settlement.note,
            createdAt: settlement.createdAt,
            updatedAt: settlement.updatedAt,
          },
          version: settlement.syncVersion || 1,
          deleted: false,
        });
      }
    }

    const budgets = await getDb().budgets.toArray();
    for (const budget of budgets) {
      if (budget.syncedAt === undefined || budget.syncedAt === null) {
        records.push({
          tableName: "budgets",
          rowId: budget.id,
          data: {
            name: budget.name,
            amount: budget.amount,
            currency: budget.currency,
            categoryNames: budget.categoryNames,
            accountNames: budget.accountNames,
            firstCycleStartDate: budget.firstCycleStartDate,
            status: budget.status,
            createdAt: budget.createdAt,
            updatedAt: budget.updatedAt,
          },
          version: budget.syncVersion || 1,
          deleted: false,
        });
      }
    }

    const notificationEvents = await getDb().notificationEvents.toArray();
    for (const event of notificationEvents) {
      if (event.syncedAt === undefined || event.syncedAt === null) {
        records.push({
          tableName: "notificationEvents",
          rowId: event.id,
          data: {
            eventType: event.eventType,
            title: event.title,
            body: event.body,
            priority: event.priority,
            payload: event.payload,
            dedupeKey: event.dedupeKey,
            status: event.status,
            triggeredAt: event.triggeredAt,
            sentAt: event.sentAt,
            attemptCount: event.attemptCount,
            lastError: event.lastError,
            sourceTable: event.sourceTable,
            sourceRowId: event.sourceRowId,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
          },
          version: event.syncVersion || 1,
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
    const tables = [
      "transactions",
      "categories",
      "accounts",
      "debts",
      "debtSettlements",
      "budgets",
      "notificationEvents",
    ];
    for (const tableName of tables) {
      const count = await this.countUnsyncedRecords(tableName);
      if (count > 0) return true;
    }
    return false;
  }

  async getPendingChangesCount(): Promise<number> {
    let count = 0;
    const tables = [
      "transactions",
      "categories",
      "accounts",
      "debts",
      "debtSettlements",
      "budgets",
      "notificationEvents",
    ] as const;
    for (const tableName of tables) {
      count += await this.countUnsyncedRecords(tableName);
    }

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
      [
        getDb()._pendingChanges,
        getDb().transactions,
        getDb().categories,
        getDb().accounts,
        getDb().debts,
        getDb().debtSettlements,
        getDb().budgets,
        getDb().notificationEvents,
      ],
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
      [
        getDb().transactions,
        getDb().categories,
        getDb().accounts,
        getDb().debts,
        getDb().debtSettlements,
        getDb().budgets,
        getDb().notificationEvents,
      ],
      async () => {
        const debtIdsToReconcile = new Set<string>();

        for (const record of nonDeleted) {
          await this.upsertRecord(record, now);
          if (record.tableName === "debts") {
            debtIdsToReconcile.add(record.rowId);
          }
          if (record.tableName === "debtSettlements") {
            const debtId = (record.data as { debtId?: string }).debtId;
            if (debtId) debtIdsToReconcile.add(debtId);
          }
        }
        for (const record of deleted) {
          const deletedDebtId = await this.deleteRecord(record);
          if (record.tableName === "debts") {
            debtIdsToReconcile.delete(record.rowId);
          }
          if (deletedDebtId) {
            debtIdsToReconcile.add(deletedDebtId);
          }
        }

        for (const debtId of debtIdsToReconcile) {
          await reconcileDebtFromSettlements(debtId);
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

    const normalizedTransactionSource =
      record.tableName === "transactions"
        ? typeof (record.data as { source?: unknown }).source === "string"
          ? (record.data as { source: string }).source
          : "manual"
        : undefined;

    if (normalizedTransactionSource) {
      assertTransactionSource(normalizedTransactionSource);
    }

    if (record.tableName === "debts") {
      const debtType = (record.data as { debtType?: unknown }).debtType;
      if (typeof debtType !== "string") {
        throw new Error("Debt type is required");
      }
      assertDebtType(debtType);
    }

    if (record.tableName === "debtSettlements") {
      const amount = (record.data as { amount?: unknown }).amount;
      if (typeof amount !== "number") {
        throw new Error("Settlement amount is required");
      }
      assertPositiveAmount(amount);
    }

    const data: Record<string, unknown> = {
      ...(record.data as any),
      ...(normalizedTransactionSource
        ? { source: normalizedTransactionSource }
        : {}),
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

  private async deleteRecord(record: PullRecord): Promise<string | undefined> {
    const table = this.getTable(record.tableName);
    if (!table) return undefined;

    if (record.tableName === "debtSettlements") {
      return deleteRemoteSettlementAndLinkedTransaction(record.rowId);
    }

    if (record.tableName === "transactions") {
      const initializedDebt = await getDb().debts
        .where("initialTransactionId")
        .equals(record.rowId)
        .first();
      if (initializedDebt) {
        await deleteRemoteDebtAndLinkedTransactions(initializedDebt.id);
        return undefined;
      }

      const settlement = await getDb().debtSettlements
        .where("transactionId")
        .equals(record.rowId)
        .first();
      if (settlement) {
        return deleteRemoteSettlementAndLinkedTransaction(settlement.id);
      }
    }

    if (record.tableName === "debts") {
      await deleteRemoteDebtAndLinkedTransactions(record.rowId);
      return undefined;
    }

    await table.delete(record.rowId);
    return undefined;
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

  private async countUnsyncedRecords(tableName: string): Promise<number> {
    const table = this.getTable(tableName);
    if (!table) {
      return 0;
    }

    return table
      .where("syncedAt")
      .equals(null as unknown as IndexableType)
      .count();
  }

  private getTable(tableName: string) {
    switch (tableName) {
      case "transactions":
        return getDb().transactions;
      case "categories":
        return getDb().categories;
      case "accounts":
        return getDb().accounts;
      case "debts":
        return getDb().debts;
      case "debtSettlements":
        return getDb().debtSettlements;
      case "budgets":
        return getDb().budgets;
      case "notificationEvents":
        return getDb().notificationEvents;
      default:
        return undefined;
    }
  }

  private getTableOrder(tableName: string): number {
    switch (tableName) {
      case "categories":
      case "accounts":
        return 0;
      case "budgets":
        return 1;
      case "debts":
        return 2;
      case "transactions":
      case "debtSettlements":
        return 3;
      case "notificationEvents":
        return 4;
      default:
        return 99;
    }
  }
}
