import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  CreditCard,
  DollarSign,
  StickyNote,
  Trash2,
  UserRound,
} from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@money-insight/shared";
import {
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
import {
  DatePicker,
  FormField,
  SearchablePicker,
  type SearchablePickerOption,
} from "@money-insight/ui/components/molecules";
import type { Account, Debt, NewDebt } from "@money-insight/ui/types";
import {
  buildDebtInput,
  buildUpdatedDebt,
  type DebtFormValues,
} from "./debt-form-helpers";

function buildInitialValues(debt?: Debt): DebtFormValues {
  return {
    name: debt?.name ?? "",
    debtType: debt?.debtType ?? "payable",
    counterpartyName: debt?.counterpartyName ?? "",
    description: debt?.description ?? "",
    accountId: debt?.accountId ?? "",
    currency: debt?.currency ?? "VND",
    principalAmount: debt ? String(debt.principalAmount) : "",
    originatedAt: debt?.originatedAt ? new Date(debt.originatedAt) : new Date(),
    dueDate: debt?.dueDate ? new Date(debt.dueDate) : undefined,
  };
}

interface BaseDebtFormProps {
  accounts: Account[];
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
}

interface AddDebtFormProps extends BaseDebtFormProps {
  mode: "add";
  debt?: never;
  onSubmit: (debt: NewDebt) => Promise<void>;
}

interface EditDebtFormProps extends BaseDebtFormProps {
  mode: "edit";
  debt: Debt;
  onSubmit: (debt: Debt) => Promise<void>;
}

export type DebtFormProps = AddDebtFormProps | EditDebtFormProps;

export function DebtForm(props: DebtFormProps) {
  const debt = props.mode === "edit" ? props.debt : undefined;
  const [values, setValues] = useState<DebtFormValues>(() =>
    buildInitialValues(debt),
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setValues(buildInitialValues(debt));
    setSubmitError(null);
    setConfirmDelete(false);
  }, [debt]);

  useEffect(() => {
    if (!debt && !values.accountId && props.accounts.length > 0) {
      setValues((current) => ({ ...current, accountId: props.accounts[0].name }));
    }
  }, [debt, props.accounts, values.accountId]);

  const accountOptions: SearchablePickerOption[] = useMemo(
    () =>
      props.accounts.map((account) => ({
        value: account.name,
        label: account.name,
      })),
    [props.accounts],
  );

  function updateField<Key extends keyof DebtFormValues>(
    key: Key,
    value: DebtFormValues[Key],
  ) {
    setSubmitError(null);
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setLoading(true);

    try {
      if (props.mode === "edit") {
        await props.onSubmit(buildUpdatedDebt(props.debt, values));
      } else {
        await props.onSubmit(buildDebtInput(values));
      }
      props.onCancel();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save debt.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!props.onDelete || !debt) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await props.onDelete(debt.id);
      props.onCancel();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to delete debt.",
      );
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <DialogHeader className="px-6 pt-6">
        <DialogTitle>
          {props.mode === "edit" ? "Edit Debt" : "Add New Debt"}
        </DialogTitle>
        <DialogDescription>
          {props.mode === "edit"
            ? "Update debt metadata. Completion still derives from settlements."
            : "Track a payable or receivable balance with settlement history."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <form id="debt-form" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={values.debtType === "payable" ? "default" : "outline"}
                className="flex-1"
                onClick={() => updateField("debtType", "payable")}
              >
                Payable
              </Button>
              <Button
                type="button"
                variant={values.debtType === "receivable" ? "default" : "outline"}
                className="flex-1"
                onClick={() => updateField("debtType", "receivable")}
              >
                Receivable
              </Button>
            </div>

            <FormField
              label="Debt Name"
              id="debt-name"
              icon={<ArrowRightLeft className="h-4 w-4" />}
              required
            >
              <Input
                id="debt-name"
                type="text"
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Car loan, Client invoice, Family loan..."
                maxLength={120}
                required
              />
            </FormField>

            <FormField
              label="Counterparty"
              id="debt-counterparty"
              icon={<UserRound className="h-4 w-4" />}
              required
            >
              <Input
                id="debt-counterparty"
                type="text"
                value={values.counterpartyName}
                onChange={(event) =>
                  updateField("counterpartyName", event.target.value)
                }
                placeholder="Who you owe or who owes you"
                maxLength={120}
                required
              />
            </FormField>

            <FormField
              label="Principal Amount"
              id="debt-principal-amount"
              icon={<DollarSign className="h-4 w-4" />}
              required
            >
              <div className="flex gap-2">
                <Input
                  id="debt-principal-amount"
                  type="number"
                  min="0.01"
                  step="any"
                  value={values.principalAmount}
                  onChange={(event) =>
                    updateField("principalAmount", event.target.value)
                  }
                  placeholder="0"
                  required
                />
                <Select
                  value={values.currency}
                  onValueChange={(value) => updateField("currency", value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormField>

            <FormField
              label="Original Account"
              id="debt-account"
              icon={<CreditCard className="h-4 w-4" />}
              required
            >
              <SearchablePicker
                value={values.accountId}
                onChange={(value) => updateField("accountId", value)}
                options={accountOptions}
                placeholder="Choose account"
                searchPlaceholder="Search account..."
                emptyMessage="No accounts found."
                triggerId="debt-account"
                disabled={props.accounts.length === 0}
              />
            </FormField>

            <FormField
              label="Origin Date"
              id="debt-origin-date"
              icon={<CalendarDays className="h-4 w-4" />}
              required
            >
              <DatePicker
                date={values.originatedAt}
                onDateChange={(date) => updateField("originatedAt", date)}
                className="w-full"
              />
            </FormField>

            <FormField label="Due Date" id="debt-due-date">
              <div className="space-y-2">
                <DatePicker
                  date={values.dueDate}
                  onDateChange={(date) => updateField("dueDate", date)}
                  placeholder="Optional due date"
                  className="w-full"
                />
                {values.dueDate ? (
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => updateField("dueDate", undefined)}
                  >
                    Clear due date
                  </button>
                ) : null}
              </div>
            </FormField>

            <FormField
              label="Description"
              id="debt-description"
              icon={<StickyNote className="h-4 w-4" />}
            >
              <textarea
                id="debt-description"
                value={values.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Optional background for this debt"
                maxLength={500}
                rows={4}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </FormField>
          </div>
        </form>
      </div>

      <div className="border-t px-6 pb-6 pt-4">
        {props.accounts.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Create an account before adding a debt.
          </p>
        ) : null}
        {submitError ? (
          <p className="mb-3 text-sm text-destructive">{submitError}</p>
        ) : null}
        <DialogFooter className="gap-2">
          {props.mode === "edit" && props.onDelete ? (
            <Button
              type="button"
              variant={confirmDelete ? "destructive" : "outline"}
              disabled={loading || deleting}
              onClick={handleDelete}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4" />
              {deleting
                ? "Deleting..."
                : confirmDelete
                  ? "Confirm Delete"
                  : "Delete"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={props.onCancel}
            disabled={loading || deleting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="debt-form"
            disabled={loading || deleting || props.accounts.length === 0}
          >
            {loading
              ? props.mode === "edit"
                ? "Saving..."
                : "Adding..."
              : props.mode === "edit"
                ? "Save Changes"
                : "Add Debt"}
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
