import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IndexedDBAccountAdapter } from "./IndexedDBAccountAdapter";
import { deleteCurrentDb, getDb, initDb } from "./database";

const account = {
  id: "account-wallet",
  name: "Wallet",
  accountType: "Cash",
  initialBalance: 0,
  currency: "VND",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  syncVersion: 1,
  syncedAt: 123,
};

afterEach(async () => {
  await deleteCurrentDb();
});

describe("IndexedDBAccountAdapter account rename transaction", () => {
  it("rolls back every write when a dependent record update fails", async () => {
    await initDb();
    const db = getDb();
    await db.accounts.add(account);
    await db.transactions.add({
      id: "tx-wallet",
      source: "manual",
      note: "Lunch",
      amount: -100,
      category: "Food",
      account: "Wallet",
      currency: "VND",
      date: "2024-01-02",
      excludeReport: false,
      expense: 100,
      income: 0,
      yearMonth: "2024-01",
      year: 2024,
      month: 1,
      createdAt: "2024-01-02T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      syncVersion: 1,
      syncedAt: 123,
    });
    await db.debts.add({
      id: "debt-1",
      name: "Loan",
      debtType: "payable",
      counterpartyName: "Alex",
      accountId: "Wallet",
      currency: "VND",
      principalAmount: 100,
      settledAmount: 0,
      remainingAmount: 100,
      isCompleted: false,
      originatedAt: "2024-01-01",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      syncVersion: 1,
      syncedAt: 123,
    });
    vi.spyOn(db.debts, "bulkPut").mockRejectedValueOnce(
      new Error("write failed"),
    );

    await expect(
      new IndexedDBAccountAdapter().updateAccount({
        ...account,
        name: "Main wallet",
      }),
    ).rejects.toThrow("write failed");

    expect(await db.accounts.get(account.id)).toMatchObject({
      name: "Wallet",
      syncVersion: 1,
    });
    expect(await db.transactions.get("tx-wallet")).toMatchObject({
      account: "Wallet",
      syncVersion: 1,
      syncedAt: 123,
    });
    expect(await db.debts.get("debt-1")).toMatchObject({
      accountId: "Wallet",
      syncVersion: 1,
      syncedAt: 123,
    });
  });
});
