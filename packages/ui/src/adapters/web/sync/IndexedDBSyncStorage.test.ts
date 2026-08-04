import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBSyncStorage } from "./IndexedDBSyncStorage";

const {
  mockDb,
  reconcileDebtFromSettlementsMock,
  reconcileCreditCardPaymentReminderMock,
  reconcileCreditCardPaymentRemindersMock,
  removeCreditCardPaymentRemindersMock,
} = vi.hoisted(() => ({
  mockDb: {
    transactions: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      filter: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    categories: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      filter: vi.fn(),
      put: vi.fn(),
    },
    accounts: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      filter: vi.fn(),
      update: vi.fn(),
      put: vi.fn(),
    },
    debts: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      filter: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    debtSettlements: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      filter: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    budgets: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      filter: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    notificationEvents: {
      toArray: vi.fn(),
      get: vi.fn(),
      where: vi.fn(),
      filter: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    _pendingChanges: {
      filter: vi.fn(),
      where: vi.fn(),
    },
    transaction: vi.fn(),
  },
  reconcileDebtFromSettlementsMock: vi.fn(),
  reconcileCreditCardPaymentReminderMock: vi.fn(),
  reconcileCreditCardPaymentRemindersMock: vi.fn(),
  removeCreditCardPaymentRemindersMock: vi.fn(),
}));

