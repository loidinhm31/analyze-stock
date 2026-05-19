import type { TimePeriodMode } from "./timePeriodGrouping";

export const TRANSACTION_PAGE_PREFERENCES_STORAGE_KEY =
  "money-insight:transaction-page-preferences";

export interface TransactionPagePreferences {
  periodMode: TimePeriodMode;
  selectedAccount: string;
}

const DEFAULT_PERIOD_MODE: TimePeriodMode = "month";
const DEFAULT_SELECTED_ACCOUNT = "__all__";
const VALID_PERIOD_MODES = new Set<TimePeriodMode>([
  "day",
  "week",
  "month",
  "quarter",
  "year",
  "all",
]);

export function getDefaultTransactionPagePreferences(): TransactionPagePreferences {
  return {
    periodMode: DEFAULT_PERIOD_MODE,
    selectedAccount: DEFAULT_SELECTED_ACCOUNT,
  };
}

export function loadStoredTransactionPagePreferences(): TransactionPagePreferences {
  const defaults = getDefaultTransactionPagePreferences();

  if (typeof localStorage === "undefined") {
    return defaults;
  }

  try {
    const raw = localStorage.getItem(TRANSACTION_PAGE_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<TransactionPagePreferences>;
    return {
      periodMode: VALID_PERIOD_MODES.has(parsed.periodMode as TimePeriodMode)
        ? (parsed.periodMode as TimePeriodMode)
        : defaults.periodMode,
      selectedAccount:
        typeof parsed.selectedAccount === "string" &&
        parsed.selectedAccount.length > 0
          ? parsed.selectedAccount
          : defaults.selectedAccount,
    };
  } catch {
    return defaults;
  }
}

export function resolveTransactionPagePreferences(
  accountNames: string[],
): TransactionPagePreferences {
  const preferences = loadStoredTransactionPagePreferences();

  if (
    preferences.selectedAccount === DEFAULT_SELECTED_ACCOUNT ||
    accountNames.includes(preferences.selectedAccount)
  ) {
    return preferences;
  }

  return {
    ...preferences,
    selectedAccount: DEFAULT_SELECTED_ACCOUNT,
  };
}

export function saveTransactionPagePreferences(
  preferences: TransactionPagePreferences,
): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      TRANSACTION_PAGE_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Ignore storage failures.
  }
}
