import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  syncNowMock,
  syncWithProgressMock,
  spendingInitMock,
  debtLoadMock,
  debtSettlementsLoadMock,
} = vi.hoisted(() => ({
  syncNowMock: vi.fn(),
  syncWithProgressMock: vi.fn(),
  spendingInitMock: vi.fn(),
  debtLoadMock: vi.fn(),
  debtSettlementsLoadMock: vi.fn(),
}));

vi.mock("@money-insight/ui/adapters", () => ({
  getSyncService: () => ({
    syncNow: syncNowMock,
    syncWithProgress: syncWithProgressMock,
    getStatus: vi.fn(),
  }),
}));

vi.mock("@money-insight/ui/stores", () => ({
  useSpendingStore: {
    getState: () => ({
      isDbReady: true,
      initFromDatabase: spendingInitMock,
    }),
  },
  useDebtStore: {
    getState: () => ({
      isDbReady: true,
      selectedDebtId: "debt-1",
      loadDebts: debtLoadMock,
      loadSettlements: debtSettlementsLoadMock,
    }),
  },
}));

import {
  shouldRefreshLocalStoresAfterSync,
  syncNow,
  syncWithProgress,
} from "./syncService";

describe("syncService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes local stores after pulled records", async () => {
    syncNowMock.mockResolvedValue({
      pushed: 0,
      pulled: 2,
      conflicts: 0,
      success: true,
      syncedAt: Date.now(),
    });

    const result = await syncNow();

    expect(result.pulled).toBe(2);
    expect(spendingInitMock).toHaveBeenCalledTimes(1);
    expect(debtLoadMock).toHaveBeenCalledTimes(1);
    expect(debtSettlementsLoadMock).toHaveBeenCalledWith("debt-1");
  });

  it("refreshes local stores after sync conflicts even without pulled rows", async () => {
    syncWithProgressMock.mockResolvedValue({
      pushed: 1,
      pulled: 0,
      conflicts: 1,
      success: true,
      syncedAt: Date.now(),
    });

    await syncWithProgress(() => {});

    expect(spendingInitMock).toHaveBeenCalledTimes(1);
    expect(debtLoadMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes local stores for successful pushed-only manual sync results", async () => {
    syncWithProgressMock.mockResolvedValue({
      pushed: 3,
      pulled: 0,
      conflicts: 0,
      success: true,
      syncedAt: Date.now(),
    });

    await syncWithProgress(() => {});

    expect(spendingInitMock).toHaveBeenCalledTimes(1);
    expect(debtLoadMock).toHaveBeenCalledTimes(1);
    expect(debtSettlementsLoadMock).toHaveBeenCalledWith("debt-1");
  });

  it("only marks successful pulls or conflicts as requiring refresh", () => {
    expect(
      shouldRefreshLocalStoresAfterSync({
        pushed: 0,
        pulled: 1,
        conflicts: 0,
        success: true,
        syncedAt: Date.now(),
      }),
    ).toBe(true);

    expect(
      shouldRefreshLocalStoresAfterSync({
        pushed: 0,
        pulled: 0,
        conflicts: 1,
        success: true,
        syncedAt: Date.now(),
      }),
    ).toBe(true);

    expect(
      shouldRefreshLocalStoresAfterSync({
        pushed: 1,
        pulled: 0,
        conflicts: 0,
        success: true,
        syncedAt: Date.now(),
      }),
    ).toBe(false);

    expect(
      shouldRefreshLocalStoresAfterSync({
        pushed: 0,
        pulled: 1,
        conflicts: 0,
        success: false,
        syncedAt: Date.now(),
      }),
    ).toBe(false);
  });
});
