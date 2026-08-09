import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@money-insight/ui/components/atoms";
import { getAccountTypeLabel } from "./account-type-value-widget-helpers";
import type { DashboardAccountTypeKey } from "@money-insight/ui/types";
import { DASHBOARD_ACCOUNT_TYPE_KEYS } from "@money-insight/ui/types";
import { Settings2 } from "lucide-react";

export interface AccountTypeValueWidgetConfigProps {
  open: boolean;
  selectedAccountTypes: readonly DashboardAccountTypeKey[] | null;
  isSaving: boolean;
  disabled?: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (selection: readonly DashboardAccountTypeKey[]) => Promise<void>;
}

export function AccountTypeValueWidgetConfig({
  open,
  selectedAccountTypes,
  isSaving,
  disabled = false,
  error,
  onOpenChange,
  onSave,
}: AccountTypeValueWidgetConfigProps) {
  const [draftSelection, setDraftSelection] = useState<
    DashboardAccountTypeKey[]
  >([]);

  useEffect(() => {
    if (open) setDraftSelection([...(selectedAccountTypes ?? [])]);
  }, [open, selectedAccountTypes]);

  const toggleSelection = (key: DashboardAccountTypeKey) => {
    setDraftSelection((current) =>
      current.includes(key)
        ? current.filter((selected) => selected !== key)
        : [...current, key],
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(draftSelection);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          aria-label="Configure account value widget"
          className="shrink-0"
          disabled={disabled || isSaving}
          size="sm"
          variant="outline"
        >
          <Settings2 aria-hidden="true" />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Configure account value</DialogTitle>
            <DialogDescription>
              Choose account types to include in the balance history widget.
              Values remain separated by currency.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="mt-5 space-y-2">
            <legend className="mb-2 text-sm font-medium text-foreground">
              Account types
            </legend>
            {DASHBOARD_ACCOUNT_TYPE_KEYS.map((key) => (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 transition-colors hover:bg-muted"
                key={key}
              >
                <input
                  checked={draftSelection.includes(key)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                  onChange={() => toggleSelection(key)}
                  type="checkbox"
                />
                <span className="text-sm text-foreground">
                  {getAccountTypeLabel(key)}
                </span>
              </label>
            ))}
          </fieldset>

          {error ? (
            <p
              aria-live="polite"
              className="mt-4 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <Button
              className="sm:mr-auto"
              disabled={disabled || isSaving || draftSelection.length === 0}
              onClick={() => setDraftSelection([])}
              type="button"
              variant="ghost"
            >
              Clear all
            </Button>
            <Button
              disabled={disabled || isSaving}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={disabled || isSaving} type="submit">
              {isSaving ? "Saving…" : "Save selection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
