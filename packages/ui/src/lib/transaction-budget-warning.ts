import type { Budget, Transaction } from "@money-insight/ui/types";
import {
  previewBudgetUsageWithTransaction,
  transactionMatchesBudget,
} from "./budget-calculations";

interface BudgetWarningDraft {
  id?: string;
  amount: number;
  account: string;
  category: string;
  currency: string;
  date: string;
  excludeReport: boolean;
  source: Transaction["source"];
  updatedAt?: string;
}

export interface TransactionBudgetWarning {
  budgetName: string;
  overAmount: number;
  matchingBudgetCount: number;
}

export function getTransactionBudgetWarning(
  budgets: Budget[],
  transactions: Transaction[],
  draft: BudgetWarningDraft,
  resolveCategoryName?: (categoryName: string) => string,
  originalTransaction?: Transaction,
): TransactionBudgetWarning | null {
  const matches = budgets
    .filter(
      (budget) =>
        budget.status === "active" &&
        transactionMatchesBudget(draft, budget, { resolveCategoryName }),
    )
    .map((budget) => {
      const preview = previewBudgetUsageWithTransaction(
        budget,
        transactions,
        draft,
        originalTransaction,
        { resolveCategoryName },
      );

      return {
        budget,
        overAmount: Math.max(0, preview.after.spent - budget.amount),
      };
    })
    .filter((item) => item.overAmount > 0)
    .sort((left, right) => right.overAmount - left.overAmount);

  if (matches.length === 0) {
    return null;
  }

  return {
    budgetName: matches[0].budget.name,
    overAmount: matches[0].overAmount,
    matchingBudgetCount: matches.length,
  };
}
