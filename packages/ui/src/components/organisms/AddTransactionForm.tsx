import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, DollarSign, Tag, CreditCard } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms";
import { DatePicker, FormField } from "@/components/molecules";
import { cn } from "@/lib/utils";
import type { NewTransaction, Category, Account } from "@/types";

export interface AddTransactionFormProps {
  onSubmit: (transaction: NewTransaction) => Promise<void>;
  isDbReady: boolean;
  getCategories: () => Promise<Category[]>;
  getAccounts: () => Promise<Account[]>;
  onSuccess?: () => void;
}

export function AddTransactionForm({
  onSubmit,
  isDbReady,
  getCategories,
  getAccounts,
  onSuccess,
}: AddTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState("VND");

  // Load categories and accounts when dialog opens
  useEffect(() => {
    if (open && isDbReady) {
      loadOptions();
    }
  }, [open, isDbReady]);

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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!amount || !category) {
      return;
    }

    setLoading(true);

    try {
      const numericAmount = parseFloat(amount);
      const finalAmount = isExpense
        ? -Math.abs(numericAmount)
        : Math.abs(numericAmount);

      const newTransaction: NewTransaction = {
        note,
        amount: finalAmount,
        category,
        account: account || "Cash",
        currency,
        date: format(date, "yyyy-MM-dd"),
        exclude_report: false,
        source: "manual",
      };

      await onSubmit(newTransaction);

      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to add transaction:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>
              Manually add a spending or income transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Transaction Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isExpense ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  isExpense && "bg-red-600 hover:bg-red-700",
                )}
                onClick={() => setIsExpense(true)}
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
                onClick={() => setIsExpense(false)}
              >
                Income
              </Button>
            </div>

            {/* Amount */}
            <FormField
              label="Amount"
              id="amount"
              icon={<DollarSign className="h-4 w-4" />}
              required
            >
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1"
                  required
                />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">VND</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FormField>

            {/* Category */}
            <FormField
              label="Category"
              id="category"
              icon={<Tag className="h-4 w-4" />}
              required
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Food, Transport, Salary"
              list="categories"
            />
            <datalist id="categories">
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name} />
              ))}
            </datalist>

            {/* Account */}
            <FormField
              label="Account"
              id="account"
              icon={<CreditCard className="h-4 w-4" />}
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="e.g., Cash, Credit Card, Bank"
              list="accounts"
            />
            <datalist id="accounts">
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.name} />
              ))}
            </datalist>

            {/* Date */}
            <FormField label="Date" id="date">
              <DatePicker
                date={date}
                onDateChange={(d) => d && setDate(d)}
                className="w-full"
              />
            </FormField>

            {/* Note */}
            <FormField
              label="Note"
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Transaction description"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !amount || !category}>
              {loading ? "Adding..." : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
