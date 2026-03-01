import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { DollarSign, Tag, CreditCard, Trash2 } from "lucide-react";
import {
  Button,
  CategoryIcon,
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
import { DatePicker, FormField } from "@money-insight/ui/components/molecules";
import { cn } from "@money-insight/ui/lib";
import { SUPPORTED_CURRENCIES } from "@money-insight/shared";
import { useLastFormValues, useCategoryIcon } from "@money-insight/ui/hooks";
import type {
  Transaction,
  NewTransaction,
  Category,
  Account,
} from "@money-insight/ui/types";

interface BaseTransactionFormProps {
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  isDbReady: boolean;
  getCategories: () => Promise<Category[]>;
  getAccounts: () => Promise<Account[]>;
  onSuccess?: () => void;
}

interface AddTransactionFormProps extends BaseTransactionFormProps {
  mode: "add";
  transaction?: never;
  onSubmit: (transaction: NewTransaction) => Promise<void>;
}

interface EditTransactionFormProps extends BaseTransactionFormProps {
  mode: "edit";
  transaction: Transaction;
  onSubmit: (transaction: Transaction) => Promise<void>;
}

export type TransactionFormProps =
  | AddTransactionFormProps
  | EditTransactionFormProps;

export function TransactionForm(props: TransactionFormProps) {
  const {
    mode,
    onCancel,
    onDelete,
    isDbReady,
    getCategories,
    getAccounts,
    onSuccess,
  } = props;
  const transaction = mode === "edit" ? props.transaction : undefined;
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const { save, getLastDate, getLastAccount } = useLastFormValues(
    accounts.map((a) => a.name),
  );
  const { getIcon } = useCategoryIcon();
  // Ensures account is pre-filled only once per add-mode mount, after accounts load
  const accountPrefilledRef = useRef(false);

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState("VND");

  // Initialize form when transaction changes (edit mode)
  useEffect(() => {
    if (mode === "edit" && transaction) {
      setDate(new Date(transaction.date));
      setAmount(String(Math.abs(transaction.amount)));
      setIsExpense(transaction.amount < 0);
      setCategory(transaction.category);
      setAccount(transaction.account);
      setNote(transaction.note);
      setCurrency(transaction.currency);
      setConfirmDelete(false);
    } else if (mode === "add") {
      accountPrefilledRef.current = false;
      resetForm();
      setDate(getLastDate());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, transaction]);

  // Pre-fill last-used account after accounts load (add mode only)
  useEffect(() => {
    if (mode === "add" && accounts.length > 0 && !accountPrefilledRef.current) {
      accountPrefilledRef.current = true;
      setAccount(getLastAccount());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  // Load categories and accounts
  useEffect(() => {
    if (isDbReady) {
      loadOptions();
    }
  }, [isDbReady]);

  async function loadOptions() {
    try {
      const [cats, accs] = await Promise.all([getCategories(), getAccounts()]);
      setCategories(cats);
      setAccounts(accs);
    } catch (error) {
      console.error("Failed to load options:", error);
    }
  }

  function resetForm() {
    setDate(new Date());
    setAmount("");
    setIsExpense(true);
    setCategory("");
    setAccount("");
    setNote("");
    setCurrency("VND");
    setConfirmDelete(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitError(null);

    if (!amount.trim() || parseFloat(amount) <= 0 || !category.trim()) {
      setSubmitError("Please enter a valid amount and category.");
      return;
    }

    setLoading(true);

    try {
      const numericAmount = parseFloat(amount);
      const finalAmount = isExpense
        ? -Math.abs(numericAmount)
        : Math.abs(numericAmount);

      if (mode === "edit" && transaction) {
        const parsedDate = date;
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth() + 1;

        const updatedTransaction: Transaction = {
          ...transaction,
          note,
          amount: finalAmount,
          category,
          account: account || "Cash",
          currency,
          date: format(date, "yyyy-MM-dd"),
          expense: finalAmount < 0 ? Math.abs(finalAmount) : 0,
          income: finalAmount > 0 ? finalAmount : 0,
          yearMonth: `${year}-${String(month).padStart(2, "0")}`,
          year,
          month,
          updatedAt: new Date().toISOString(),
        };

        await props.onSubmit(updatedTransaction);
      } else if (mode === "add") {
        const newTransaction: NewTransaction = {
          note,
          amount: finalAmount,
          category,
          account: account || "Cash",
          currency,
          date: format(date, "yyyy-MM-dd"),
          excludeReport: false,
          source: "manual",
        };

        await props.onSubmit(newTransaction);
        save({ date: date.toISOString(), account });
        resetForm();
      }

      onSuccess?.();
      onCancel();
    } catch (error) {
      console.error("Failed to save transaction:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await onDelete();
      onCancel();
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const isEdit = mode === "edit";
  const formId = isEdit ? "edit" : "add";

  return (
    <>
      {/* Sticky Header */}
      <DialogHeader className="sticky top-0 z-10 px-6 pt-6 pb-4 flex-shrink-0">
        <DialogTitle>
          {isEdit ? "Edit Transaction" : "Add New Transaction"}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the transaction details."
            : "Manually add a spending or income transaction."}
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div
        className="overflow-y-auto px-6 py-4 flex-1"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} id={`transaction-form-${formId}`}>
          <div className="grid gap-4">
            {/* Transaction Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isExpense ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  isExpense && "bg-red-600 hover:bg-red-700",
                )}
                onClick={() => { setSubmitError(null); setIsExpense(true); }}
              >
                Expense
              </Button>
              <Button
                type="button"
                variant={!isExpense ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  !isExpense && "bg-green-600 hover:bg-green-700",
                )}
                onClick={() => { setSubmitError(null); setIsExpense(false); }}
              >
                Income
              </Button>
            </div>

            {/* Amount */}
            <FormField
              label="Amount"
              id={`${formId}-amount`}
              icon={<DollarSign className="h-4 w-4" />}
              required
            >
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  value={amount}
                  onChange={(e) => { setSubmitError(null); setAmount(e.target.value); }}
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

            {/* Category */}
            <FormField
              label="Category"
              id={`${formId}-category`}
              icon={
                getIcon(category) ? (
                  <CategoryIcon name={getIcon(category)!} size={16} />
                ) : (
                  <Tag className="h-4 w-4" />
                )
              }
              required
              type="text"
              value={category}
              onChange={(e) => { setSubmitError(null); setCategory(e.target.value); }}
              placeholder="e.g., Food, Transport, Salary"
              list={`${formId}-categories`}
            />
            <datalist id={`${formId}-categories`}>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name} />
              ))}
            </datalist>

            {/* Account */}
            <FormField
              label="Account"
              id={`${formId}-account`}
              icon={<CreditCard className="h-4 w-4" />}
              type="text"
              value={account}
              onChange={(e) => { setSubmitError(null); setAccount(e.target.value); }}
              placeholder="e.g., Cash, Credit Card, Bank"
              list={`${formId}-accounts`}
            />
            <datalist id={`${formId}-accounts`}>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.name} />
              ))}
            </datalist>

            {/* Date */}
            <FormField label="Date" id={`${formId}-date`}>
              <DatePicker
                date={date}
                onDateChange={(d) => d && setDate(d)}
                className="w-full"
              />
            </FormField>

            {/* Note */}
            <FormField label="Note" id={`${formId}-note`}>
              <Input
                id={`${formId}-note`}
                type="text"
                value={note}
                onChange={(e) => { setSubmitError(null); setNote(e.target.value); }}
                placeholder="Transaction description"
                maxLength={500}
              />
            </FormField>
          </div>
        </form>
      </div>

      {/* Fixed Footer */}
      <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
        {submitError && (
          <p className="text-sm text-destructive mb-3">{submitError}</p>
        )}
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
            form={`transaction-form-${formId}`}
            disabled={loading || deleting || !amount.trim() || parseFloat(amount) <= 0 || !category.trim()}
          >
            {loading
              ? isEdit
                ? "Saving..."
                : "Adding..."
              : isEdit
                ? "Save Changes"
                : "Add Transaction"}
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
