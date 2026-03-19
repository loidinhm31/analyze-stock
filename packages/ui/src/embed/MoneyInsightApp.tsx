import {
  IndexedDBAccountAdapter,
  IndexedDBCategoryAdapter,
  IndexedDBCategoryGroupAdapter,
  IndexedDBStatisticsAdapter,
  IndexedDBTransactionAdapter,
  createIndexedDBSyncAdapter,
  setAccountService,
  setAuthService,
  setCategoryService,
  setCategoryGroupService,
  setStatisticsService,
  setSyncService,
  setTransactionService,
  getSyncService,
} from "@money-insight/ui/adapters";
import { initDb, deleteCurrentDb, IndexedDBSyncStorage } from "@money-insight/ui/adapters/web";
import { QmServerAuthAdapter } from "@money-insight/ui/adapters/shared";
import { TauriAuthAdapter } from "@money-insight/ui/adapters/tauri";
import { isTauri } from "@money-insight/ui/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppShell } from "@money-insight/ui/components/templates";
import {
  BasePathContext,
  PortalContainerContext,
} from "@money-insight/ui/hooks";
import {
  PlatformProvider,
  type IPlatformServices,
} from "@money-insight/ui/platform";
import { ThemeProvider } from "@money-insight/ui/contexts";
import { useAutoSync } from "../hooks/useAutoSync";
import { useSyncToast } from "../hooks/useSyncToast";
import { SyncToastProvider } from "../contexts/SyncToastContext";
import { SyncToast } from "../components/atoms/SyncToast";
import type { ISyncService } from "@money-insight/ui/adapters/factory/interfaces";

function SyncAutoSyncManager({
  syncService,
  enabled,
}: {
  syncService: ISyncService | null;
  enabled: boolean;
}) {
  const { handleSyncStart, handleSyncResult } = useSyncToast();
  useAutoSync({
    syncService,
    enabled,
    onSyncStart: handleSyncStart,
    onSyncResult: handleSyncResult,
  });
  return null;
}

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
}

type LogoutCleanupFn = () => Promise<{ success: boolean; error?: string }>;
type UnregisterFn = () => void;

export interface MoneyInsightAppProps {
  authTokens?: AuthTokens;
  embedded?: boolean;
  useRouter?: boolean;
  basePath?: string;
  className?: string;
  onLogoutRequest?: () => void;
  /** Register a cleanup callback for logout (sync + delete DB). Returns unregister fn. */
  registerLogoutCleanup?: (appId: string, fn: LogoutCleanupFn) => UnregisterFn;
}

export function MoneyInsightApp({
  authTokens,
  embedded = false,
  useRouter = true,
  basePath,
  className,
  onLogoutRequest,
  registerLogoutCleanup,
}: MoneyInsightAppProps) {
  // Gate rendering on DB ready to prevent getDb() throws before initDb() completes
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Embedded: use userId from hub. Standalone: userId=undefined → legacy "MoneyInsightDB"
    setDbReady(false);
    initDb(authTokens?.userId)
      .then(() => setDbReady(true))
      .catch(console.error);
  }, [authTokens?.userId]);

  // Register logout cleanup with hub after DB is ready
  useEffect(() => {
    if (!dbReady || !registerLogoutCleanup) return;
    const unregister = registerLogoutCleanup("money-insight", async () => {
      try {
        const storage = new IndexedDBSyncStorage();
        const hasPending = await storage.hasPendingChanges();
        if (hasPending) {
          const syncService = getSyncService();
          const result = await syncService.syncNow();
          if (!result.success) return { success: false, error: result.error };
        }
        await deleteCurrentDb();
        return { success: true };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Cleanup failed" };
      }
    });
    return unregister;
  }, [dbReady, registerLogoutCleanup]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    if (containerRef.current) setPortalContainer(containerRef.current);
  }, [dbReady]);

  // Initialize services only after DB is ready
  const services: IPlatformServices = useMemo(() => {
    if (!dbReady) return {} as IPlatformServices;
    // Initialize data services
    const transaction = new IndexedDBTransactionAdapter();
    const category = new IndexedDBCategoryAdapter();
    const categoryGroup = new IndexedDBCategoryGroupAdapter();
    const account = new IndexedDBAccountAdapter();
    const statistics = new IndexedDBStatisticsAdapter();
    setTransactionService(transaction);
    setCategoryService(category);
    setCategoryGroupService(categoryGroup);
    setAccountService(account);
    setStatisticsService(statistics);

    // Initialize auth service based on platform
    const auth = isTauri() ? new TauriAuthAdapter() : new QmServerAuthAdapter();
    setAuthService(auth);

    // Initialize sync service (depends on auth)
    const sync = createIndexedDBSyncAdapter({
      getConfig: () => auth.getSyncConfig(),
      getTokens: () => auth.getTokens(),
      saveTokens:
        "saveTokensExternal" in auth && auth.saveTokensExternal
          ? (accessToken, refreshToken, userId) =>
              auth.saveTokensExternal!(accessToken, refreshToken, userId)
          : undefined,
    });
    setSyncService(sync);

    return { transaction, category, account, statistics, auth, sync };
  }, [dbReady]);

  const isAuthenticated = !!(authTokens?.accessToken && authTokens?.refreshToken);
  const autoSyncEnabled = dbReady && isAuthenticated && embedded;

  // If external auth tokens are provided, save them to the auth service
  useEffect(() => {
    if (
      authTokens?.accessToken &&
      authTokens?.refreshToken &&
      services.auth &&
      "saveTokensExternal" in services.auth &&
      services.auth.saveTokensExternal
    ) {
      services.auth
        .saveTokensExternal(
          authTokens.accessToken,
          authTokens.refreshToken,
          authTokens.userId || "",
        )
        .catch(console.error);
    }
  }, [authTokens, services.auth]);

  const skipAuth = !!(authTokens?.accessToken && authTokens?.refreshToken);

  if (!dbReady) return null;

  const content = (
    <AppShell
      skipAuth={skipAuth}
      embedded={embedded}
      onLogoutRequest={onLogoutRequest}
    />
  );

  return (
    <div ref={containerRef} className={className}>
      <ThemeProvider embedded={embedded}>
        <PlatformProvider services={services}>
          <PortalContainerContext.Provider value={portalContainer}>
            <BasePathContext.Provider value={basePath || ""}>
              <SyncToastProvider position="top-right">
                {useRouter ? (
                  <BrowserRouter basename={basePath}>{content}</BrowserRouter>
                ) : (
                  content
                )}
                <SyncAutoSyncManager
                  syncService={dbReady ? getSyncService() : null}
                  enabled={autoSyncEnabled}
                />
                <SyncToast />
              </SyncToastProvider>
            </BasePathContext.Provider>
          </PortalContainerContext.Provider>
        </PlatformProvider>
      </ThemeProvider>
    </div>
  );
}
