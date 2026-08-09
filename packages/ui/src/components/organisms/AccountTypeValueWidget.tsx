import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@money-insight/ui/components/atoms";
import type { DashboardAccountTypeKey } from "@money-insight/ui/types";
import type { AccountTypeValueHistory } from "@money-insight/ui/services/account-type-value-history";
import { AccountTypeValueChart } from "./AccountTypeValueChart";
import { AccountTypeValueWidgetConfig } from "./AccountTypeValueWidgetConfig";
import {
  formatAccountValue,
  getAccountTypeSelectionSummary,
  hasKnownHistory,
} from "./account-type-value-widget-helpers";

export interface AccountTypeValueWidgetProps {
  selectedAccountTypes: readonly DashboardAccountTypeKey[] | null;
  histories: readonly AccountTypeValueHistory[];
  isLoading: boolean;
  error: string | null;
  valuesHidden: boolean;
  onSaveSelection: (
    selection: readonly DashboardAccountTypeKey[],
  ) => Promise<void>;
  onRetry: () => Promise<void>;
}

export function AccountTypeValueWidget({
  selectedAccountTypes,
  histories,
  isLoading,
  error,
  valuesHidden,
  onSaveSelection,
  onRetry,
}: AccountTypeValueWidgetProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const hasSelection = Boolean(selectedAccountTypes?.length);

  const handleOpenChange = (open: boolean) => {
    if (open) setSaveError(null);
    setIsConfigOpen(open);
  };

  const handleSave = async (selection: readonly DashboardAccountTypeKey[]) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveSelection(selection);
      setIsConfigOpen(false);
    } catch (saveFailure) {
      setSaveError(
        saveFailure instanceof Error
          ? saveFailure.message
          : "Unable to save selection",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <section aria-labelledby="account-value-widget-title" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="font-heading text-lg font-semibold text-foreground"
            id="account-value-widget-title"
          >
            Account value
          </h2>
          <p className="text-sm text-muted-foreground">
            Current balances and completed month-end history by currency.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uses all accounts and is unaffected by dashboard filters.
          </p>
        </div>
        <AccountTypeValueWidgetConfig
          disabled={isLoading || isRetrying}
          error={saveError}
          isSaving={isSaving}
          onOpenChange={handleOpenChange}
          onSave={handleSave}
          open={isConfigOpen}
          selectedAccountTypes={selectedAccountTypes}
        />
      </div>

      {isLoading ? (
        <Card aria-busy="true">
          <CardContent className="space-y-3 p-4 sm:p-6">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-8 w-56 animate-pulse rounded bg-muted" />
            <p className="text-sm text-muted-foreground">
              Loading widget preferences…
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button
              disabled={isRetrying}
              onClick={handleRetry}
              size="sm"
              variant="outline"
            >
              {isRetrying ? "Retrying…" : "Retry"}
            </Button>
          </AlertDescription>
        </Alert>
      ) : !hasSelection ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:p-6">
            <p className="font-medium text-foreground">
              No account types selected
            </p>
            <p className="text-sm text-muted-foreground">
              Configure this widget to see balances for Cash, Bank account, or
              another account type.
            </p>
          </CardContent>
        </Card>
      ) : histories.length === 0 ? (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="font-medium text-foreground">No matching accounts</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The selected account types do not have any accounts yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {getAccountTypeSelectionSummary(selectedAccountTypes)}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {histories.map((history) => {
              const currentValue = formatAccountValue(
                history.currentBalance,
                history.currency,
                valuesHidden,
              );
              const trailingValue = formatAccountValue(
                history.trailingMetric.value,
                history.currency,
                valuesHidden,
              );
              return (
                <Card key={history.currency}>
                  <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
                    <CardTitle className="flex items-center justify-between gap-3 text-base">
                      <span>{history.currency || "Unknown currency"}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        Current balance
                      </span>
                    </CardTitle>
                    <p
                      aria-label={
                        valuesHidden
                          ? `${history.currency} current balance hidden`
                          : `${history.currency} current balance ${currentValue}`
                      }
                      className="font-heading text-2xl font-bold text-foreground"
                      title={
                        valuesHidden ? "Current balance hidden" : undefined
                      }
                    >
                      {currentValue}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                      <span className="text-xs text-muted-foreground">
                        {history.trailingMetric.label}
                      </span>
                      <span
                        aria-label={
                          valuesHidden
                            ? `${history.currency} ${history.trailingMetric.label} hidden`
                            : `${history.currency} ${history.trailingMetric.label} ${trailingValue}`
                        }
                        className="text-sm font-semibold text-foreground"
                        title={
                          valuesHidden
                            ? `${history.trailingMetric.label} hidden`
                            : undefined
                        }
                      >
                        {trailingValue}
                      </span>
                    </div>
                    <AccountTypeValueChart
                      currency={history.currency}
                      points={history.monthEndBalances}
                      valuesHidden={valuesHidden}
                    />
                    {!valuesHidden &&
                    !hasKnownHistory(history.monthEndBalances) ? (
                      <p className="text-xs text-muted-foreground">
                        Net change is shown because no completed month-end is
                        available.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
