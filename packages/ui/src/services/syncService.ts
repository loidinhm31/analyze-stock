import { getSyncService } from "@money-insight/ui/adapters";
import type {
  SyncProgress,
  SyncResult,
  SyncStatus,
} from "@money-insight/shared/types";

export function shouldRefreshLocalStoresAfterSync(result: SyncResult): boolean {
  return result.success && (result.pulled > 0 || result.conflicts > 0);
}

export async function refreshLocalStoresAfterSync(
  result: SyncResult,
  options?: { force?: boolean },
): Promise<void> {
  if (!result.success) return;
  if (!options?.force && !shouldRefreshLocalStoresAfterSync(result)) return;

  try {
    const { useSpendingStore, useDebtStore } = await import(
      "@money-insight/ui/stores"
    );

    const spendingStore = useSpendingStore.getState();
    if (spendingStore.isDbReady) {
      await spendingStore.initFromDatabase();
    }

    const debtStore = useDebtStore.getState();
    if (debtStore.isDbReady) {
      await debtStore.loadDebts();
      if (debtStore.selectedDebtId) {
        await debtStore.loadSettlements(debtStore.selectedDebtId);
      }
    }
  } catch (error) {
    console.error("[sync] Failed to refresh local stores after sync:", error);
  }
}

export async function syncNow(): Promise<SyncResult> {
  const result = await getSyncService().syncNow();
  await refreshLocalStoresAfterSync(result, { force: true });
  return result;
}

export async function getStatus(): Promise<SyncStatus> {
  return getSyncService().getStatus();
}

export async function syncWithProgress(
  onProgress: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  const svc = getSyncService();
  const result = svc.syncWithProgress
    ? await svc.syncWithProgress(onProgress)
    : await svc.syncNow();
  await refreshLocalStoresAfterSync(result, { force: true });
  return result;
}
