import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBTransactionAdapter } from "./IndexedDBTransactionAdapter";

const { mockDb, generateIdMock, deleteTransactionWithTrackingMock, reconcileDebtByTransactionIdMock } =
  vi.hoisted(() => ({
    mockDb: {
      transactions: {
        toArray: vi.fn(),
        toCollection: vi.fn(),
        add: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
      },
      debts: {},
      debtSettlements: {},
      accounts: {
        toArray: vi.fn(),
        add: vi.fn(),
      },
      _pendingChanges: {},
      transaction: vi.fn(),
    },
    generateIdMock: vi.fn(),
    deleteTransactionWithTrackingMock: vi.fn(),
    reconcileDebtByTransactionIdMock: vi.fn(),
  }));

vi.mock("./database", () => ({
  getDb: () => mockDb,
  generateId: generateIdMock,
}));

vi.mock("./indexedDbHelpers", async () => {
  const actual = await vi.importActual<
    typeof import("./indexedDbHelpers")
  >("./indexedDbHelpers");

  return {
    ...actual,
    deleteTransactionWithTracking: deleteTransactionWithTrackingMock,
    reconcileDebtByTransactionId: reconcileDebtByTransactionIdMock,
  };
});

describe("IndexedDBTransactionAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateIdMock.mockReset();
    generateIdMock.mockReturnValue("tx-1");
    mockDb.accounts.toArray.mockResolvedValue([]);
    mockDb.transactions.toArray.mockResolvedValue([]);
    mockDb.transactions.toCollection.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
    mockDb.transaction.mockImplementation(
      async (_mode: unknown, ...args: Array<unknown>) => {
        const callback = args[args.length - 1] as () => Promise<unknown>;
        return callback();
      },
    );
    mockDb.transactions.get.mockResolvedValue({
      id: "tx-1",
      source: "manual",
      note: "Lunch",
      amount: -120,
      category: "Food",
      account: "Cash",
      currency: "VND",
      date: "2024-01-02",
      excludeReport: false,
      expense: 120,
      income: 0,
      yearMonth: "2024-01",
      year: 2024,
      month: 1,
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      syncVersion: 1,
      syncedAt: null,
    });
  });

  it("defaults missing transaction source to manual", async () => {
    const adapter = new IndexedDBTransactionAdapter();
    const transaction = await adapter.addTransaction({
      note: "Lunch",
      amount: -120,
      category: "Food",
      account: "",
      currency: "VND",
      date: "2024-01-02",
      excludeReport: false,
    });

    expect(transaction.source).toBe("manual");
    expect(mockDb.transactions.add).toHaveBeenCalledWith(
      expect.objectContaining({ source: "manual" }),
    );
  });

  it("rejects invalid transaction sources before persisting", async () => {
    const adapter = new IndexedDBTransactionAdapter();

    await expect(
      adapter.addTransaction({
        note: "Lunch",
        amount: -120,
        category: "Food",
        account: "",
        currency: "VND",
        date: "2024-01-02",
        excludeReport: false,
        source: "sync_import" as never,
      }),
    ).rejects.toThrow("Invalid transaction source");

    await expect(
      adapter.updateTransaction({
        ...(await mockDb.transactions.get("tx-1")),
        source: "sync_import" as never,
      }),
    ).rejects.toThrow("Invalid transaction source");

    expect(mockDb.transactions.add).not.toHaveBeenCalled();
    expect(mockDb.transactions.put).not.toHaveBeenCalled();
  });

  it("reconciles debt links when deleting a transaction", async () => {
    const adapter = new IndexedDBTransactionAdapter();

    await adapter.deleteTransaction("tx-1");

    expect(deleteTransactionWithTrackingMock).toHaveBeenCalledWith("tx-1");
    expect(reconcileDebtByTransactionIdMock).toHaveBeenCalledWith("tx-1");
  });

  it("repairs legacy transfer pairs without transferId before returning transactions", async () => {
    const adapter = new IndexedDBTransactionAdapter();
    generateIdMock.mockReturnValue("transfer-repaired");

    const legacyOutgoing = {
      id: "tx-out",
      source: "transfer",
      note: JSON.stringify({ userNote: "Send to Savings", toAccount: "Savings" }),
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
      syncVersion: 1,
      syncedAt: 123,
    };
    const legacyIncoming = {
      id: "tx-in",
      source: "transfer",
      note: JSON.stringify({ userNote: "Receive from Wallet", fromAccount: "Wallet" }),
      amount: 100,
      category: "__transfer__",
      account: "Savings",
      currency: "VND",
      date: "2024-01-03",
      excludeReport: true,
      expense: 0,
      income: 100,
      yearMonth: "2024-01",
      year: 2024,
      month: 1,
      createdAt: "2024-01-03T00:00:01.000Z",
      updatedAt: "2024-01-03T00:00:01.000Z",
      syncVersion: 1,
      syncedAt: 123,
    };

    mockDb.transactions.toArray.mockResolvedValue([legacyOutgoing, legacyIncoming]);
    mockDb.transactions.toCollection.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { ...legacyOutgoing, transferId: "transfer-repaired" },
        { ...legacyIncoming, transferId: "transfer-repaired" },
      ]),
    });

    const transactions = await adapter.getTransactions();

    expect(mockDb.transactions.put).toHaveBeenCalledTimes(2);
    expect(mockDb.transactions.put).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: "tx-out",
        transferId: "transfer-repaired",
        syncVersion: 2,
        syncedAt: null,
      }),
    );
    expect(mockDb.transactions.put).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: "tx-in",
        transferId: "transfer-repaired",
        syncVersion: 2,
        syncedAt: null,
      }),
    );
    expect(transactions).toEqual([
      expect.objectContaining({ id: "tx-out", transferId: "transfer-repaired" }),
      expect.objectContaining({ id: "tx-in", transferId: "transfer-repaired" }),
    ]);
  });
});
