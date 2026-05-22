import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { MoneyInsightDatabase } from "./database";

class MoneyInsightDatabaseV3 extends Dexie {
  constructor(dbName: string) {
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

    this.version(2).stores({
      transactions:
        "id, category, account, date, yearMonth, year, month, source, importBatchId, transferId, syncVersion, syncedAt",
      categories: "id, name, syncVersion, syncedAt",
      accounts: "id, name, accountType, currency, syncVersion, syncedAt",
      importBatches: "id, filename, importedAt",
      categoryGroups: "id, name, syncVersion, syncedAt",
      categoryMappings: "id, subCategory, parentGroupId, syncVersion, syncedAt",
      debts:
        "id, debtType, counterpartyName, accountId, currency, originatedAt, dueDate, isCompleted, syncVersion, syncedAt",
      debtSettlements:
        "id, &transactionId, debtId, accountId, settledAt, syncVersion, syncedAt, [debtId+transactionId], [debtId+settledAt]",
      _syncMeta: "key",
      _pendingChanges: "++id, tableName, rowId",
    });

    this.version(3).stores({
      transactions:
        "id, category, account, date, yearMonth, year, month, source, importBatchId, transferId, syncVersion, syncedAt",
      categories: "id, name, syncVersion, syncedAt",
      accounts: "id, name, accountType, currency, syncVersion, syncedAt",
      importBatches: "id, filename, importedAt",
      categoryGroups: "id, name, syncVersion, syncedAt",
      categoryMappings: "id, subCategory, parentGroupId, syncVersion, syncedAt",
      debts:
        "id, debtType, counterpartyName, accountId, currency, originatedAt, dueDate, isCompleted, initialTransactionId, syncVersion, syncedAt",
      debtSettlements:
        "id, &transactionId, debtId, accountId, settledAt, syncVersion, syncedAt, [debtId+transactionId], [debtId+settledAt]",
      _syncMeta: "key",
      _pendingChanges: "++id, tableName, rowId",
    });
  }
}

const dbNames: string[] = [];

describe("MoneyInsightDatabase migrations", () => {
  afterEach(async () => {
    await Promise.all(
      dbNames.splice(0).map(async (name) => {
        await Dexie.delete(name);
      }),
    );
  });

  it("upgrades a v3 database to v4 without losing existing data", async () => {
    const dbName = `MoneyInsightMigrationTest_${crypto.randomUUID()}`;
    dbNames.push(dbName);

    const legacyDb = new MoneyInsightDatabaseV3(dbName);
    await legacyDb.open();
    await legacyDb.table("accounts").add({
      id: "account-1",
      name: "Wallet",
      accountType: "Cash",
      currency: "VND",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      syncVersion: 1,
      syncedAt: 100,
    });
    await legacyDb.table("transactions").add({
      id: "tx-1",
      source: "manual",
      note: "Lunch",
      amount: -10,
      category: "Food",
      account: "Wallet",
      currency: "VND",
      date: "2024-01-02",
      excludeReport: false,
      expense: 10,
      income: 0,
      yearMonth: "2024-01",
      year: 2024,
      month: 1,
      createdAt: "2024-01-02T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      syncVersion: 1,
      syncedAt: 100,
    });
    legacyDb.close();

    const upgradedDb = new MoneyInsightDatabase(dbName);
    await upgradedDb.open();

    expect(await upgradedDb.accounts.get("account-1")).toMatchObject({
      id: "account-1",
      name: "Wallet",
      currency: "VND",
    });
    expect(await upgradedDb.transactions.get("tx-1")).toMatchObject({
      id: "tx-1",
      category: "Food",
      account: "Wallet",
    });

    await upgradedDb.budgets.add({
      id: "budget-1",
      name: "Food budget",
      amount: 500,
      currency: "VND",
      categoryNames: ["Food"],
      accountNames: [],
      firstCycleStartDate: "2024-01-01",
      status: "active",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      syncVersion: 1,
      syncedAt: null,
    });
    await upgradedDb.notificationEvents.add({
      id: "event-1",
      eventType: "budget_overrun",
      title: "Budget exceeded",
      body: "Food budget exceeded",
      priority: "high",
      payload: { budgetId: "budget-1" },
      dedupeKey: "budget-1:2024-01",
      status: "pending",
      triggeredAt: "2024-01-10T00:00:00.000Z",
      attemptCount: 0,
      sourceTable: "transactions",
      sourceRowId: "tx-1",
      createdAt: "2024-01-10T00:00:00.000Z",
      updatedAt: "2024-01-10T00:00:00.000Z",
      syncVersion: 1,
      syncedAt: null,
    });

    expect(await upgradedDb.budgets.get("budget-1")).toMatchObject({
      id: "budget-1",
      categoryNames: ["Food"],
    });
    expect(await upgradedDb.notificationEvents.get("event-1")).toMatchObject({
      id: "event-1",
      eventType: "budget_overrun",
      dedupeKey: "budget-1:2024-01",
    });

    upgradedDb.close();
  });
});
