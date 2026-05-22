import { useEffect, useMemo, useState } from "react";
import { DollarSign, Layers, Wallet } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
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
import { formatNumericInput, parseNumericInput } from "@money-insight/ui/lib";
import { SUPPORTED_CURRENCIES } from "@money-insight/shared";
import type { Account, Budget, Category, NewBudget } from "@money-insight/ui/types";

interface BudgetFormDialogProps {
  open: boolean;
  budget: Budget | null;
  categories: Category[];
  accounts: Account[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: NewBudget | Budget) => Promise<void>;
}

interface ChecklistProps {
  items: string[];
  selected: string[];
  title: string;
  helper: string;
  search: string;
  onSearchChange: (value: string) => void;
  onToggle: (value: string) => void;
}

function ChecklistField({
  items,
  selected,
  title,
  helper,
  search,
  onSearchChange,
  onToggle,
}: ChecklistProps) {
  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </div>
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={`Search ${title.toLowerCase()}`}
      />
      <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border p-3">
        {filteredItems.map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={selected.includes(item)}
              onChange={() => onToggle(item)}
            />
            <span>{item}</span>
          </label>
        ))}
        {filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching items.</p>
        ) : null}
      </div>
    </div>
  );
}

function toggleSelection(selected: string[], value: string) {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}

export function BudgetFormDialog({
  open,
  budget,
  categories,
  accounts,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: BudgetFormDialogProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [firstCycleStartDate, setFirstCycleStartDate] = useState<Date>(new Date());
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [accountNames, setAccountNames] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categoryItems = useMemo(
    () => categories.filter((category) => category.isExpense).map((category) => category.name),
    [categories],
  );
  const accountItems = useMemo(() => accounts.map((account) => account.name), [accounts]);

  useEffect(() => {
    if (!open) return;

    setName(budget?.name ?? "");
    setAmount(budget ? formatNumericInput(String(budget.amount)) : "");
    setCurrency(budget?.currency ?? "VND");
    setFirstCycleStartDate(
      budget ? new Date(`${budget.firstCycleStartDate}T00:00:00`) : new Date(),
    );
    setCategoryNames(budget?.categoryNames ?? []);
    setAccountNames(budget?.accountNames ?? []);
    setCategorySearch("");
    setAccountSearch("");
    setError(null);
  }, [budget, open]);

  async function handleSubmit() {
    const numericAmount = parseNumericInput(amount);

    if (!name.trim() || numericAmount <= 0 || categoryNames.length === 0) {
      setError("Name, amount, and at least one category are required.");
      return;
    }

    const input: NewBudget = {
      name: name.trim(),
      amount: numericAmount,
      currency,
      categoryNames,
      accountNames,
      firstCycleStartDate: firstCycleStartDate.toISOString().slice(0, 10),
    };

    await onSubmit(budget ? { ...budget, ...input, status: budget.status } : input);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{budget ? "Edit Budget" : "Create Budget"}</DialogTitle>
          <DialogDescription>
            Track monthly spending for selected expense categories and optional accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <FormField label="Budget Name" id="budget-name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Groceries" />
          </FormField>
          <FormField label="Amount" id="budget-amount" icon={<DollarSign className="h-4 w-4" />} required>
            <div className="flex gap-2">
              <Input
                value={amount}
                onChange={(e) => setAmount(formatNumericInput(e.target.value))}
                placeholder="0"
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormField>
          <FormField label="First Cycle Start" id="budget-start" required>
            <DatePicker
              date={firstCycleStartDate}
              onDateChange={(value) => value && setFirstCycleStartDate(value)}
              className="w-full"
            />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Layers className="h-4 w-4" />
                Categories
              </div>
              <ChecklistField
                items={categoryItems}
                selected={categoryNames}
                title="Categories"
                helper={`${categoryNames.length} selected`}
                search={categorySearch}
                onSearchChange={setCategorySearch}
                onToggle={(value) => setCategoryNames((current) => toggleSelection(current, value))}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Wallet className="h-4 w-4" />
                Accounts
              </div>
              <ChecklistField
                items={accountItems}
                selected={accountNames}
                title="Accounts"
                helper={accountNames.length === 0 ? "All accounts" : `${accountNames.length} selected`}
                search={accountSearch}
                onSearchChange={setAccountSearch}
                onToggle={(value) => setAccountNames((current) => toggleSelection(current, value))}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : budget ? "Save Changes" : "Create Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
