import { getBudgetCycleForDate } from "./budget-calculations";
import type { Budget } from "@money-insight/ui/types";

export function shiftUtcMonth(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

function shiftUtcDay(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function moveBudgetHistoryReferenceDate(
  referenceDate: string,
  months: -1 | 1,
  budgets: Budget[],
  minimumDate?: string,
  maximumDate?: string,
): string {
  if (budgets.length === 0) return referenceDate;

  const cycleKeys = new Map(
    budgets.map((budget) => [budget.id, getBudgetCycleForDate(budget, referenceDate).cycleKey]),
  );
  let candidate = shiftUtcMonth(referenceDate, months);

  if (minimumDate && candidate < minimumDate) candidate = minimumDate;
  if (maximumDate && candidate > maximumDate) candidate = maximumDate;

  while (budgets.some(
    (budget) => budget.firstCycleStartDate <= candidate
      && getBudgetCycleForDate(budget, candidate).cycleKey === cycleKeys.get(budget.id),
  )) {
    const nextCandidate = shiftUtcDay(candidate, months);
    if (nextCandidate === candidate || (minimumDate && nextCandidate < minimumDate)) {
      return referenceDate;
    }
    if (maximumDate && nextCandidate > maximumDate) {
      return referenceDate;
    }
    candidate = nextCandidate;
  }

  return candidate;
}

export function formatBudgetReferenceMonth(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
