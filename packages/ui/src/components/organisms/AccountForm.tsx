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
  deriveNextPaymentDueDate,
  getLocalIsoDate,
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
  const [paymentDueDay, setPaymentDueDay] = useState(
    account?.paymentDueDay?.toString() ?? "",
  );
  const [paymentDueDayError, setPaymentDueDayError] = useState<string>();
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
      setPaymentDueDay(account.paymentDueDay?.toString() ?? "");
      setPaymentDueDayError(undefined);
      setConfirmDelete(false);
      setSaveError(undefined);
    } else if (mode === "add") {
      setName("");
      setAccountType("Cash");
      setIcon("cash");
      setInitialBalance("0");
      setCurrency("VND");
      setPaymentReminderEnabled(false);
      setPaymentDueDay("");
      setPaymentDueDayError(undefined);
      setConfirmDelete(false);
      setSaveError(undefined);
    }
  }, [mode, account]);

  const isCreditCard = accountType === "Credit Card";
  const parsedPaymentDueDay = Number(paymentDueDay);
  const nextDueDate = useMemo(() => {
    if (
      !isCreditCard ||
      !paymentReminderEnabled ||
      !Number.isInteger(parsedPaymentDueDay) ||
      parsedPaymentDueDay < 1 ||
      parsedPaymentDueDay > 31
    ) {
      return "";
    }
    if (
      account?.paymentReminderEnabled &&
      account.paymentDueDay === parsedPaymentDueDay &&
      account.nextPaymentDueDate
    ) {
      return account.nextPaymentDueDate;
    }
    return deriveNextPaymentDueDate(parsedPaymentDueDay, getLocalIsoDate());
  }, [
    account?.nextPaymentDueDate,
    account?.paymentDueDay,
    account?.paymentReminderEnabled,
    isCreditCard,
    parsedPaymentDueDay,
    paymentReminderEnabled,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    const dueDay = Number(paymentDueDay);
    if (
      isCreditCard &&
      paymentReminderEnabled &&
      (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)
    ) {
      setPaymentDueDayError("Enter a due day from 1 to 31.");
      return;
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
          paymentDueDay:
            isCreditCard && paymentReminderEnabled ? dueDay : undefined,
          ...(isCreditCard && paymentReminderEnabled
            ? {}
            : {
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
          paymentDueDay:
            isCreditCard && paymentReminderEnabled ? dueDay : undefined,
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
                    setPaymentDueDay("");
                    setPaymentDueDayError(undefined);
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
                      setPaymentDueDayError(undefined);
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                  />
                </div>

                {paymentReminderEnabled && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="payment-due-day"
                        className="text-sm font-medium"
                      >
                        Monthly due day
                      </label>
                      <Input
                        id="payment-due-day"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={31}
                        value={paymentDueDay}
                        disabled={loading || deleting}
                        aria-invalid={!!paymentDueDayError}
                        aria-describedby={
                          paymentDueDayError
                            ? "payment-due-day-error"
                            : undefined
                        }
                        onInvalid={(event) => {
                          event.preventDefault();
                          setPaymentDueDayError(
                            "Enter a due day from 1 to 31.",
                          );
                        }}
                        onChange={(event) => {
                          setPaymentDueDay(event.target.value);
                          setPaymentDueDayError(undefined);
                        }}
                      />
                      {paymentDueDayError && (
                        <p
                          id="payment-due-day-error"
                          className="text-xs text-destructive"
                          role="alert"
                        >
                          {paymentDueDayError}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="next-payment-due-date"
                        className="text-sm font-medium"
                      >
                        Next due date
                      </label>
                      <Input
                        id="next-payment-due-date"
                        value={nextDueDate || "Enter a valid due day"}
                        readOnly
                        aria-readonly="true"
                        className="bg-muted text-muted-foreground"
                      />
                    </div>
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
