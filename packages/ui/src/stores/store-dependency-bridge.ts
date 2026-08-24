import type { Transaction } from "@money-insight/ui/types";
import { useSpendingStore } from "./spendingStore";

/**
 * Static adapter for secondary stores. The previous dynamic imports loaded
 * spendingStore when a secondary store was used first; these callbacks retain
 * that behavior without leaving a silent empty-store fallback or a Vite
 * dynamic/static import conflict.
 */
export function getCurrentTransactions(): Transaction[] {
  return useSpendingStore.getState().transactions;
}

export async function refreshSpendingStore(): Promise<void> {
  const spendingStore = useSpendingStore.getState();
  if (spendingStore.isDbReady) {
    await spendingStore.initFromDatabase();
  }
}

export function refreshSpendingAnalysis(): void {
  const spendingStore = useSpendingStore.getState();
  if (spendingStore.isDbReady) {
    spendingStore.refreshAnalysis();
  }
}