vi.mock("../credit-card-payment-reminder-repository", () => ({
  reconcileCreditCardPaymentReminder: reconcileCreditCardPaymentReminderMock,
  reconcileCreditCardPaymentRemindersByAccountNames:
    reconcileCreditCardPaymentRemindersMock,
  removeCreditCardPaymentReminderEvents: removeCreditCardPaymentRemindersMock,
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
    deleteRemoteSettlementAndLinkedTransaction: vi.fn(
      async (settlementId: string) => {
        const settlement = await mockDb.debtSettlements.get(settlementId);
        if (!settlement) return undefined;
        await mockDb.debtSettlements.delete(settlementId);
        await mockDb.transactions.delete(settlement.transactionId);
        return settlement.debtId;
      },
    ),
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
    mockDb.budgets.toArray.mockResolvedValue([]);
    mockDb.notificationEvents.toArray.mockResolvedValue([]);
    mockDb.debts.where.mockReturnValue({
      equals: () => ({
        toArray: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      }),
    });
    mockDb.debtSettlements.where.mockReturnValue({
      equals: () => ({
        toArray: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      }),
    });
    mockDb.transactions.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
    });
    mockDb.categories.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
    });
    mockDb.accounts.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
    });
    mockDb.debts.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
    });
    mockDb.debtSettlements.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
    });
    mockDb.budgets.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
    });
    mockDb.notificationEvents.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
    });
    mockDb.transactions.get.mockResolvedValue(undefined);
    mockDb.categories.get.mockResolvedValue(undefined);
    mockDb.accounts.get.mockResolvedValue(undefined);
    mockDb.budgets.get.mockResolvedValue(undefined);
    mockDb.notificationEvents.get.mockResolvedValue(undefined);
    mockDb._pendingChanges.filter.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    });
    mockDb._pendingChanges.where.mockReturnValue({
      filter: vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue(1),
      }),
    });
    mockDb.transaction.mockImplementation(
      async (
        _mode: unknown,
        _tables: unknown,
        callback: () => Promise<unknown>,
      ) => callback(),
    );
  });

  it("serializes unsynced accounts with the full server schema payload", async () => {
    mockDb.accounts.toArray.mockResolvedValue([
      {
        id: "account-1",
        name: "Daily card",
        accountType: "Credit Card",
        icon: "card",
        initialBalance: -250000,
        currency: "VND",
        paymentDueDay: 31,
        paymentReminderEnabled: true,
        nextPaymentDueDate: "2026-02-28",
        lastPaymentConfirmedDueDate: "2026-01-31",
        lastPaymentConfirmedAt: "2026-01-10T02:00:00.000Z",
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
        name: "Daily card",
        accountType: "Credit Card",
        icon: "card",
        initialBalance: -250000,
        currency: "VND",
        paymentDueDay: 31,
        paymentReminderEnabled: true,
        nextPaymentDueDate: "2026-02-28",
        lastPaymentConfirmedDueDate: "2026-01-31",
        lastPaymentConfirmedAt: "2026-01-10T02:00:00.000Z",
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
    mockDb.debts.toArray.mockResolvedValue([
      {
        id: "debt-1",
        name: "Loan",
        debtType: "payable",
        counterpartyName: "Alex",
        accountId: "Main wallet",
        currency: "VND",
        principalAmount: 100,
        settledAmount: 0,
        remainingAmount: 100,
        isCompleted: false,
        originatedAt: "2024-01-03",
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 3,
        syncedAt: null,
      },
    ]);
    mockDb.debtSettlements.toArray.mockResolvedValue([
      {
        id: "settlement-1",
        debtId: "debt-1",
        transactionId: "tx-regular",
        accountId: "Main wallet",
        amount: 20,
        settledAt: "2024-01-03",
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 3,
        syncedAt: null,
      },
    ]);
    mockDb.budgets.toArray.mockResolvedValue([
      {
        id: "budget-1",
        name: "Wallet budget",
        amount: 500,
        currency: "VND",
        categoryNames: [],
        accountNames: ["Main wallet"],
        firstCycleStartDate: "2024-01-01",
        status: "active",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 3,
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

  it("exports a renamed account and every rewritten transaction", async () => {
    mockDb.accounts.toArray.mockResolvedValue([
      {
        id: "account-wallet",
        name: "Main wallet",
        initialBalance: 0,
        currency: "VND",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 4,
        syncedAt: null,
      },
    ]);
    mockDb.transactions.toArray.mockResolvedValue([
      {
        id: "tx-regular",
        source: "manual",
        note: "Lunch",
        amount: -100,
        category: "Food",
        account: "Main wallet",
        currency: "VND",
        date: "2024-01-03",
        excludeReport: false,
        expense: 100,
        income: 0,
        yearMonth: "2024-01",
        year: 2024,
        month: 1,
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 5,
        syncedAt: null,
      },
      {
        id: "tx-transfer-in",
        source: "transfer",
        transferId: "transfer-1",
        note: '{"userNote":"Move funds","fromAccount":"Main wallet"}',
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
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 5,
        syncedAt: null,
      },
    ]);
    mockDb.debts.toArray.mockResolvedValue([
      {
        id: "debt-1",
        name: "Loan",
        debtType: "payable",
        counterpartyName: "Alex",
        accountId: "Main wallet",
        currency: "VND",
        principalAmount: 100,
        settledAmount: 0,
        remainingAmount: 100,
        isCompleted: false,
        originatedAt: "2024-01-03",
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 3,
        syncedAt: null,
      },
    ]);
    mockDb.debtSettlements.toArray.mockResolvedValue([
      {
        id: "settlement-1",
        debtId: "debt-1",
        transactionId: "tx-regular",
        accountId: "Main wallet",
        amount: 20,
        settledAt: "2024-01-03",
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 3,
        syncedAt: null,
      },
    ]);
    mockDb.budgets.toArray.mockResolvedValue([
      {
        id: "budget-1",
        name: "Wallet budget",
        amount: 500,
        currency: "VND",
        categoryNames: [],
        accountNames: ["Main wallet"],
        firstCycleStartDate: "2024-01-01",
        status: "active",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
        syncVersion: 3,
        syncedAt: null,
      },
    ]);

    const pendingChanges = await new IndexedDBSyncStorage().getPendingChanges();

    expect(pendingChanges).toContainEqual(
      expect.objectContaining({
        tableName: "accounts",
        rowId: "account-wallet",
        version: 4,
      }),
    );
    expect(pendingChanges).toContainEqual(
      expect.objectContaining({
        tableName: "transactions",
        rowId: "tx-regular",
        data: expect.objectContaining({ account: "Main wallet" }),
        version: 5,
      }),
    );
    expect(pendingChanges).toContainEqual(
      expect.objectContaining({
        tableName: "transactions",
        rowId: "tx-transfer-in",
        data: expect.objectContaining({
          note: '{"userNote":"Move funds","fromAccount":"Main wallet"}',
        }),
        version: 5,
      }),
    );
    expect(pendingChanges).toContainEqual(
      expect.objectContaining({
        tableName: "debts",
        rowId: "debt-1",
        data: expect.objectContaining({ accountId: "Main wallet" }),
        version: 3,
      }),
    );
    expect(pendingChanges).toContainEqual(
      expect.objectContaining({
        tableName: "debtSettlements",
        rowId: "settlement-1",
        data: expect.objectContaining({ accountId: "Main wallet" }),
        version: 3,
      }),
    );
    expect(pendingChanges).toContainEqual(
      expect.objectContaining({
        tableName: "budgets",
        rowId: "budget-1",
        data: expect.objectContaining({ accountNames: ["Main wallet"] }),
        version: 3,
      }),
    );
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

  it("serializes unsynced budgets and notification events", async () => {
    mockDb.budgets.toArray.mockResolvedValue([
      {
        id: "budget-1",
        name: "Food budget",
        amount: 500,
        currency: "VND",
        categoryNames: ["Food", "Coffee"],
        accountNames: ["Wallet"],
        firstCycleStartDate: "2024-01-15",
        status: "active",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        syncVersion: 2,
        syncedAt: null,
      },
    ]);
    mockDb.notificationEvents.toArray.mockResolvedValue([
      {
        id: "event-1",
        eventType: "credit_card_payment_due",
        title: "Payment due",
        body: "Daily card payment is due",
        priority: "high",
        payload: { budgetId: "budget-1" },
        dedupeKey: "money-insight:budget_overrun:budget-1:2024-01-15",
        status: "pending",
        triggeredAt: "2024-01-20T00:00:00.000Z",
        sentAt: undefined,
        attemptCount: 0,
        lastError: undefined,
        deliveryMode: "daily_until_source_change",
        sourceTable: "accounts",
        sourceRowId: "card-1",
        sourceVersion: 7,
        retryChannels: ["email"],
        processingStartedAt: "2024-01-20T00:00:01.000Z",
        leaseExpiresAt: "2024-01-20T00:02:00.000Z",
        leaseId: "lease-1",
        terminal: false,
        createdAt: "2024-01-20T00:00:00.000Z",
        updatedAt: "2024-01-20T00:00:00.000Z",
        syncVersion: 3,
        syncedAt: null,
        serverVersion: 12,
      },
    ]);

    const storage = new IndexedDBSyncStorage();
    const pendingChanges = await storage.getPendingChanges();

    expect(pendingChanges).toContainEqual({
      tableName: "budgets",
      rowId: "budget-1",
      data: expect.objectContaining({
        categoryNames: ["Food", "Coffee"],
        accountNames: ["Wallet"],
        status: "active",
      }),
      version: 2,
      deleted: false,
    });
    expect(pendingChanges).toContainEqual({
      tableName: "notificationEvents",
      rowId: "event-1",
      data: expect.objectContaining({
        eventType: "credit_card_payment_due",
        priority: "high",
        payload: { budgetId: "budget-1" },
        deliveryMode: "daily_until_source_change",
        sourceTable: "accounts",
        sourceRowId: "card-1",
        sourceVersion: 7,
      }),
      version: 3,
      serverVersion: 12,
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
      {
        tableName: "debtSettlements",
        rowId: "settlement-1",
        data: {},
        version: 4,
        deleted: true,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
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
      {
        tableName: "debts",
        rowId: "debt-1",
        data: {},
        version: 4,
        deleted: true,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
    ]);

    expect(mockDb.transactions.delete).toHaveBeenCalledWith("tx-initial");
    expect(mockDb.transactions.delete).toHaveBeenCalledWith("tx-settlement");
    expect(mockDb.debtSettlements.delete).toHaveBeenCalledWith("settlement-1");
    expect(mockDb.debts.delete).toHaveBeenCalledWith("debt-1");
  });

  it("applies renamed dependent records and defaults a legacy transaction source", async () => {
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
      {
        tableName: "debts",
        rowId: "debt-1",
        data: {
          name: "Loan",
          debtType: "payable",
          counterpartyName: "Alex",
          accountId: "Main wallet",
          currency: "VND",
          principalAmount: 100,
          settledAmount: 0,
          remainingAmount: 100,
          isCompleted: false,
          originatedAt: "2024-01-03",
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
        },
        version: 3,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
      {
        tableName: "debtSettlements",
        rowId: "settlement-1",
        data: {
          debtId: "debt-1",
          transactionId: "tx-wallet",
          accountId: "Main wallet",
          amount: 20,
          settledAt: "2024-01-03",
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
        },
        version: 3,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
      {
        tableName: "budgets",
        rowId: "budget-1",
        data: {
          name: "Wallet budget",
          amount: 500,
          currency: "VND",
          categoryNames: [],
          accountNames: ["Main wallet"],
          firstCycleStartDate: "2024-01-01",
          status: "active",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
        },
        version: 3,
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
    expect(mockDb.debts.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "debt-1",
        accountId: "Main wallet",
        syncVersion: 3,
      }),
    );
    expect(mockDb.debtSettlements.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "settlement-1",
        accountId: "Main wallet",
        syncVersion: 3,
      }),
    );
    expect(mockDb.budgets.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "budget-1",
        accountNames: ["Main wallet"],
        syncVersion: 3,
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

  it("applies a renamed account and rewritten transaction history together", async () => {
    const storage = new IndexedDBSyncStorage();

    await storage.applyRemoteChanges([
      {
        tableName: "accounts",
        rowId: "account-wallet",
        data: {
          name: "Main wallet",
          accountType: "Cash",
          initialBalance: 0,
          currency: "VND",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
        },
        version: 4,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
      {
        tableName: "transactions",
        rowId: "tx-wallet",
        data: {
          source: "manual",
          note: "Lunch",
          amount: -100,
          category: "Food",
          account: "Main wallet",
          currency: "VND",
          date: "2024-01-03",
          excludeReport: false,
          expense: 100,
          income: 0,
          yearMonth: "2024-01",
          year: 2024,
          month: 1,
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
        },
        version: 5,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
    ]);

    expect(mockDb.accounts.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "account-wallet",
        name: "Main wallet",
        syncVersion: 4,
      }),
    );
    expect(mockDb.transactions.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "tx-wallet",
        account: "Main wallet",
        syncVersion: 5,
      }),
    );
  });

  it("reconciles credit-card reminders after remote account changes", async () => {
    mockDb.accounts.get.mockResolvedValue({
      id: "account-card",
      name: "Old card name",
      accountType: "Credit Card",
    });

    const storage = new IndexedDBSyncStorage();
    await storage.applyRemoteChanges([
      {
        tableName: "accounts",
        rowId: "account-card",
        data: {
          name: "New card name",
          accountType: "Credit Card",
          initialBalance: -100,
          currency: "VND",
        },
        version: 3,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
    ]);

    expect(reconcileCreditCardPaymentRemindersMock).toHaveBeenCalledWith(
      new Set(["Old card name", "New card name"]),
    );
  });

  it("reconciles a source account when only its remote notification event changes", async () => {
    const account = {
      id: "account-card",
      name: "Remote card",
      accountType: "Credit Card",
      initialBalance: -100,
      currency: "VND",
      paymentReminderEnabled: true,
      nextPaymentDueDate: "2026-08-10",
      syncVersion: 4,
    };
    mockDb.accounts.get.mockResolvedValue(account);

    const storage = new IndexedDBSyncStorage();
    await storage.applyRemoteChanges([
      {
        tableName: "notificationEvents",
        rowId: "event-card",
        data: {
          eventType: "credit_card_payment_due",
          sourceTable: "accounts",
          sourceRowId: account.id,
          payload: { accountId: account.id, paymentDueDate: "2026-08-10" },
        },
        version: 5,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
    ]);

    expect(reconcileCreditCardPaymentReminderMock).toHaveBeenCalledWith(
      account,
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

  it("applies remote budget and notification event upserts", async () => {
    const storage = new IndexedDBSyncStorage();

    await storage.applyRemoteChanges([
      {
        tableName: "budgets",
        rowId: "budget-1",
        data: {
          name: "Food budget",
          amount: 500,
          currency: "VND",
          categoryNames: ["Food", "Coffee"],
          accountNames: [],
          firstCycleStartDate: "2024-01-15",
          status: "active",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
        version: 2,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
      {
        tableName: "notificationEvents",
        rowId: "event-1",
        data: {
          eventType: "credit_card_payment_due",
          title: "Payment due",
          body: "Daily card payment is due",
          priority: "high",
          payload: { budgetId: "budget-1" },
          dedupeKey: "money-insight:budget_overrun:budget-1:2024-01-15",
          status: "superseded",
          triggeredAt: "2024-01-20T00:00:00.000Z",
          attemptCount: 0,
          deliveryMode: "daily_until_source_change",
          sourceTable: "accounts",
          sourceRowId: "card-1",
          sourceVersion: 7,
          nextAttemptAt: "2026-08-02T02:00:00.000Z",
          lastSentAt: "2026-08-01T02:00:00.000Z",
          createdAt: "2024-01-20T00:00:00.000Z",
          updatedAt: "2024-01-20T00:00:00.000Z",
        },
        version: 3,
        deleted: false,
        syncedAt: "2024-01-03T00:00:00.000Z",
      },
    ]);

    expect(mockDb.budgets.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "budget-1",
        categoryNames: ["Food", "Coffee"],
        syncVersion: 2,
      }),
    );
    expect(mockDb.notificationEvents.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "event-1",
        eventType: "credit_card_payment_due",
        payload: { budgetId: "budget-1" },
        deliveryMode: "daily_until_source_change",
        sourceVersion: 7,
        status: "superseded",
        nextAttemptAt: "2026-08-02T02:00:00.000Z",
        lastSentAt: "2026-08-01T02:00:00.000Z",
        syncVersion: 3,
      }),
    );
  });

  it("detects pending changes via unsynced record filters", async () => {
    mockDb.budgets.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(1),
    });

    const storage = new IndexedDBSyncStorage();

    await expect(storage.hasPendingChanges()).resolves.toBe(true);
    expect(mockDb.budgets.filter).toHaveBeenCalled();
  });

  it("does not acknowledge a newer local edit when an older push completes", async () => {
    mockDb.accounts.get.mockResolvedValue({
      id: "account-1",
      syncVersion: 8,
      syncedAt: null,
    });
    const storage = new IndexedDBSyncStorage();

    await storage.markSynced([
      { tableName: "accounts", rowId: "account-1", version: 7 },
    ]);

    expect(mockDb._pendingChanges.where).toHaveBeenCalledWith({
      tableName: "accounts",
      rowId: "account-1",
    });
    expect(mockDb.accounts.update).not.toHaveBeenCalled();
  });

  it("acknowledges only the matching local mutation version", async () => {
    mockDb.accounts.get.mockResolvedValue({
      id: "account-1",
      syncVersion: 7,
      syncedAt: null,
    });
    const storage = new IndexedDBSyncStorage();

    await storage.markSynced([
      { tableName: "accounts", rowId: "account-1", version: 7 },
    ]);

    expect(mockDb.accounts.update).toHaveBeenCalledWith(
      "account-1",
      expect.objectContaining({ syncedAt: 123 }),
    );
  });

  it("counts pending changes across new budget and notification event tables", async () => {
    mockDb.budgets.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(2),
    });
    mockDb.notificationEvents.filter.mockReturnValue({
      count: vi.fn().mockResolvedValue(3),
    });
    mockDb._pendingChanges.filter.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(1),
    });

    const storage = new IndexedDBSyncStorage();

    await expect(storage.getPendingChangesCount()).resolves.toBe(6);
  });
});
