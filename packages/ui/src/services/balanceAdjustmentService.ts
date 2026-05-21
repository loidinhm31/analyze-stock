import type {
  Transaction,
  NewTransaction,
  Account,
  AdjustmentNote,
} from "@money-insight/ui/types";
import { BALANCE_ADJUSTMENT_CATEGORY } from "@money-insight/shared";

/**
 * Check if a transaction is a balance adjustment
 */
export function isAdjustmentTransaction(tx: Transaction): boolean {
  return tx.source === "balance_adjustment";
}

/**
 * Parse the target balance from an adjustment transaction's note
 */
export function parseAdjustmentNote(note: string): AdjustmentNote | null {
  try {
    const parsed = JSON.parse(note);
    if (typeof parsed.targetBalance === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create the note JSON for an adjustment transaction
 */
export function createAdjustmentNote(targetBalance: number): string {
  const note: AdjustmentNote = { targetBalance };
  return JSON.stringify(note);
}

/**
 * Calculate balance at a specific date for an account
 * Balance = initialBalance + sum of all transactions on or before date
 * For adjustment transactions, we only include adjustments that are BEFORE the given date
 */
export function getBalanceAtDate(
  transactions: Transaction[],
  account: Account,
  date: string,
): number {
  const dateObj = new Date(date);
  dateObj.setHours(23, 59, 59, 999); // End of day

  let balance = account.initialBalance;

  // Filter transactions for this account, on or before the date
  const relevantTxs = transactions.filter((tx) => {
    if (tx.account !== account.name) return false;
    const txDate = new Date(tx.date);
    return txDate <= dateObj;
  });

  // Sort by date then by createdAt to ensure consistent ordering
  relevantTxs.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  for (const tx of relevantTxs) {
    balance += tx.income - tx.expense;
  }

  return balance;
}

/**
 * Calculate the running balance at a specific adjustment transaction,
 * excluding the adjustment itself but including prior adjustments
 */
export function getBalanceBeforeAdjustment(
  transactions: Transaction[],
  account: Account,
  adjustmentTx: Transaction,
): number {
  const adjustmentDate = new Date(adjustmentTx.date);
  adjustmentDate.setHours(23, 59, 59, 999);

  let balance = account.initialBalance;

  // Get all transactions for this account
  const accountTxs = transactions.filter(
    (tx) => tx.account === account.name && tx.id !== adjustmentTx.id,
  );

  // Sort by date then by createdAt
  accountTxs.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  for (const tx of accountTxs) {
    const txDate = new Date(tx.date);

    // For non-adjustment transactions: include if on or before adjustment date
    if (!isAdjustmentTransaction(tx)) {
      if (txDate <= adjustmentDate) {
        balance += tx.income - tx.expense;
      }
    } else {
      // For adjustment transactions: include if BEFORE the current adjustment
      // (before = either earlier date, or same date but created earlier)
      if (txDate < adjustmentDate) {
        balance += tx.income - tx.expense;
      } else if (txDate.getTime() === adjustmentDate.getTime()) {
        // Same date - check createdAt
        if (
          new Date(tx.createdAt).getTime() <
          new Date(adjustmentTx.createdAt).getTime()
        ) {
          balance += tx.income - tx.expense;
        }
      }
    }
  }

  return balance;
}

/**
 * Calculate the adjustment amount needed to reach target balance
 */
export function calculateAdjustmentAmount(
  targetBalance: number,
  currentBalance: number,
): number {
  return targetBalance - currentBalance;
}

/**
 * Create a new adjustment transaction data object
 */
export function createAdjustment(
  accountName: string,
  targetBalance: number,
  date: string,
  currency: string,
  currentBalance: number,
): NewTransaction {
  const amount = calculateAdjustmentAmount(targetBalance, currentBalance);

  return {
    note: createAdjustmentNote(targetBalance),
    amount,
    category: BALANCE_ADJUSTMENT_CATEGORY,
    account: accountName,
    currency,
    date,
    excludeReport: true, // Adjustments shouldn't appear in spending reports
    source: "balance_adjustment",
  };
}

/**
 * Recalculate all adjustment transactions for an account
 * Returns the list of adjustment transactions that need to be updated
 */
export function recalculateAdjustments(
  transactions: Transaction[],
  account: Account,
): Transaction[] {
  // Get all adjustment transactions for this account
  const adjustmentTxs = transactions.filter(
    (tx) => tx.account === account.name && isAdjustmentTransaction(tx),
  );

  if (adjustmentTxs.length === 0) {
    return [];
  }

  // Sort adjustments by date then createdAt
  adjustmentTxs.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const updatedAdjustments: Transaction[] = [];

  // Process each adjustment in order
  // We need to process them sequentially since earlier adjustments affect later ones
  const workingTxs = [...transactions];

  for (const adjTx of adjustmentTxs) {
    const parsed = parseAdjustmentNote(adjTx.note);
    if (!parsed) continue;

    const targetBalance = parsed.targetBalance;
    const balanceBefore = getBalanceBeforeAdjustment(
      workingTxs,
      account,
      adjTx,
    );
    const newAmount = calculateAdjustmentAmount(targetBalance, balanceBefore);

    // Determine expense/income
    const expense = newAmount < 0 ? Math.abs(newAmount) : 0;
    const income = newAmount > 0 ? newAmount : 0;

    // Check if update is needed
    if (adjTx.expense !== expense || adjTx.income !== income) {
      const updatedTx: Transaction = {
        ...adjTx,
        amount: newAmount,
        expense,
        income,
        updatedAt: new Date().toISOString(),
      };
      updatedAdjustments.push(updatedTx);

      // Update in working copy for subsequent calculations
      const idx = workingTxs.findIndex((t) => t.id === adjTx.id);
      if (idx >= 0) {
        workingTxs[idx] = updatedTx;
      }
    }
  }

  return updatedAdjustments;
}

/**
 * Get accounts that have adjustment transactions
 */
export function getAccountsWithAdjustments(
  transactions: Transaction[],
): string[] {
  const accounts = new Set<string>();
  for (const tx of transactions) {
    if (isAdjustmentTransaction(tx)) {
      accounts.add(tx.account);
    }
  }
  return Array.from(accounts);
}
