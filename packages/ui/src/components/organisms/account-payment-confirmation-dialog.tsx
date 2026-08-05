import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, CreditCard, DollarSign } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@money-insight/ui/components/atoms";
import {
  DatePicker,
  FormField,
  SearchablePicker,
  type SearchablePickerOption,
} from "@money-insight/ui/components/molecules";
import {
  cn,
  formatNumericInput,
  isCreditCardPaymentReminderComplete,
  parseNumericInput,
} from "@money-insight/ui/lib";
import type {
  Account,
  CreditCardPaymentConfirmationInput,
  CreditCardPaymentConfirmationResult,
} from "@money-insight/ui/types";

export interface AccountPaymentConfirmationDialogProps {
  account: Account | null;
  accounts: Account[];
  currentBalance: number;
  statementTotal?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    input: CreditCardPaymentConfirmationInput,
  ) => Promise<CreditCardPaymentConfirmationResult>;
}

export function AccountPaymentConfirmationDialog({
  account,
  accounts,
  currentBalance,
  statementTotal,
  open,
  onOpenChange,
  onSubmit,
}: AccountPaymentConfirmationDialogProps) {
  const [fundingAccountId, setFundingAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fundingAccounts = useMemo(
    () =>
      account
        ? accounts.filter(
            (candidate) =>
              candidate.id !== account.id &&
              candidate.currency === account.currency,
          )
        : [],
    [account, accounts],
  );
  const fundingAccountOptions = useMemo<SearchablePickerOption[]>(
    () =>
      fundingAccounts.map((candidate) => ({
        value: candidate.id,
        label: candidate.name,
      })),
    [fundingAccounts],
  );

  useEffect(() => {
    if (!open) return;
    setFundingAccountId("");
    setAmount(formatNumericInput(String(Math.max(0, -(statementTotal ?? 0)))));
    setPaymentDate(new Date());
    setNote("");
    setError(null);
  }, [account?.id, account?.nextPaymentDueDate, open, statementTotal]);

  const parsedAmount = parseNumericInput(amount);
  const paymentSetupComplete =
    !!account && isCreditCardPaymentReminderComplete(account);
  const statementCalculationUnavailable =
    !!account && paymentSetupComplete && statementTotal === null;
  const statementDueAmount =
    typeof statementTotal === "number" && Number.isFinite(statementTotal)
      ? Math.max(0, -statementTotal)
      : 0;
  const isClearingAmount =
    Number.isFinite(parsedAmount) &&
    statementDueAmount > 0 &&
    parsedAmount >= statementDueAmount;
  const canSubmit =
    !!account &&
    paymentSetupComplete &&
    !!account.nextPaymentDueDate &&
    !!fundingAccountId &&
    !!paymentDate &&
    parsedAmount > 0 &&
    isClearingAmount &&
    !statementCalculationUnavailable &&
    !isSubmitting;

  const resetAndClose = () => {
    if (isSubmitting) return;
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account || !account.nextPaymentDueDate || !paymentDate || !canSubmit)
      return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        accountId: account.id,
        expectedDueDate: account.nextPaymentDueDate,
        fundingAccountId,
        amount: parsedAmount,
        paymentDate: format(paymentDate, "yyyy-MM-dd"),
        note: note.trim() || undefined,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not confirm payment. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => nextOpen || resetAndClose()}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Confirm card payment</DialogTitle>
            <DialogDescription>
              Record payment for {account?.name ?? "this card"}
              {account?.nextPaymentDueDate
                ? ` — due ${account.nextPaymentDueDate}.`
                : "."}
              This creates an excluded transfer between your accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current statement amount to clear
              </p>
              <p
                className={cn(
                  "mt-1 text-lg font-semibold",
                  statementCalculationUnavailable
                    ? "text-warning-foreground"
                    : statementDueAmount > 0
                      ? "text-destructive"
                      : "text-success",
                )}
              >
                {statementCalculationUnavailable
                  ? "Unavailable"
                  : formatNumericInput(String(statementDueAmount))}{" "}
                {account?.currency}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Current account balance:{" "}
                {formatNumericInput(String(currentBalance))} {account?.currency}
              </p>
            </div>

            {account && !paymentSetupComplete && (
              <p
                className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground"
                role="status"
              >
                Needs setup: add cycle start date and interest-free days before
                confirming a payment.
              </p>
            )}

            {statementCalculationUnavailable && (
              <p
                className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground"
                role="alert"
              >
                The current statement could not be calculated. Check transaction
                dates and amounts before confirming payment.
              </p>
            )}

            <FormField
              label="Pay from"
              id="card-payment-funding-account"
              required
            >
              <SearchablePicker
                value={fundingAccountId}
                onChange={(value) => {
                  setFundingAccountId(value);
                  setError(null);
                }}
                options={fundingAccountOptions}
                placeholder="Choose a matching-currency account"
                searchPlaceholder="Search accounts..."
                emptyMessage="No other account uses this currency."
                disabled={isSubmitting || fundingAccountOptions.length === 0}
                triggerId="card-payment-funding-account"
                renderTriggerValue={(value) => {
                  const selected = fundingAccountOptions.find(
                    (option) => option.value === value,
                  );
                  return (
                    <span className="flex min-w-0 items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          !selected && "text-muted-foreground",
                        )}
                      >
                        {selected?.label ??
                          "Choose a matching-currency account"}
                      </span>
                    </span>
                  );
                }}
              />
            </FormField>

            <FormField
              label="Payment amount"
              id="card-payment-amount"
              icon={<DollarSign className="h-4 w-4" />}
              required
            >
              <Input
                id="card-payment-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                disabled={isSubmitting}
                aria-invalid={!!amount && !isClearingAmount}
                aria-describedby="card-payment-amount-hint"
                onChange={(event) => {
                  setAmount(formatNumericInput(event.target.value));
                  setError(null);
                }}
              />
              <p
                id="card-payment-amount-hint"
                className="mt-1 text-xs text-muted-foreground"
              >
                Payment must clear the current negative statement amount.
              </p>
              {!!amount && !isClearingAmount && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  Enter at least the amount needed to clear this statement.
                </p>
              )}
            </FormField>

            <FormField label="Payment date" id="card-payment-date" required>
              <DatePicker
                date={paymentDate}
                onDateChange={setPaymentDate}
                className="w-full min-h-11"
                disabled={isSubmitting}
              />
            </FormField>

            <FormField
              label="Note"
              id="card-payment-note"
              type="text"
              value={note}
              disabled={isSubmitting}
              onChange={(event) => {
                setNote(event.target.value);
                setError(null);
              }}
              placeholder="Optional note"
            />
          </div>

          {error && (
            <p
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={resetAndClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={!canSubmit}>
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Confirming..." : "Confirm payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
