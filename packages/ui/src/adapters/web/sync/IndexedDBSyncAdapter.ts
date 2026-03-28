import type {
  SyncProgress,
  SyncResult,
  SyncStatus,
} from "@money-insight/shared/types";
import {
  createSyncClientConfig,
  type HttpClientFn,
  QmSyncClient,
} from "@money-insight/shared/types";
import { IndexedDBSyncStorage } from "@money-insight/ui/adapters/web";
import { getCurrentTimestamp } from "@money-insight/ui/adapters/web";
import { ISyncService } from "@money-insight/ui/adapters/factory/interfaces";

export type TokenProvider = () => Promise<{
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
}>;

export type TokenSaver = (
  accessToken: string,
  refreshToken: string,
  userId: string,
) => Promise<void>;

export type SyncConfigProvider = () => {
  serverUrl: string;
  appId: string;
  apiKey: string;
};

export interface IndexedDBSyncAdapterConfig {
  getConfig: SyncConfigProvider;
  httpClient?: HttpClientFn;
  getTokens: TokenProvider;
  saveTokens?: TokenSaver;
}

export class IndexedDBSyncAdapter implements ISyncService {
  private client: QmSyncClient | null = null;
  private storage: IndexedDBSyncStorage;
  private config: IndexedDBSyncAdapterConfig;
  private initialized = false;
  private lastConfigHash: string = "";
  // Concurrency lock: coalesces double-click / auto+manual overlaps into one in-flight sync.
  // All callers share the same result; their progress callbacks are all notified.
  private _syncInFlight: Promise<SyncResult> | null = null;
  private _progressCallbacks: Set<(p: SyncProgress) => void> = new Set();

  constructor(config: IndexedDBSyncAdapterConfig) {
    this.config = config;
    this.storage = new IndexedDBSyncStorage();
  }

  private getConfigHash(config: {
    serverUrl: string;
    appId: string;
    apiKey: string;
  }): string {
    return `${config.serverUrl}|${config.appId}|${config.apiKey}`;
  }

  private ensureClient(): QmSyncClient {
    const config = this.config.getConfig();
    const hash = this.getConfigHash(config);

    if (!this.client || hash !== this.lastConfigHash) {
      const clientConfig = createSyncClientConfig(
        config.serverUrl,
        config.appId,
        config.apiKey,
      );
      this.client = new QmSyncClient(clientConfig, this.config.httpClient);
      this.lastConfigHash = hash;
      this.initialized = false;
      // Write rotated tokens back to persistent storage immediately so the
      // next syncWithProgress() load doesn't overwrite them with stale values.
      if (this.config.saveTokens) {
        const client = this.client;
        client.setOnTokenRefresh((at, rt) => {
          this.config.saveTokens!(at, rt, client.getUserId() ?? "").catch(
            (e) => console.error("[IndexedDBSyncAdapter] Failed to save refreshed tokens:", e),
          );
        });
      }
    }

    return this.client;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const client = this.ensureClient();
    const { accessToken, refreshToken, userId } = await this.config.getTokens();
    if (accessToken && refreshToken) {
      client.setTokens(accessToken, refreshToken, userId);
      console.log("[IndexedDBSyncAdapter] Tokens loaded from auth service");
    } else {
      console.log(
        "[IndexedDBSyncAdapter] No tokens available from auth service",
      );
    }
    this.initialized = true;
  }

  async syncNow(): Promise<SyncResult> {
    return this.syncWithProgress(() => {});
  }

  async syncWithProgress(
    onProgress: (progress: SyncProgress) => void,
  ): Promise<SyncResult> {
    this._progressCallbacks.add(onProgress);
    if (this._syncInFlight) return this._syncInFlight;
    const fanOut = (p: SyncProgress) => {
      for (const cb of this._progressCallbacks) cb(p);
    };
    this._syncInFlight = this._doSyncWithProgress(fanOut).finally(() => {
      this._syncInFlight = null;
      this._progressCallbacks.clear();
    });
    return this._syncInFlight;
  }

