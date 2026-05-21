import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBTransactionAdapter } from "./IndexedDBTransactionAdapter";

const { mockDb, generateIdMock, deleteTransactionWithTrackingMock, reconcileDebtByTransactionIdMock } =
  vi.hoisted(() => ({
    mockDb: {
      transactions: {
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
});
