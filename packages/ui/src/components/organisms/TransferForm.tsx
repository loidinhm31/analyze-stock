import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ArrowRight, CreditCard, DollarSign, Trash2 } from "lucide-react";
import {
  Button,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@money-insight/ui/components/atoms";
import { DatePicker, FormField, SearchablePicker, type SearchablePickerOption } from "@money-insight/ui/components/molecules";
import { getTransferUserNote } from "@money-insight/ui/services/transferService";
import { useLastFormValues } from "@money-insight/ui/hooks";
import { cn, formatNumericInput, parseNumericInput } from "@money-insight/ui/lib";
import { SUPPORTED_CURRENCIES } from "@money-insight/shared";
import type { Transaction, Account, TransferParams } from "@money-insight/ui/types";

interface TransferFormBaseProps {
  accounts: Account[];
  isDbReady: boolean;
  onCancel: () => void;
  initialFromAccount?: string;
  initialToAccount?: string;
}

interface TransferFormAddProps extends TransferFormBaseProps {
  mode: "add";
  onSubmit: (params: TransferParams) => Promise<void>;
}

interface TransferFormEditProps extends TransferFormBaseProps {
  mode: "edit";
  transferId: string;
  outgoing: Transaction;
  incoming: Transaction;
  onSubmit: (transferId: string, params: TransferParams) => Promise<void>;
  onDelete: (transferId: string) => Promise<void>;
}

export type TransferFormProps = TransferFormAddProps | TransferFormEditProps;

export function TransferForm(props: TransferFormProps) {
  const { mode, accounts, isDbReady, onCancel } = props;

  const { save, getLastDate, getLastFromAccount, getLastToAccount } =
    useLastFormValues(accounts.map((a) => a.name));

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [fromAccount, setFromAccount] = useState(() =>
    mode === "add" ? props.initialFromAccount || getLastFromAccount() : "",
  );
  const [toAccount, setToAccount] = useState(() =>
    mode === "add" ? props.initialToAccount || getLastToAccount() : "",
  );
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [date, setDate] = useState<Date>(() =>
    mode === "add" ? getLastDate() : new Date(),
  );
  const [note, setNote] = useState("");
  const [excludeReport, setExcludeReport] = useState(true);

  const accountOptions = useMemo<SearchablePickerOption[]>(
    () => accounts.map((acc) => ({ value: acc.name, label: acc.name })),
    [accounts],
  );

  const outgoing = mode === "edit" ? props.outgoing : undefined;
  const incoming = mode === "edit" ? props.incoming : undefined;

  useEffect(() => {
    if (mode === "edit" && outgoing && incoming) {
      setFromAccount(outgoing.account);
      setToAccount(incoming.account);
      setAmount(formatNumericInput(String(Math.abs(outgoing.amount))));
      setCurrency(outgoing.currency);
      setDate(new Date(outgoing.date));
      setNote(getTransferUserNote(outgoing.note));
      setExcludeReport(outgoing.excludeReport && incoming.excludeReport);
      setConfirmDelete(false);
    }
  // Include all fields read by the effect so the form reinitializes when
  // the same transfer is updated (ids unchanged, but amounts/accounts differ).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    outgoing?.id,
    incoming?.id,
    outgoing?.amount,
    outgoing?.account,
    incoming?.account,
    outgoing?.date,
    outgoing?.currency,
    outgoing?.note,
  ]);

  function resetForm() {
    setFromAccount("");
    setToAccount("");
    setAmount("");
    setCurrency("VND");
    setDate(new Date());
    setNote("");
    setExcludeReport(true);
    setConfirmDelete(false);
  }

  function buildParams(): TransferParams {
    return {
      fromAccount: fromAccount.trim(),
      toAccount: toAccount.trim(),
      amount: parseNumericInput(amount),
      date: format(date, "yyyy-MM-dd"),
      note,
      currency,
      excludeReport,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitError(null);

    if (!amount || parseNumericInput(amount) <= 0 || !fromAccount || !toAccount) return;
    if (fromAccount.trim() === toAccount.trim()) return;

    setLoading(true);
    try {
      if (mode === "edit") {
        await props.onSubmit(props.transferId, buildParams());
      } else {
        await props.onSubmit(buildParams());
        save({ date: date.toISOString(), fromAccount, toAccount });
        resetForm();
      }
      onCancel();
    } catch (error) {
      console.error("Failed to save transfer:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (mode !== "edit") return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await props.onDelete(props.transferId);
      onCancel();
    } catch (error) {
      console.error("Failed to delete transfer:", error);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const formId = mode === "edit" ? "edit" : "add";

  const isSameAccount =
    fromAccount.trim() !== "" &&
    toAccount.trim() !== "" &&
    fromAccount.trim() === toAccount.trim();

  const canSubmit =
    !!amount &&
    parseNumericInput(amount) > 0 &&
    !!fromAccount.trim() &&
    !!toAccount.trim() &&
    !isSameAccount;

  return (
    <>
      <DialogHeader className="sticky top-0 z-10 px-6 pt-6 pb-4 flex-shrink-0">
        <DialogTitle>
          {mode === "edit" ? "Edit Transfer" : "New Transfer"}
        </DialogTitle>
        <DialogDescription>
          {mode === "edit"
            ? "Update the transfer between accounts."
            : "Move money between your accounts."}
        </DialogDescription>
      </DialogHeader>

      <div
        className="overflow-y-auto px-6 py-4 flex-1"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} id={`transfer-form-${formId}`}>
          <div className="grid gap-4">
            {/* From → To accounts */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField label="From Account" id="transfer-from" required>
                  <SearchablePicker
                    value={fromAccount}
                    onChange={(value) => {
                      setSubmitError(null);
                      setFromAccount(value);
                    }}
                    options={accountOptions}
                    placeholder="Search account"
                    searchPlaceholder="Search account..."
                    emptyMessage="No accounts found."
                    disabled={accounts.length === 0}
                    triggerId="transfer-from"
                    renderTriggerValue={(value) => (
                      <span className="flex items-center gap-2 truncate">
                        <CreditCard className="h-4 w-4 text-(--color-text-muted)" />
                        <span className={cn("truncate", !value && "text-(--color-text-muted)")}>
                          {value || "Search account"}
                        </span>
                      </span>
                    )}
                    renderOptionIcon={() => (
                      <CreditCard className="h-4 w-4 text-(--color-text-muted)" />
                    )}
                  />
                </FormField>
              </div>

              <div className="pb-[2px] flex-shrink-0">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex-1">
                <FormField label="To Account" id="transfer-to" required>
                  <SearchablePicker
                    value={toAccount}
                    onChange={(value) => {
                      setSubmitError(null);
                      setToAccount(value);
                    }}
                    options={accountOptions}
                    placeholder="Search account"
                    searchPlaceholder="Search account..."
                    emptyMessage="No accounts found."
                    disabled={accounts.length === 0}
                    triggerId="transfer-to"
                    renderTriggerValue={(value) => (
                      <span className="flex items-center gap-2 truncate">
                        <CreditCard className="h-4 w-4 text-(--color-text-muted)" />
                        <span className={cn("truncate", !value && "text-(--color-text-muted)")}>
                          {value || "Search account"}
                        </span>
                      </span>
                    )}
                    renderOptionIcon={() => (
                      <CreditCard className="h-4 w-4 text-(--color-text-muted)" />
                    )}
                  />
                </FormField>
              </div>
            </div>
            {accounts.length === 0 && (
              <p className="text-xs text-muted-foreground -mt-2">
                Create an account first to transfer money between accounts.
              </p>
            )}

            {isSameAccount && (
              <p className="text-xs text-destructive -mt-2">
                From and To accounts must be different.
              </p>
            )}

            {/* Amount + currency */}
            <FormField
              label="Amount"
              id="transfer-amount"
              icon={<DollarSign className="h-4 w-4" />}
              required
            >
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setSubmitError(null);
                    setAmount(formatNumericInput(e.target.value));
                  }}
                  placeholder="0"
                  className="flex-1"
                  required
                />
                <Select value={currency} onValueChange={(v) => { setSubmitError(null); setCurrency(v); }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormField>

            {/* Date */}
            <FormField label="Date" id="transfer-date">
              <DatePicker
                date={date}
                onDateChange={(d) => d && setDate(d)}
                className="w-full"
              />
            </FormField>

            {/* Note */}
            <FormField
              label="Note"
              id="transfer-note"
              type="text"
              value={note}
              onChange={(e) => { setSubmitError(null); setNote(e.target.value); }}
              placeholder="Optional description"
            />

            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start gap-3">
                <input
                  id="transfer-exclude-report"
                  type="checkbox"
                  checked={excludeReport}
                  onChange={(e) => {
                    setSubmitError(null);
                    setExcludeReport(e.target.checked);
                  }}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary"
                />
                <div className="space-y-1">
                  <Label htmlFor="transfer-exclude-report">
                    Exclude from report
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    These transactions will be excluded from report in both
                    accounts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
        {submitError && (
          <p className="text-sm text-destructive mb-3">{submitError}</p>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {mode === "edit" && (
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
            form={`transfer-form-${formId}`}
            disabled={loading || deleting || !canSubmit || !isDbReady}
          >
            {loading
              ? mode === "edit"
                ? "Saving..."
                : "Transferring..."
              : mode === "edit"
                ? "Save Changes"
                : "Transfer"}
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
