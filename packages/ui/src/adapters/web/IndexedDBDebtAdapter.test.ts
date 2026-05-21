import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBDebtAdapter } from "./IndexedDBDebtAdapter";

const {
  mockDb,
  addTransactionMock,
  reconcileDebtFromSettlementsMock,
  reconcileDebtByTransactionIdMock,
  trackDeleteMock,
  deleteDebtSettlementByIdMock,
  deleteDebtWithSettlementsMock,
  generateIdMock,
} = vi.hoisted(() => ({
  mockDb: {
    debts: {
      toArray: vi.fn(),
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    debtSettlements: {
      where: vi.fn(),
      add: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    },
    transactions: {
      get: vi.fn(),
      delete: vi.fn(),
    },
    accounts: {},
    _pendingChanges: {},
    transaction: vi.fn(),
  },
  addTransactionMock: vi.fn(),
  reconcileDebtFromSettlementsMock: vi.fn(),
  reconcileDebtByTransactionIdMock: vi.fn(),
  trackDeleteMock: vi.fn(),
  deleteDebtSettlementByIdMock: vi.fn(),
  deleteDebtWithSettlementsMock: vi.fn(),
  generateIdMock: vi.fn(),
}));

vi.mock("./database", () => ({
  getDb: () => mockDb,
  generateId: generateIdMock,
}));

vi.mock("./indexedDbHelpers", () => ({
  assertDebtType: vi.fn(),
  assertPositiveAmount: vi.fn(),
  buildDebtInitializationTransactionAmount: vi.fn((debt: { debtType: string; principalAmount: number }) =>
    debt.debtType === "payable" ? debt.principalAmount : -debt.principalAmount,
  ),
  buildDebtInitializationTransactionNote: vi.fn(() => "Debt borrowed: Loan"),
  buildDebtSettlementTransactionAmount: vi.fn((debtType: string, amount: number) =>
    debtType === "payable" ? -amount : amount,
  ),
  buildDebtSettlementTransactionNote: vi.fn(() => "Debt payment: Loan"),
  deleteDebtSettlementById: deleteDebtSettlementByIdMock,
  deleteDebtWithSettlements: deleteDebtWithSettlementsMock,
  getDebtInitializationCategory: vi.fn((debtType: string) =>
    debtType === "payable" ? "Debt Borrowed" : "Debt Lent",
  ),
  getDebtSettlementCategory: vi.fn((debtType: string) =>
    debtType === "payable" ? "Debt Payment" : "Debt Collection",
  ),
  reconcileDebtFromSettlements: reconcileDebtFromSettlementsMock,
  reconcileDebtByTransactionId: reconcileDebtByTransactionIdMock,
  recomputeDebt: vi.fn(() => ({
    settledAmount: 30,
    remainingAmount: 70,
    isCompleted: false,
    completedAt: undefined,
  })),
  trackDelete: trackDeleteMock,
}));

vi.mock("./IndexedDBTransactionAdapter", () => ({
  IndexedDBTransactionAdapter: class {
    addTransaction = addTransactionMock;
  },
}));

describe("IndexedDBDebtAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateIdMock.mockReset();
    generateIdMock.mockReturnValue("generated-id");
    mockDb.debts.toArray.mockResolvedValue([]);
    mockDb.debts.get.mockResolvedValue(undefined);
    mockDb.debtSettlements.where.mockImplementation((field: string) => ({
      equals: (value: string) => ({
        toArray: vi.fn().mockResolvedValue(
          field === "debtId" && value === "debt-1"
            ? [
                {
                  id: "settlement-2",
                  debtId: "debt-1",
                  transactionId: "tx-2",
                  accountId: "Wallet",
                  amount: 20,
                  settledAt: "2024-01-03",
                  syncVersion: 1,
                },
              ]
            : [],
        ),
        first: vi.fn().mockResolvedValue(undefined),
      }),
    }));
    mockDb.debtSettlements.get.mockResolvedValue(undefined);
    mockDb.transaction.mockImplementation(
      async (
        _mode: unknown,
        ...args: Array<unknown>
      ) => {
        const callback = args[args.length - 1] as () => Promise<unknown>;
        return callback();
      },
    );
    addTransactionMock.mockResolvedValue({ id: "tx-initial" });
  });

  it("creates payable debts with a positive initialization transaction", async () => {
    generateIdMock.mockReturnValueOnce("debt-1");
    const adapter = new IndexedDBDebtAdapter();
    const debt = await adapter.createDebt({
      name: "Loan",
      debtType: "payable",
      counterpartyName: "Alice",
      accountId: "Wallet",
      currency: "VND",
      principalAmount: 100,
      originatedAt: "2024-01-01",
    });

    expect(debt.settledAmount).toBe(0);
    expect(debt.remainingAmount).toBe(100);
    expect(debt.isCompleted).toBe(false);
    expect(debt.initialTransactionId).toBe("tx-initial");
    expect(addTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "debt_initialization",
        amount: 100,
        category: "Debt Borrowed",
        account: "Wallet",
        date: "2024-01-01",
      }),
    );
    expect(mockDb.debts.add).toHaveBeenCalledWith(
      expect.objectContaining({ id: "debt-1", initialTransactionId: "tx-initial" }),
    );
  });

  it("creates receivable debts with a negative initialization transaction", async () => {
    generateIdMock.mockReturnValueOnce("debt-1");
    const adapter = new IndexedDBDebtAdapter();
    await adapter.createDebt({
      name: "Loan",
      debtType: "receivable",
      counterpartyName: "Alice",
      accountId: "Wallet",
      currency: "VND",
      principalAmount: 100,
      originatedAt: "2024-01-01",
    });

    expect(addTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "debt_initialization",
        amount: -100,
        category: "Debt Lent",
      }),
    );
  });

  it("creates a settlement after creating the real transaction", async () => {
    generateIdMock.mockReturnValueOnce("settlement-1");
    mockDb.debts.get.mockResolvedValue({
      id: "debt-1",
      name: "Loan",
      debtType: "payable",
      counterpartyName: "Alice",
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
      syncedAt: null,
    });
    addTransactionMock.mockResolvedValue({ id: "tx-1" });

    const adapter = new IndexedDBDebtAdapter();
    const settlement = await adapter.addSettlement("debt-1", {
      accountId: "Wallet",
      amount: 30,
      settledAt: "2024-01-02",
      note: "first payment",
    });

    expect(addTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "debt_settlement",
        amount: -30,
        account: "Wallet",
        date: "2024-01-02",
      }),
    );
    expect(mockDb.debtSettlements.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "settlement-1",
        debtId: "debt-1",
        transactionId: "tx-1",
        amount: 30,
      }),
    );
    expect(reconcileDebtFromSettlementsMock).toHaveBeenCalledWith("debt-1");
    expect(settlement.transactionId).toBe("tx-1");
  });

  it("rejects duplicate settlement transaction links", async () => {
    mockDb.debts.get.mockResolvedValue({
      id: "debt-1",
      name: "Loan",
      debtType: "payable",
      counterpartyName: "Alice",
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
      syncedAt: null,
    });
    addTransactionMock.mockResolvedValue({ id: "tx-1" });
    mockDb.debtSettlements.where.mockImplementation((field: string) => ({
      equals: (value: string) => ({
        toArray: vi.fn().mockResolvedValue([]),
        first: vi.fn().mockResolvedValue(
          field === "transactionId" && value === "tx-1"
            ? {
                id: "settlement-existing",
                debtId: "debt-2",
                transactionId: "tx-1",
              }
            : undefined,
        ),
      }),
    }));

    const adapter = new IndexedDBDebtAdapter();

    await expect(
      adapter.addSettlement("debt-1", {
        accountId: "Wallet",
        amount: 30,
        settledAt: "2024-01-02",
      }),
    ).rejects.toThrow("Settlement transaction already linked");

    expect(mockDb.debtSettlements.add).not.toHaveBeenCalled();
  });

  it("deletes linked settlement and recomputes when transaction is reconciled", async () => {
    const adapter = new IndexedDBDebtAdapter();
    await adapter.reconcileDebtByTransactionId("tx-1");
    expect(reconcileDebtByTransactionIdMock).toHaveBeenCalledWith("tx-1");
  });

  it("delegates settlement deletion to helper flow", async () => {
    const adapter = new IndexedDBDebtAdapter();
    await adapter.deleteSettlement("settlement-1");
    expect(deleteDebtSettlementByIdMock).toHaveBeenCalledWith("settlement-1");
  });

  it("delegates debt deletion to helper flow", async () => {
    const adapter = new IndexedDBDebtAdapter();
    await adapter.deleteDebt("debt-1");
    expect(deleteDebtWithSettlementsMock).toHaveBeenCalledWith("debt-1");
  });
});
