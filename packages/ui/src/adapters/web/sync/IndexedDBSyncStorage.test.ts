import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBSyncStorage } from "./IndexedDBSyncStorage";

const { mockDb, reconcileDebtFromSettlementsMock } = vi.hoisted(() => ({
  mockDb: {
    transactions: {
      toArray: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    categories: {
      toArray: vi.fn(),
    },
    accounts: {
      toArray: vi.fn(),
    },
    debts: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    debtSettlements: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    _pendingChanges: {
      filter: vi.fn(),
    },
    transaction: vi.fn(),
  },
  reconcileDebtFromSettlementsMock: vi.fn(),
}));

vi.mock("@money-insight/ui/adapters/web", async () => {
  const actual = await vi.importActual<
    typeof import("@money-insight/ui/adapters/web")
  >("@money-insight/ui/adapters/web");

  return {
    ...actual,
    deleteRemoteDebtAndLinkedTransactions: vi.fn(async (debtId: string) => {
      const debt = await mockDb.debts.get(debtId);
      if (debt?.initialTransactionId) {
        await mockDb.transactions.delete(debt.initialTransactionId);
      }
      const settlements = await mockDb.debtSettlements
        .where("debtId")
        .equals(debtId)
        .toArray();
      for (const settlement of settlements) {
        await mockDb.debtSettlements.delete(settlement.id);
        await mockDb.transactions.delete(settlement.transactionId);
      }
      await mockDb.debts.delete(debtId);
    }),
    deleteRemoteSettlementAndLinkedTransaction: vi.fn(async (settlementId: string) => {
      const settlement = await mockDb.debtSettlements.get(settlementId);
      if (!settlement) return undefined;
      await mockDb.debtSettlements.delete(settlementId);
      await mockDb.transactions.delete(settlement.transactionId);
      return settlement.debtId;
    }),
    getDb: () => mockDb,
    getCurrentTimestamp: () => 123,
    SYNC_META_KEYS: {
      CHECKPOINT: "checkpoint",
      LAST_SYNC_AT: "lastSyncAt",
      CATEGORY_BACKFILL_V1: "categoryBackfillV1",
    },
    reconcileDebtFromSettlements: reconcileDebtFromSettlementsMock,
  };
});

describe("IndexedDBSyncStorage.getPendingChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transactions.toArray.mockResolvedValue([]);
    mockDb.categories.toArray.mockResolvedValue([]);
    mockDb.accounts.toArray.mockResolvedValue([]);
    mockDb.debts.toArray.mockResolvedValue([]);
    mockDb.debtSettlements.toArray.mockResolvedValue([]);
    mockDb.debts.where.mockReturnValue({
      equals: () => ({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    });
    mockDb.debtSettlements.where.mockReturnValue({
      equals: () => ({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    });
    mockDb._pendingChanges.filter.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    });
    mockDb.transaction.mockImplementation(
      async (_mode: unknown, _tables: unknown, callback: () => Promise<unknown>) => callback(),
    );
  });

  it("serializes unsynced accounts with the full server schema payload", async () => {
    mockDb.accounts.toArray.mockResolvedValue([
      {
        id: "account-1",
        name: "Wallet",
        accountType: "Cash",
        icon: "cash",
        initialBalance: 250000,
        currency: "VND",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        syncVersion: 7,
        syncedAt: null,
      },
    ]);

    const storage = new IndexedDBSyncStorage();
    const pendingChanges = await storage.getPendingChanges();

    expect(pendingChanges).toContainEqual({
      tableName: "accounts",
      rowId: "account-1",
      data: {
        name: "Wallet",
        accountType: "Cash",
        icon: "cash",
        initialBalance: 250000,
        currency: "VND",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
      version: 7,
      deleted: false,
    });
  });

  it("serializes unsynced transfer transactions with transferId", async () => {
    mockDb.transactions.toArray.mockResolvedValue([
      {
        id: "tx-transfer-out",
        source: "transfer",
        transferId: "transfer-1",
        note: '{"userNote":"Move savings","toAccount":"Savings"}',
        amount: -100,
        category: "__transfer__",
        account: "Wallet",
        currency: "VND",
        date: "2024-01-03",
        excludeReport: true,
        expense: 100,
        income: 0,
        yearMonth: "2024-01",
        year: 2024,
        month: 1,
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 2,
        syncedAt: null,
      },
    ]);

    const storage = new IndexedDBSyncStorage();
    const pendingChanges = await storage.getPendingChanges();

    expect(pendingChanges).toContainEqual({
      tableName: "transactions",
      rowId: "tx-transfer-out",
      data: expect.objectContaining({
        source: "transfer",
        transferId: "transfer-1",
      }),
      version: 2,
      deleted: false,
    });
  });

  it("serializes unsynced debts and settlements", async () => {
    mockDb.debts.toArray.mockResolvedValue([
      {
        id: "debt-1",
        name: "Loan",
        debtType: "payable",
        counterpartyName: "Alice",
        initialTransactionId: "tx-initial",
        accountId: "Wallet",
        currency: "VND",
        principalAmount: 100,
        settledAmount: 30,
        remainingAmount: 70,
        isCompleted: false,
        originatedAt: "2024-01-01",
        dueDate: "2024-02-01",
        completedAt: undefined,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        syncVersion: 2,
        syncedAt: null,
      },
    ]);
    mockDb.debtSettlements.toArray.mockResolvedValue([
      {
        id: "settlement-1",
        debtId: "debt-1",
        transactionId: "tx-1",
        accountId: "Wallet",
        amount: 30,
        settledAt: "2024-01-02",
        note: "first payment",
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        syncVersion: 3,
        syncedAt: null,
      },
    ]);

    const storage = new IndexedDBSyncStorage();
    const pendingChanges = await storage.getPendingChanges();

    expect(pendingChanges).toContainEqual({
      tableName: "debts",
      rowId: "debt-1",
      data: expect.objectContaining({
        debtType: "payable",
        initialTransactionId: "tx-initial",
        principalAmount: 100,
        settledAmount: 30,
      }),
      version: 2,
      deleted: false,
    });
    expect(pendingChanges).toContainEqual({
      tableName: "debtSettlements",
      rowId: "settlement-1",
      data: expect.objectContaining({
        debtId: "debt-1",
        transactionId: "tx-1",
        amount: 30,
      }),
      version: 3,
      deleted: false,
    });
  });

  it("removes linked transaction when remote settlement delete is applied", async () => {
    mockDb.debtSettlements.get.mockResolvedValue({
      id: "settlement-1",
      debtId: "debt-1",
      transactionId: "tx-1",
    });

    const storage = new IndexedDBSyncStorage();
    await storage.applyRemoteChanges([
      { tableName: "debtSettlements", rowId: "settlement-1", data: {}, version: 4, deleted: true, syncedAt: "2024-01-03T00:00:00.000Z" },
    ]);

    expect(mockDb.debtSettlements.delete).toHaveBeenCalledWith("settlement-1");
    expect(mockDb.transactions.delete).toHaveBeenCalledWith("tx-1");
    expect(reconcileDebtFromSettlementsMock).toHaveBeenCalledWith("debt-1");
  });

  it("removes initialization and settlement transactions when remote debt delete is applied", async () => {
    mockDb.debts.get.mockResolvedValue({
      id: "debt-1",
      initialTransactionId: "tx-initial",
    });
    mockDb.debtSettlements.where.mockReturnValue({
      equals: () => ({
        toArray: vi.fn().mockResolvedValue([
          {
            id: "settlement-1",
            debtId: "debt-1",
            transactionId: "tx-settlement",
          },
        ]),
      }),
    });

    const storage = new IndexedDBSyncStorage();
    await storage.applyRemoteChanges([
      { tableName: "debts", rowId: "debt-1", data: {}, version: 4, deleted: true, syncedAt: "2024-01-03T00:00:00.000Z" },
    ]);

    expect(mockDb.transactions.delete).toHaveBeenCalledWith("tx-initial");
    expect(mockDb.transactions.delete).toHaveBeenCalledWith("tx-settlement");
    expect(mockDb.debtSettlements.delete).toHaveBeenCalledWith("settlement-1");
    expect(mockDb.debts.delete).toHaveBeenCalledWith("debt-1");
  });

  it("defaults a missing remote transaction source to manual", async () => {
    const storage = new IndexedDBSyncStorage();

    await storage.applyRemoteChanges([
      {
        tableName: "transactions",
        rowId: "tx-legacy",
        data: {
          note: "Legacy",
          amount: -10,
          category: "Food",
          account: "Cash",
          currency: "VND",
          date: "2024-01-03",
          excludeReport: false,
          expense: 10,
          income: 0,
          yearMonth: "2024-01",
          year: 2024,
          month: 1,
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
        },
        version: 2,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
    ]);

    expect(mockDb.transactions.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "tx-legacy",
        source: "manual",
        syncVersion: 2,
      }),
    );
  });

  it("preserves transferId on remote transaction upsert", async () => {
    const storage = new IndexedDBSyncStorage();

    await storage.applyRemoteChanges([
      {
        tableName: "transactions",
        rowId: "tx-transfer-out",
        data: {
          source: "transfer",
          transferId: "transfer-1",
          note: '{"userNote":"Move savings","toAccount":"Savings"}',
          amount: -100,
          category: "__transfer__",
          account: "Wallet",
          currency: "VND",
          date: "2024-01-03",
          excludeReport: true,
          expense: 100,
          income: 0,
          yearMonth: "2024-01",
          year: 2024,
          month: 1,
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
        },
        version: 2,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
    ]);

    expect(mockDb.transactions.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "tx-transfer-out",
        source: "transfer",
        transferId: "transfer-1",
        syncVersion: 2,
      }),
    );
  });

  it("rejects invalid remote debt types", async () => {
    const storage = new IndexedDBSyncStorage();

    await expect(
      storage.applyRemoteChanges([
        {
          tableName: "debts",
          rowId: "debt-1",
          data: {
            name: "Loan",
            debtType: "loan",
            counterpartyName: "Alice",
            accountId: "Cash",
            currency: "VND",
            principalAmount: 100,
            settledAmount: 0,
            remainingAmount: 100,
            isCompleted: false,
            originatedAt: "2024-01-01",
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
          version: 1,
          deleted: false,
          syncedAt: "2024-01-03T00:00:00.000Z",
        },
      ]),
    ).rejects.toThrow("Invalid debt type");

    expect(mockDb.debts.put).not.toHaveBeenCalled();
  });
});
