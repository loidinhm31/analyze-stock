import { useEffect, useState } from "react";
import { CreditCard, DollarSign, StickyNote } from "lucide-react";
import {
  Button,
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
import type { Account, DebtSettlementInput } from "@money-insight/ui/types";
import {
  buildDebtSettlementInput,
  formatDebtMoney,
} from "./debt-form-helpers";

export interface DebtSettlementFormProps {
  accounts: Account[];
  currency: string;
  remainingAmount: number;
  onSubmit: (input: DebtSettlementInput) => Promise<void>;
  onCancel: () => void;
}

export function DebtSettlementForm({
  accounts,
  currency,
  remainingAmount,
  onSubmit,
  onCancel,
}: DebtSettlementFormProps) {
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [settledAt, setSettledAt] = useState<Date | undefined>(new Date());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].name);
    }
  }, [accountId, accounts]);

  const accountOptions: SearchablePickerOption[] = accounts.map((account) => ({
    value: account.name,
    label: account.name,
  }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setLoading(true);

    try {
      await onSubmit(
        buildDebtSettlementInput(
          { accountId, amount, settledAt, note },
          remainingAmount,
        ),
      );
      onCancel();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to save settlement. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DialogHeader className="px-6 pt-6">
        <DialogTitle>Add Settlement</DialogTitle>
        <DialogDescription>
          Remaining balance: {formatDebtMoney(remainingAmount, currency)}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <form id="debt-settlement-form" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <FormField
              label="Settlement Amount"
              id="debt-settlement-amount"
              icon={<DollarSign className="h-4 w-4" />}
              required
            >
              <Input
                id="debt-settlement-amount"
                type="number"
                min="0.01"
                max={remainingAmount || undefined}
                step="any"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                required
              />
            </FormField>

            <FormField
              label="Account"
              id="debt-settlement-account"
              icon={<CreditCard className="h-4 w-4" />}
              required
            >
              <SearchablePicker
                value={accountId}
                onChange={setAccountId}
                options={accountOptions}
                placeholder="Choose account"
                searchPlaceholder="Search account..."
                emptyMessage="No accounts found."
                triggerId="debt-settlement-account"
                disabled={accounts.length === 0}
              />
            </FormField>

            <FormField label="Settlement Date" id="debt-settlement-date" required>
              <DatePicker
                date={settledAt}
                onDateChange={setSettledAt}
                className="w-full"
              />
            </FormField>

            <FormField
              label="Note"
              id="debt-settlement-note"
              icon={<StickyNote className="h-4 w-4" />}
            >
              <Input
                id="debt-settlement-note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional settlement note"
                maxLength={500}
              />
            </FormField>
          </div>
        </form>
      </div>

      <div className="border-t px-6 pb-6 pt-4">
        {accounts.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Create an account before recording settlements.
          </p>
        ) : null}
        {submitError ? (
          <p className="mb-3 text-sm text-destructive">{submitError}</p>
        ) : null}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="debt-settlement-form"
            disabled={loading || accounts.length === 0}
          >
            {loading ? "Saving..." : "Save Settlement"}
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
