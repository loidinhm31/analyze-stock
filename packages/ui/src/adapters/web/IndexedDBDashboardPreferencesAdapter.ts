import type { IDashboardPreferencesService } from "@money-insight/ui/adapters/factory/interfaces";
import {
  DASHBOARD_PREFERENCES_ID,
  normalizeDashboardAccountTypeKeys,
  type DashboardPreferences,
  type DashboardPreferencesInput,
} from "@money-insight/ui/types";
import { getDb } from "./database";
import { trackDelete } from "./indexedDbHelpers";

export class IndexedDBDashboardPreferencesAdapter
  implements IDashboardPreferencesService
{
  async getDashboardPreferences(): Promise<DashboardPreferences | undefined> {
    return getDb().dashboardPreferences.get(DASHBOARD_PREFERENCES_ID);
  }

  async saveDashboardPreferences(
    input: DashboardPreferencesInput,
  ): Promise<DashboardPreferences> {
    const selectedAccountTypes = normalizeDashboardAccountTypeKeys(
      input.selectedAccountTypes,
    );
    const db = getDb();
    return db.transaction("rw", [db.dashboardPreferences], async () => {
      const existing = await db.dashboardPreferences.get(
        DASHBOARD_PREFERENCES_ID,
      );
      const now = new Date().toISOString();
      const preferences: DashboardPreferences = {
        id: DASHBOARD_PREFERENCES_ID,
        selectedAccountTypes,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        syncVersion: (existing?.syncVersion ?? 0) + 1,
        syncedAt: null,
        serverVersion: existing?.serverVersion,
      };

      await db.dashboardPreferences.put(preferences);
      return preferences;
    });
  }

  async deleteDashboardPreferences(): Promise<void> {
    const existing = await this.getDashboardPreferences();
    if (!existing) return;

    await getDb().transaction(
      "rw",
      [getDb().dashboardPreferences, getDb()._pendingChanges],
      async () => {
        await trackDelete(
          "dashboardPreferences",
          DASHBOARD_PREFERENCES_ID,
          existing.syncVersion,
          existing.serverVersion,
        );
        await getDb().dashboardPreferences.delete(DASHBOARD_PREFERENCES_ID);
      },
    );
  }
}
