import { useEffect, useMemo, useState } from "react";
import { Check, DollarSign, Layers, Wallet } from "lucide-react";
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
import { cn, formatNumericInput, parseNumericInput } from "@money-insight/ui/lib";
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
  emptySelectionLabel: string;
  onSearchChange: (value: string) => void;
  onToggle: (value: string) => void;
}

function ChecklistField({
  items,
  selected,
  title,
  helper,
  search,
  emptySelectionLabel,
  onSearchChange,
  onToggle,
}: ChecklistProps) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = items
    .filter((item) => item.toLowerCase().includes(normalizedSearch))
    .sort((left, right) => {
      const leftSelected = selected.includes(left);
      const rightSelected = selected.includes(right);

      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }

      return left.localeCompare(right);
    });

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
      <div className="rounded-lg border border-border bg-background/70 p-3">
        <div className="mb-3 flex min-h-8 flex-wrap gap-2">
          {selected.length > 0 ? (
            selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {item}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">{emptySelectionLabel}</span>
          )}
        </div>
        <div className="max-h-48 overflow-y-auto pr-1">
          <div className="grid gap-2 pr-2">
            {filteredItems.map((item) => {
              const isSelected = selected.includes(item);

              return (
                <label
                  key={item}
                  className="block"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(item)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors select-none",
                      isSelected
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-background hover:border-primary/30 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 truncate">{item}</span>
                    {isSelected ? (
                      <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                        Selected
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
            {filteredItems.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No matching items.
              </p>
            ) : null}
          </div>
        </div>
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
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
                emptySelectionLabel="No categories selected yet."
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
                emptySelectionLabel="No account filter. Budget applies to all accounts."
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
