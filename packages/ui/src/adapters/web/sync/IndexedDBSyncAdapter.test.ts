import { describe, expect, it, vi } from "vitest";
import { IndexedDBSyncAdapter } from "./IndexedDBSyncAdapter";

describe("IndexedDBSyncAdapter push acknowledgements", () => {
  it("accepts a response with omitted failures and preserves the acknowledged version", async () => {
    const markSynced = vi.fn().mockResolvedValue(undefined);
    const storage = {
      getPendingChanges: vi.fn().mockResolvedValue([
        {
          tableName: "accounts",
          rowId: "account-1",
          data: { name: "Card" },
          version: 7,
          deleted: false,
        },
      ]),
      getCheckpoint: vi.fn().mockResolvedValue(undefined),
      markSynced,
      applyRemoteChanges: vi.fn().mockResolvedValue(undefined),
      saveCheckpoint: vi.fn().mockResolvedValue(undefined),
      saveLastSyncAt: vi.fn().mockResolvedValue(undefined),
    };

    const adapter = new IndexedDBSyncAdapter({
      getConfig: () => ({
        serverUrl: "https://sync.example.test",
        appId: "money-insight",
        apiKey: "test-key",
      }),
      getTokens: async () => ({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        userId: "user-1",
      }),
      httpClient: async () => ({
        status: 200,
        body: JSON.stringify({
          push: {
            synced: 1,
            conflicts: [],
            syncedRecords: [
              { tableName: "accounts", rowId: "account-1", version: 7 },
            ],
            serverTimestamp: "2026-08-03T00:00:00.000Z",
          },
          pull: {
            records: [],
            checkpoint: {
              updatedAt: "2026-08-03T00:00:00.000Z",
              id: "000000000000000000000000",
            },
            serverTimestamp: "2026-08-03T00:00:00.000Z",
            hasMore: false,
          },
        }),
      }),
    });

    (adapter as unknown as { storage: typeof storage }).storage = storage;

    await expect(adapter.syncNow()).resolves.toMatchObject({
      success: true,
      pushed: 1,
    });
    expect(markSynced).toHaveBeenCalledWith([
      { tableName: "accounts", rowId: "account-1", version: 7 },
    ]);
  });
});
