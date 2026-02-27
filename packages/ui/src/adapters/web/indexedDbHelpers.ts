import { getDb, generateId, getCurrentTimestamp } from "./database";

interface SyncTracked {
  id?: string;
  syncVersion?: number;
}

export function withSyncTracking<T extends SyncTracked>(
  entity: T,
  existing?: T,
): T {
  return {
    ...entity,
    id: entity.id || generateId(),
    syncVersion: (existing?.syncVersion || 0) + 1,
  };
}

export async function trackDelete(
  tableName: string,
  id: string,
  syncVersion: number,
): Promise<void> {
  await getDb()._pendingChanges.add({
    tableName,
    rowId: id,
    operation: "delete",
    data: {},
    version: (syncVersion || 0) + 1,
    createdAt: getCurrentTimestamp(),
  });
}
