import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBSyncStorage } from "./IndexedDBSyncStorage";

const mockDb = {
  transactions: {
    toArray: vi.fn(),
  },
  categories: {
    toArray: vi.fn(),
  },
  accounts: {
    toArray: vi.fn(),
  },
  _pendingChanges: {
    filter: vi.fn(),
  },
};

vi.mock("@money-insight/ui/adapters/web", () => ({
  getDb: () => mockDb,
  getCurrentTimestamp: () => 123,
  SYNC_META_KEYS: {
    CHECKPOINT: "checkpoint",
    LAST_SYNC_AT: "lastSyncAt",
    CATEGORY_BACKFILL_V1: "categoryBackfillV1",
  },
}));

describe("IndexedDBSyncStorage.getPendingChanges", () => {
  beforeEach(() => {
    mockDb.transactions.toArray.mockResolvedValue([]);
    mockDb.categories.toArray.mockResolvedValue([]);
    mockDb.accounts.toArray.mockResolvedValue([]);
    mockDb._pendingChanges.filter.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    });
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
});
