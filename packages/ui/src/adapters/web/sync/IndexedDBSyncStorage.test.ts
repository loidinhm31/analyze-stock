import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBSyncStorage } from "./IndexedDBSyncStorage";

const { mockDb, reconcileDebtFromSettlementsMock } = vi.hoisted(() => ({
  mockDb: {
    transactions: {
      toArray: vi.fn(),
      delete: vi.fn(),
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
    },
    debtSettlements: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      delete: vi.fn(),
    },
    _pendingChanges: {
      filter: vi.fn(),
    },
    transaction: vi.fn(),
  },
  reconcileDebtFromSettlementsMock: vi.fn(),
}));

vi.mock("@money-insight/ui/adapters/web", () => ({
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
}));

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

  it("serializes unsynced debts and settlements", async () => {
    mockDb.debts.toArray.mockResolvedValue([
      {
        id: "debt-1",
        name: "Loan",
        debtType: "payable",
        counterpartyName: "Alice",
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
});
