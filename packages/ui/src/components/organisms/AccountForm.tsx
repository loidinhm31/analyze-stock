import { useState, useEffect, useMemo } from "react";
import { Trash2, DollarSign, CreditCard, Tag } from "lucide-react";
import {
  AccountIcon,
  ACCOUNT_ICONS,
  ACCOUNT_TYPE_ICON,
  Button,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@money-insight/ui/components/atoms";
import { FormField } from "@money-insight/ui/components/molecules";
import {
  cn,
  formatNumericInput,
  deriveCreditCardStatementDates,
  isCreditCardPaymentReminderComplete,
  normalizeDateOnlyToIso,
  parseNumericInput,
} from "@money-insight/ui/lib";
import type { Account, NewAccount } from "@money-insight/ui/types";

interface BaseAccountFormProps {
  onCancel: () => void;
}

interface AddAccountFormProps extends BaseAccountFormProps {
  mode: "add";
  account?: never;
  onSubmit: (account: NewAccount) => Promise<void>;
  onDelete?: never;
}

interface EditAccountFormProps extends BaseAccountFormProps {
  mode: "edit";
  account: Account;
  onSubmit: (account: Account) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export type AccountFormProps = AddAccountFormProps | EditAccountFormProps;

function resolveIcon(iconVal: string | undefined, type: string): string {
  return iconVal && ACCOUNT_ICONS[iconVal]
    ? iconVal
    : (ACCOUNT_TYPE_ICON[type] ?? "cash");
}

function canonicalCycleStartDate(value: string | undefined): string {
  if (!value) return "";
  try {
    return normalizeDateOnlyToIso(value);
  } catch {
    return "";
  }
}

export function AccountForm(props: AccountFormProps) {
  const { mode, onCancel } = props;
  const account = mode === "edit" ? props.account : undefined;
  const onDelete = mode === "edit" ? props.onDelete : undefined;

  const [name, setName] = useState(account?.name || "");
  const [accountType, setAccountType] = useState(
    account?.accountType || "Cash",
  );
  const [icon, setIcon] = useState(() =>
    resolveIcon(account?.icon, account?.accountType || "Cash"),
  );
  const [initialBalance, setInitialBalance] = useState(
    account
      ? formatNumericInput(account.initialBalance.toString(), {
          allowNegative: true,
        })
      : "0",
  );
  const [currency, setCurrency] = useState(account?.currency || "VND");
  const [paymentReminderEnabled, setPaymentReminderEnabled] = useState(
    account?.paymentReminderEnabled === true,
  );
  const [paymentCycleStartDate, setPaymentCycleStartDate] = useState(
    canonicalCycleStartDate(account?.paymentCycleStartDate),
  );
  const [interestFreeDays, setInterestFreeDays] = useState(
    account?.interestFreeDays?.toString() ?? "",
  );
  const [paymentCycleStartDateError, setPaymentCycleStartDateError] =
    useState<string>();
  const [interestFreeDaysError, setInterestFreeDaysError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  // Reset form when switching between add/edit or when account changes
  useEffect(() => {
    if (mode === "edit" && account) {
      const type = account.accountType || "Cash";
      setName(account.name);
      setAccountType(type);
      setIcon(resolveIcon(account.icon, type));
      setInitialBalance(
        formatNumericInput(account.initialBalance.toString(), {
          allowNegative: true,
        }),
      );
      setCurrency(account.currency);
      setPaymentReminderEnabled(account.paymentReminderEnabled === true);
      setPaymentCycleStartDate(
        canonicalCycleStartDate(account.paymentCycleStartDate),
      );
      setInterestFreeDays(account.interestFreeDays?.toString() ?? "");
      setPaymentCycleStartDateError(undefined);
      setInterestFreeDaysError(undefined);
      setConfirmDelete(false);
      setSaveError(undefined);
    } else if (mode === "add") {
      setName("");
      setAccountType("Cash");
      setIcon("cash");
      setInitialBalance("0");
      setCurrency("VND");
      setPaymentReminderEnabled(false);
      setPaymentCycleStartDate("");
      setInterestFreeDays("");
      setPaymentCycleStartDateError(undefined);
      setInterestFreeDaysError(undefined);
      setConfirmDelete(false);
      setSaveError(undefined);
    }
  }, [mode, account]);

  const isCreditCard = accountType === "Credit Card";
  const parsedInterestFreeDays = Number(interestFreeDays);
  const statementPreview = useMemo(() => {
    if (
      !isCreditCard ||
      !paymentReminderEnabled ||
      !paymentCycleStartDate ||
      !Number.isSafeInteger(parsedInterestFreeDays) ||
      parsedInterestFreeDays < 1
    ) {
      return undefined;
    }
    try {
      return deriveCreditCardStatementDates(
        paymentCycleStartDate,
        parsedInterestFreeDays,
      );
    } catch {
      return undefined;
    }
  }, [
    isCreditCard,
    parsedInterestFreeDays,
    paymentCycleStartDate,
    paymentReminderEnabled,
  ]);
  const existingReminderNeedsSetup =
    isCreditCard &&
    paymentReminderEnabled &&
    mode === "edit" &&
    account?.paymentReminderEnabled === true &&
    !isCreditCardPaymentReminderComplete(account);

  function getPaymentCycleStartDay(): number | undefined {
    if (!paymentCycleStartDate) return undefined;
    if (
      mode === "edit" &&
      account?.paymentCycleStartDate === paymentCycleStartDate &&
      account.paymentCycleStartDay !== undefined
    ) {
      return account.paymentCycleStartDay;
    }
    return Number(paymentCycleStartDate.slice(8, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    if (isCreditCard && paymentReminderEnabled) {
      let hasPaymentConfigError = false;
      if (!paymentCycleStartDate || !statementPreview) {
        setPaymentCycleStartDateError("Choose a valid cycle start date.");
        hasPaymentConfigError = true;
      }
      if (
        !Number.isSafeInteger(parsedInterestFreeDays) ||
        parsedInterestFreeDays < 1
      ) {
        setInterestFreeDaysError("Enter a whole number of at least 1.");
        hasPaymentConfigError = true;
      }
      if (hasPaymentConfigError) return;
    }

    setLoading(true);
    setSaveError(undefined);

    try {
      const numericBalance = parseNumericInput(initialBalance) || 0;

      if (mode === "edit" && account) {
        const updatedAccount: Account = {
          ...account,
          name: name.trim(),
          accountType: accountType || undefined,
          icon: icon || undefined,
          initialBalance: numericBalance,
          currency,
          paymentReminderEnabled: isCreditCard && paymentReminderEnabled,
          paymentDueDay: undefined,
          paymentCycleStartDate:
            isCreditCard && paymentReminderEnabled
              ? paymentCycleStartDate
              : undefined,
          paymentCycleStartDay:
            isCreditCard && paymentReminderEnabled
              ? getPaymentCycleStartDay()
              : undefined,
          interestFreeDays:
            isCreditCard && paymentReminderEnabled
              ? parsedInterestFreeDays
              : undefined,
          nextPaymentDueDate:
            isCreditCard && paymentReminderEnabled
              ? statementPreview?.payment_due_date
              : undefined,
          ...(isCreditCard && paymentReminderEnabled
            ? {}
            : {
                paymentCycleStartDate: undefined,
                paymentCycleStartDay: undefined,
                interestFreeDays: undefined,
                nextPaymentDueDate: undefined,
                lastPaymentConfirmedDueDate: undefined,
                lastPaymentConfirmedAt: undefined,
              }),
          updatedAt: new Date().toISOString(),
        };

        await props.onSubmit(updatedAccount);
      } else if (mode === "add") {
        const newAccount: NewAccount = {
          name: name.trim(),
          accountType: accountType || undefined,
          icon: icon || undefined,
          initialBalance: numericBalance,
          currency,
          paymentReminderEnabled: isCreditCard && paymentReminderEnabled,
          paymentDueDay: undefined,
          paymentCycleStartDate:
            isCreditCard && paymentReminderEnabled
              ? paymentCycleStartDate
              : undefined,
          paymentCycleStartDay:
            isCreditCard && paymentReminderEnabled
              ? getPaymentCycleStartDay()
              : undefined,
          interestFreeDays:
            isCreditCard && paymentReminderEnabled
              ? parsedInterestFreeDays
              : undefined,
          nextPaymentDueDate:
            isCreditCard && paymentReminderEnabled
              ? statementPreview?.payment_due_date
              : undefined,
        };

        await props.onSubmit(newAccount);
      }

      onCancel();
    } catch (error) {
      console.error("Failed to save account:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save account. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || !account) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await onDelete(account.id);
      onCancel();
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const isEdit = mode === "edit";

  return (
    <>
      {/* Sticky Header */}
      <DialogHeader className="sticky top-0 z-10 px-6 pt-6 pb-4 flex-shrink-0">
        <DialogTitle>{isEdit ? "Edit Account" : "Add New Account"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the account details."
            : "Create a new account to track your finances."}
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div
        className="overflow-y-auto px-6 py-4 flex-1"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} id="account-form">
          <div className="grid gap-4">
            {/* Name */}
            <FormField
              label="Name"
              id="account-name"
              icon={<Tag className="h-4 w-4" />}
              required
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaveError(undefined);
              }}
              placeholder="e.g., Main Wallet, Savings, Credit Card"
              disabled={loading || deleting}
              error={saveError}
            />

            {/* Account Type */}
            <FormField
              label="Account Type"
              id="account-type"
              icon={<CreditCard className="h-4 w-4" />}
            >
              <Select
                value={accountType}
                disabled={loading || deleting}
                onValueChange={(val) => {
                  setAccountType(val);
                  setIcon(ACCOUNT_TYPE_ICON[val] ?? "cash");
                  if (val !== "Credit Card") {
                    setPaymentReminderEnabled(false);
                    setPaymentCycleStartDate("");
                    setInterestFreeDays("");
                    setPaymentCycleStartDateError(undefined);
                    setInterestFreeDaysError(undefined);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Account">Bank Account</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {isCreditCard && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="payment-reminder-enabled"
                      className="text-sm font-medium leading-none"
                    >
                      Payment reminder
                    </label>
                    <p
                      id="payment-reminder-hint"
                      className="text-xs text-muted-foreground"
                    >
                      Starts three days before the due date and repeats daily
                      until payment is confirmed.
                    </p>
                  </div>
                  <input
                    id="payment-reminder-enabled"
                    type="checkbox"
                    checked={paymentReminderEnabled}
                    disabled={loading || deleting}
                    aria-describedby="payment-reminder-hint"
                    onChange={(event) => {
                      setPaymentReminderEnabled(event.target.checked);
                      setPaymentCycleStartDateError(undefined);
                      setInterestFreeDaysError(undefined);
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                  />
                </div>

                {paymentReminderEnabled && (
                  <div className="space-y-3">
                    {existingReminderNeedsSetup && (
                      <p
                        className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground"
                        role="status"
                      >
                        Needs setup: choose a cycle start date and interest-free
                        days before reminders or payment confirmation can run.
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="payment-cycle-start-date"
                          className="text-sm font-medium"
                        >
                          Cycle start date
                        </label>
                        <Input
                          id="payment-cycle-start-date"
                          type="date"
                          value={paymentCycleStartDate}
                          disabled={loading || deleting}
                          required={isCreditCard && paymentReminderEnabled}
                          aria-invalid={!!paymentCycleStartDateError}
                          aria-describedby={
                            paymentCycleStartDateError
                              ? "payment-cycle-start-date-error"
                              : "payment-cycle-start-date-hint"
                          }
                          onInvalid={(event) => {
                            event.preventDefault();
                            setPaymentCycleStartDateError(
                              "Choose a valid cycle start date.",
                            );
                          }}
                          onChange={(event) => {
                            setPaymentCycleStartDate(event.target.value);
                            setPaymentCycleStartDateError(undefined);
                          }}
                        />
                        <p
                          id="payment-cycle-start-date-hint"
                          className="text-xs text-muted-foreground"
                        >
                          This first day is included in each statement cycle.
                        </p>
                        {paymentCycleStartDateError && (
                          <p
                            id="payment-cycle-start-date-error"
                            className="text-xs text-destructive"
                            role="alert"
                          >
                            {paymentCycleStartDateError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="interest-free-days"
                          className="text-sm font-medium"
                        >
                          Interest-free days
                        </label>
                        <Input
                          id="interest-free-days"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          value={interestFreeDays}
                          disabled={loading || deleting}
                          required={isCreditCard && paymentReminderEnabled}
                          aria-invalid={!!interestFreeDaysError}
                          aria-describedby={
                            interestFreeDaysError
                              ? "interest-free-days-error"
                              : "interest-free-days-hint"
                          }
                          onInvalid={(event) => {
                            event.preventDefault();
                            setInterestFreeDaysError(
                              "Enter a whole number of at least 1.",
                            );
                          }}
                          onChange={(event) => {
                            setInterestFreeDays(event.target.value);
                            setInterestFreeDaysError(undefined);
                          }}
                        />
                        <p
                          id="interest-free-days-hint"
                          className="text-xs text-muted-foreground"
                        >
                          Number of days from cycle start until payment is due.
                        </p>
                        {interestFreeDaysError && (
                          <p
                            id="interest-free-days-error"
                            className="text-xs text-destructive"
                            role="alert"
                          >
                            {interestFreeDaysError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="payment-issue-date"
                          className="text-sm font-medium"
                        >
                          Payment issue date
                        </label>
                        <Input
                          id="payment-issue-date"
                          value={
                            statementPreview?.payment_issue_date ??
                            "Calculated after setup"
                          }
                          readOnly
                          aria-readonly="true"
                          aria-describedby="calculated-payment-dates-hint"
                          className="bg-muted text-muted-foreground"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="payment-due-date"
                          className="text-sm font-medium"
                        >
                          Payment due date
                        </label>
                        <Input
                          id="payment-due-date"
                          value={
                            statementPreview?.payment_due_date ??
                            "Calculated after setup"
                          }
                          readOnly
                          aria-readonly="true"
                          aria-describedby="calculated-payment-dates-hint"
                          className="bg-muted text-muted-foreground"
                        />
                      </div>
                    </div>
                    <p
                      id="calculated-payment-dates-hint"
                      className="text-xs text-muted-foreground"
                    >
                      Both dates are calculated; statement date is not entered
                      manually.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Icon picker */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium leading-none">Icon</span>
              <div className="flex gap-2">
                {Object.entries(ACCOUNT_ICONS).map(([key, entry]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    disabled={loading || deleting}
                    title={entry.label}
                    className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-md border transition-colors hover:bg-accent",
                      icon === key
                        ? "border-(--color-primary-500) bg-(--color-primary-500)/10 ring-1 ring-(--color-primary-500)"
                        : "border-(--color-border-light)",
                    )}
                  >
                    <AccountIcon name={key} size={22} />
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Balance & Currency */}
            <FormField
              label="Opening Balance"
              id="account-balance"
              icon={<DollarSign className="h-4 w-4" />}
              required
            >
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={initialBalance}
                  disabled={loading || deleting}
                  onChange={(e) =>
                    setInitialBalance(
                      formatNumericInput(e.target.value, {
                        allowNegative: true,
                      }),
                    )
                  }
                  placeholder="0"
                  className="flex-1"
                  required
                />
                <Select
                  value={currency}
                  onValueChange={setCurrency}
                  disabled={loading || deleting}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">VND</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FormField>
          </div>
        </form>
      </div>

      {/* Fixed Footer */}
      <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEdit && onDelete && (
            <Button
              type="button"
              variant={confirmDelete ? "destructive" : "outline"}
              onClick={handleDelete}
              disabled={deleting || loading}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting
                ? "Deleting..."
                : confirmDelete
                  ? "Confirm Delete"
                  : "Delete"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading || deleting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="account-form"
            disabled={loading || deleting || !name.trim()}
          >
            {loading
              ? isEdit
                ? "Saving..."
                : "Adding..."
              : isEdit
                ? "Save Changes"
                : "Add Account"}
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
