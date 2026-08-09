import type { DashboardAccountTypeKey } from "@money-insight/ui/types";

export const MASKED_ACCOUNT_VALUE = "••••";

export const ACCOUNT_TYPE_LABELS: Record<DashboardAccountTypeKey, string> = {
  cash: "Cash",
  bank_account: "Bank account",
  credit_card: "Credit card",
  investment: "Investment",
  savings: "Savings",
  __other__: "Other / unclassified",
};

export function getAccountTypeLabel(key: DashboardAccountTypeKey): string {
  return ACCOUNT_TYPE_LABELS[key];
}

export function getAccountTypeSelectionSummary(
  selection: readonly DashboardAccountTypeKey[] | null,
): string {
  if (!selection || selection.length === 0) return "Not configured";
  if (selection.length === 1) {
    return getAccountTypeLabel(selection[0]);
  }
  return `${selection.length} account types selected`;
}

export function formatAccountValue(
  value: number,
  currency: string,
  valuesHidden = false,
): string {
  if (valuesHidden) return MASKED_ACCOUNT_VALUE;

  const currencyCode = currency.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(currencyCode)) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      // Fall through for unknown but syntactically valid currency codes.
    }
  }

  const amount = value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  return `${currencyCode || "Unknown"} ${amount}`;
}

export function hasKnownHistory(
  points: readonly { value: number | null }[],
): boolean {
  return points.some((point) => point.value !== null);
}
