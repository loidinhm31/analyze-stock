import { db, generateId, getCurrentTimestamp } from "./database";

interface SyncTracked {
  id?: string;
  sync_version?: number;
}

export function withSyncTracking<T extends SyncTracked>(
  entity: T,
  existing?: T,
): T {
  return {
    ...entity,
    id: entity.id || generateId(),
    sync_version: (existing?.sync_version || 0) + 1,
  };
}

export async function trackDelete(
  tableName: string,
  id: string,
  syncVersion: number,
): Promise<void> {
  await db._pendingChanges.add({
    tableName,
    rowId: id,
    operation: "delete",
    data: {},
    version: (syncVersion || 0) + 1,
    createdAt: getCurrentTimestamp(),
  });
}
