import { format } from "date-fns";
import type {
  Debt,
  DebtSettlementInput,
  DebtType,
  NewDebt,
} from "@money-insight/ui/types";

export interface DebtFormValues {
  name: string;
  debtType: DebtType;
  counterpartyName: string;
  description: string;
  accountId: string;
  currency: string;
  principalAmount: string;
  originatedAt?: Date;
  dueDate?: Date;
}

export interface DebtSettlementFormValues {
  accountId: string;
  amount: string;
  settledAt?: Date;
  note: string;
}

export function formatDebtMoney(amount: number, currency: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return `${currency} ${amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`;
}

export function maskValue(value: string): string {
  return "*".repeat(value.length);
}

export function buildDebtInput(values: DebtFormValues): NewDebt {
  const principalAmount = Number.parseFloat(values.principalAmount);
  if (!values.name.trim()) throw new Error("Debt name is required.");
  if (!values.counterpartyName.trim()) {
    throw new Error("Counterparty name is required.");
  }
  if (!values.accountId.trim()) throw new Error("Account is required.");
  if (!values.currency.trim()) throw new Error("Currency is required.");
  if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
    throw new Error("Principal amount must be greater than zero.");
  }
  if (!values.originatedAt) throw new Error("Origin date is required.");

  return {
    name: values.name.trim(),
    debtType: values.debtType,
    counterpartyName: values.counterpartyName.trim(),
    description: values.description.trim() || undefined,
    accountId: values.accountId,
    currency: values.currency,
    principalAmount,
    originatedAt: format(values.originatedAt, "yyyy-MM-dd"),
    dueDate: values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : undefined,
  };
}

export function buildUpdatedDebt(debt: Debt, values: DebtFormValues): Debt {
  return {
    ...debt,
    ...buildDebtInput(values),
  };
}

export function buildDebtSettlementInput(
  values: DebtSettlementFormValues,
  remainingAmount: number,
): DebtSettlementInput {
  const amount = Number.parseFloat(values.amount);
  if (!values.accountId.trim()) throw new Error("Settlement account is required.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Settlement amount must be greater than zero.");
  }
  if (!values.settledAt) throw new Error("Settlement date is required.");
  if (remainingAmount > 0 && amount > remainingAmount) {
    throw new Error("Settlement amount cannot exceed the remaining amount.");
  }

  return {
    accountId: values.accountId,
    amount,
    settledAt: format(values.settledAt, "yyyy-MM-dd"),
    note: values.note.trim() || undefined,
  };
}