  private async _doSyncWithProgress(
    onProgress: (progress: SyncProgress) => void,
  ): Promise<SyncResult> {
    const client = this.ensureClient();
    const { accessToken, refreshToken, userId } = await this.config.getTokens();
    if (accessToken && refreshToken) {
      client.setTokens(accessToken, refreshToken, userId);
      console.log(
        "[IndexedDBSyncAdapter] Tokens refreshed from auth service for sync",
      );
    }
    this.initialized = true;

    if (!client.isAuthenticated()) {
      console.log("[IndexedDBSyncAdapter] Not authenticated - cannot sync");
      return {
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        success: false,
        error: "Not authenticated",
        syncedAt: getCurrentTimestamp(),
      };
    }

    try {
      const pendingChanges = await this.storage.getPendingChanges();
      const checkpoint = await this.storage.getCheckpoint();
      const response = await client.delta(pendingChanges, checkpoint);

      let pushed = 0;
      let pulled = 0;
      let conflicts = 0;

      // Handle push result
      if (response.push) {
        pushed = response.push.synced;
        conflicts = response.push.conflicts.length;
        if (pushed > 0) {
          const syncedIds = pendingChanges.map((r) => ({
            tableName: r.tableName,
            rowId: r.rowId,
          }));
          await this.storage.markSynced(syncedIds);
        }
        onProgress({
          phase: "pushing",
          recordsPushed: pushed,
          recordsPulled: 0,
          hasMore: response.pull?.hasMore ?? false,
          currentPage: 0,
        });
      }

      // Handle pull result with hasMore pagination
      if (response.pull) {
        const allRecords = [...response.pull.records];
        pulled = allRecords.length;

        let currentCheckpoint = response.pull.checkpoint;
        let hasMore = response.pull.hasMore;
        let page = 1;

        onProgress({
          phase: "pulling",
          recordsPushed: pushed,
          recordsPulled: pulled,
          hasMore,
          currentPage: page,
        });

        // Auto-continue pulling while hasMore is true
        while (hasMore) {
          page++;
          const pullResponse = await client.pull(currentCheckpoint);

          allRecords.push(...pullResponse.records);
          pulled += pullResponse.records.length;

          currentCheckpoint = pullResponse.checkpoint;
          hasMore = pullResponse.hasMore;

          onProgress({
            phase: "pulling",
            recordsPushed: pushed,
            recordsPulled: pulled,
            hasMore,
            currentPage: page,
          });
        }

        // Apply ALL changes at once after collecting from all pages
        if (allRecords.length > 0) {
          await this.storage.applyRemoteChanges(allRecords);
        }
        await this.storage.saveCheckpoint(currentCheckpoint);
      }

      const syncedAt = getCurrentTimestamp();
      await this.storage.saveLastSyncAt(syncedAt);

      return { pushed, pulled, conflicts, success: true, syncedAt };
    } catch (error) {
      console.error("Sync failed:", error);
      return {
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        syncedAt: getCurrentTimestamp(),
      };
    }
  }

  async getStatus(): Promise<SyncStatus> {
    await this.initialize();
    const client = this.ensureClient();
    const [pendingChanges, lastSyncAt] = await Promise.all([
      this.storage.getPendingChangesCount(),
      this.storage.getLastSyncAt(),
    ]);
    return {
      configured: true,
      authenticated: client.isAuthenticated(),
      lastSyncAt,
      pendingChanges,
      serverUrl: client.config.serverUrl,
    };
  }

  getStorage(): IndexedDBSyncStorage {
    return this.storage;
  }

  getClient(): QmSyncClient {
    return this.ensureClient();
  }
}

export function createIndexedDBSyncAdapter(
  config: IndexedDBSyncAdapterConfig,
): IndexedDBSyncAdapter {
  return new IndexedDBSyncAdapter(config);
}
