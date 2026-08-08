import type {
  DashboardPreferences,
  DashboardPreferencesInput,
} from "@money-insight/ui/types";

export interface IDashboardPreferencesService {
  getDashboardPreferences(): Promise<DashboardPreferences | undefined>;
  saveDashboardPreferences(
    input: DashboardPreferencesInput,
  ): Promise<DashboardPreferences>;
  deleteDashboardPreferences(): Promise<void>;
}
