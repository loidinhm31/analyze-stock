import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBAccountAdapter } from "./IndexedDBAccountAdapter";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    accounts: {
      get: vi.fn(),
      toArray: vi.fn(),
      put: vi.fn(),
      add: vi.fn(),
      delete: vi.fn(),
    },
    transactions: {
      where: vi.fn(),
      bulkPut: vi.fn(),
    },
    debts: {
      where: vi.fn(),
      bulkPut: vi.fn(),
    },
    debtSettlements: {
      where: vi.fn(),
      bulkPut: vi.fn(),
    },
    budgets: {
      toArray: vi.fn(),
      bulkPut: vi.fn(),
    },
    notificationEvents: {},
    _pendingChanges: {},
    transaction: vi.fn(),
  },
}));

vi.mock("./database", () => ({
  getDb: () => mockDb,
  generateId: vi.fn(),
}));

vi.mock("./indexedDbHelpers", () => ({
  trackDelete: vi.fn(),
}));

vi.mock("./credit-card-payment-reminder-repository", () => ({
  reconcileCreditCardPaymentReminder: vi.fn(),
  removeUnsyncedCreditCardPaymentReminderEvents: vi.fn(),
}));

vi.mock("./credit-card-payment-confirmation-repository", () => ({
  confirmCreditCardPayment: vi.fn(),
}));

const account = {
  id: "account-wallet",
  name: "Wallet",
  accountType: "Cash",
  initialBalance: 100,
  currency: "VND",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  syncVersion: 3,
  syncedAt: 123,
};

function transaction(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
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
    syncVersion: 4,
    syncedAt: 123,
    ...overrides,
  };
}

describe("IndexedDBAccountAdapter.updateAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.accounts.get.mockResolvedValue(account);
    mockDb.accounts.toArray.mockResolvedValue([account]);
    mockDb.transactions.bulkPut.mockResolvedValue(undefined);
    mockDb.debts.bulkPut.mockResolvedValue(undefined);
    mockDb.debtSettlements.bulkPut.mockResolvedValue(undefined);
    mockDb.budgets.bulkPut.mockResolvedValue(undefined);
    mockDb.budgets.toArray.mockResolvedValue([]);
    mockDb.debts.where.mockReturnValue({
      equals: () => ({ toArray: vi.fn().mockResolvedValue([]) }),
    });
    mockDb.debtSettlements.where.mockReturnValue({
      equals: () => ({ toArray: vi.fn().mockResolvedValue([]) }),
    });
    mockDb.transaction.mockImplementation(
      async (_mode: unknown, ...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<unknown>;
        return callback();
      },
    );
  });

  it("renames linked transactions and both transfer metadata legs as dirty records", async () => {
    const regular = transaction("tx-regular");
    const outgoing = transaction("tx-out", {
      source: "transfer",
      transferId: "transfer-1",
      note: '{"userNote":"Move funds","toAccount":"Savings"}',
    });
    const incoming = transaction("tx-in", {
      source: "transfer",
      transferId: "transfer-1",
      account: "Savings",
      amount: 10,
      expense: 0,
      income: 10,
      note: '{"userNote":"Move funds","fromAccount":"Wallet"}',
    });
    mockDb.transactions.where.mockImplementation((field: string) => ({
      equals: () => ({
        toArray: vi
          .fn()
          .mockResolvedValue(
            field === "account" ? [regular, outgoing] : [outgoing, incoming],
          ),
      }),
    }));
    mockDb.debts.where.mockReturnValue({
      equals: () => ({
        toArray: vi.fn().mockResolvedValue([
          {
            id: "debt-1",
            accountId: "Wallet",
            syncVersion: 2,
            syncedAt: 123,
          },
        ]),
      }),
    });
    mockDb.debtSettlements.where.mockReturnValue({
      equals: () => ({
        toArray: vi.fn().mockResolvedValue([
          {
            id: "settlement-1",
            accountId: "Wallet",
            syncVersion: 2,
            syncedAt: 123,
          },
        ]),
      }),
    });
    mockDb.budgets.toArray.mockResolvedValue([
      {
        id: "budget-1",
        accountNames: ["Wallet", "Savings"],
        syncVersion: 2,
        syncedAt: 123,
      },
    ]);

    const updated = await new IndexedDBAccountAdapter().updateAccount({
      ...account,
      name: " Main wallet ",
    });

    expect(updated).toMatchObject({
      name: "Main wallet",
      syncVersion: 4,
      syncedAt: null,
    });
    expect(mockDb.transactions.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "tx-regular",
        account: "Main wallet",
        syncVersion: 5,
        syncedAt: null,
      }),
      expect.objectContaining({
        id: "tx-out",
        account: "Main wallet",
        syncVersion: 5,
        syncedAt: null,
      }),
      expect.objectContaining({
        id: "tx-in",
        account: "Savings",
        note: '{"userNote":"Move funds","fromAccount":"Main wallet"}',
        syncVersion: 5,
        syncedAt: null,
      }),
    ]);
    expect(mockDb.accounts.put).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Main wallet",
        syncVersion: 4,
        syncedAt: null,
      }),
    );
    expect(mockDb.debts.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "debt-1",
        accountId: "Main wallet",
        syncVersion: 3,
        syncedAt: null,
      }),
    ]);
    expect(mockDb.debtSettlements.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "settlement-1",
        accountId: "Main wallet",
        syncVersion: 3,
        syncedAt: null,
      }),
    ]);
    expect(mockDb.budgets.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "budget-1",
        accountNames: ["Main wallet", "Savings"],
        syncVersion: 3,
        syncedAt: null,
      }),
    ]);
  });

  it("rejects duplicate names before changing any records", async () => {
    mockDb.accounts.toArray.mockResolvedValue([
      account,
      { ...account, id: "account-savings", name: " savings " },
    ]);

    await expect(
      new IndexedDBAccountAdapter().updateAccount({
        ...account,
        name: "Savings",
      }),
    ).rejects.toThrow('An account named " savings " already exists');

    expect(mockDb.transactions.bulkPut).not.toHaveBeenCalled();
    expect(mockDb.debts.bulkPut).not.toHaveBeenCalled();
    expect(mockDb.debtSettlements.bulkPut).not.toHaveBeenCalled();
    expect(mockDb.budgets.bulkPut).not.toHaveBeenCalled();
    expect(mockDb.accounts.put).not.toHaveBeenCalled();
  });

  it("does not dirty transactions when the canonical name is unchanged", async () => {
    await new IndexedDBAccountAdapter().updateAccount({
      ...account,
      name: " Wallet ",
    });

    expect(mockDb.transactions.where).not.toHaveBeenCalled();
    expect(mockDb.transactions.bulkPut).not.toHaveBeenCalled();
  });
});
