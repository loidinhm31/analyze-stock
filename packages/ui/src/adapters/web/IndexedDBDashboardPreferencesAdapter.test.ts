import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBDashboardPreferencesAdapter } from "./IndexedDBDashboardPreferencesAdapter";

const { mockDb, trackDeleteMock } = vi.hoisted(() => ({
  mockDb: {
    dashboardPreferences: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
    _pendingChanges: {},
    transaction: vi.fn(),
  },
  trackDeleteMock: vi.fn(),
}));

vi.mock("./database", () => ({ getDb: () => mockDb }));
vi.mock("./indexedDbHelpers", () => ({ trackDelete: trackDeleteMock }));

describe("IndexedDBDashboardPreferencesAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.dashboardPreferences.get.mockResolvedValue(undefined);
    mockDb.transaction.mockImplementation(
      async (
        _mode: unknown,
        _tables: unknown,
        callback: () => Promise<unknown>,
      ) => callback(),
    );
  });

  it("creates the singleton with validated selection and sync metadata", async () => {
    const preferences = await new IndexedDBDashboardPreferencesAdapter().saveDashboardPreferences({
      selectedAccountTypes: ["cash", "__other__"],
    });

    expect(preferences).toMatchObject({
      id: "account-type-value-widget",
      selectedAccountTypes: ["cash", "__other__"],
      syncVersion: 1,
      syncedAt: null,
    });
    expect(mockDb.dashboardPreferences.put).toHaveBeenCalledWith(preferences);
    expect(mockDb.transaction).toHaveBeenCalledWith(
      "rw",
      [mockDb.dashboardPreferences],
      expect.any(Function),
    );
  });

  it("rejects empty, duplicate, and unknown selections", async () => {
    const adapter = new IndexedDBDashboardPreferencesAdapter();

    await expect(
      adapter.saveDashboardPreferences({ selectedAccountTypes: [] }),
    ).rejects.toThrow("Select at least one account type");
    await expect(
      adapter.saveDashboardPreferences({
        selectedAccountTypes: ["cash", "cash"],
      }),
    ).rejects.toThrow("Dashboard account types must be unique");
    await expect(
      adapter.saveDashboardPreferences({
        selectedAccountTypes: ["unexpected"] as never,
      }),
    ).rejects.toThrow("Invalid dashboard account type");
  });

  it("increments versions while preserving the last server version", async () => {
    mockDb.dashboardPreferences.get.mockResolvedValue({
      id: "account-type-value-widget",
      selectedAccountTypes: ["cash"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      syncVersion: 3,
      syncedAt: 123,
      serverVersion: 5,
    });
    const adapter = new IndexedDBDashboardPreferencesAdapter();

    const updated = await adapter.saveDashboardPreferences({
      selectedAccountTypes: ["savings"],
    });

    expect(updated.syncVersion).toBe(4);
    expect(updated.serverVersion).toBe(5);
  });

  it("tracks a delete using the stored local and server versions", async () => {
    mockDb.dashboardPreferences.get.mockResolvedValue({
      id: "account-type-value-widget",
      selectedAccountTypes: ["savings"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      syncVersion: 4,
      syncedAt: null,
      serverVersion: 5,
    });
    const adapter = new IndexedDBDashboardPreferencesAdapter();

    await adapter.deleteDashboardPreferences();

    expect(trackDeleteMock).toHaveBeenCalledWith(
      "dashboardPreferences",
      "account-type-value-widget",
      4,
      5,
    );
    expect(mockDb.dashboardPreferences.delete).toHaveBeenCalledWith(
      "account-type-value-widget",
    );
  });
});
