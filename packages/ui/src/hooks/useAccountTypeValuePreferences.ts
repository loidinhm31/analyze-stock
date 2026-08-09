import { useCallback, useEffect, useRef, useState } from "react";
import { usePlatformServices } from "@money-insight/ui/platform";
import {
  DASHBOARD_PREFERENCES_ID,
  normalizeDashboardAccountTypeKeys,
  type DashboardAccountTypeKey,
} from "@money-insight/ui/types";

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to load widget preferences";
}

export interface UseAccountTypeValuePreferencesResult {
  selectedAccountTypes: DashboardAccountTypeKey[] | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  save: (selection: readonly DashboardAccountTypeKey[]) => Promise<void>;
}

export function useAccountTypeValuePreferences(): UseAccountTypeValuePreferencesResult {
  const { dashboardPreferences } = usePlatformServices();
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<DashboardAccountTypeKey[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const operationQueue = useRef(Promise.resolve());

  const runSerialized = useCallback(<T,>(operation: () => Promise<T>) => {
    const nextOperation = operationQueue.current.then(operation, operation);
    operationQueue.current = nextOperation.then(
      () => undefined,
      () => undefined,
    );
    return nextOperation;
  }, []);

  const reload = useCallback(
    () =>
      runSerialized(async () => {
        setIsLoading(true);
        setError(null);
        try {
          const preferences =
            await dashboardPreferences.getDashboardPreferences();
          if (!preferences) {
            setSelectedAccountTypes(null);
            return;
          }
          if (preferences.id !== DASHBOARD_PREFERENCES_ID) {
            throw new Error("Invalid dashboard preferences record");
          }
          setSelectedAccountTypes(
            normalizeDashboardAccountTypeKeys(preferences.selectedAccountTypes),
          );
        } catch (loadError) {
          setSelectedAccountTypes(null);
          setError(getErrorMessage(loadError));
        } finally {
          setIsLoading(false);
        }
      }),
    [dashboardPreferences, runSerialized],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    (selection: readonly DashboardAccountTypeKey[]) =>
      runSerialized(async () => {
        setError(null);
        try {
          if (selection.length === 0) {
            await dashboardPreferences.deleteDashboardPreferences();
            setSelectedAccountTypes(null);
            return;
          }

          const normalizedSelection =
            normalizeDashboardAccountTypeKeys(selection);
          const saved = await dashboardPreferences.saveDashboardPreferences({
            selectedAccountTypes: normalizedSelection,
          });
          if (saved.id !== DASHBOARD_PREFERENCES_ID) {
            throw new Error("Invalid dashboard preferences response");
          }
          setSelectedAccountTypes(
            normalizeDashboardAccountTypeKeys(saved.selectedAccountTypes),
          );
        } catch (saveError) {
          setError(getErrorMessage(saveError));
          throw saveError;
        }
      }),
    [dashboardPreferences, runSerialized],
  );

  return { selectedAccountTypes, isLoading, error, reload, save };
}
