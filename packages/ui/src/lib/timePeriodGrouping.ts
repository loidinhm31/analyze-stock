import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  startOfYear,
  format,
  isFuture,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  isThisQuarter,
  isThisYear,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  isSameWeek,
  isSameMonth,
  isSameQuarter,
  isSameYear,
  getQuarter,
} from "date-fns";
import type { Transaction } from "@money-insight/ui/types";

export type TimePeriodMode =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "all";

export interface TimePeriodGroup {
  key: string;
  label: string;
  transactions: Transaction[];
  totalExpense: number;
  totalIncome: number;
}

function getGroupKey(date: Date, mode: TimePeriodMode): string {
  switch (mode) {
    case "day":
      return format(date, "yyyy-MM-dd");
    case "week":
      return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-'W'ww");
    case "month":
      return format(date, "yyyy-MM");
    case "quarter":
      return `${date.getFullYear()}-Q${getQuarter(date)}`;
    case "year":
      return format(date, "yyyy");
    case "all":
      return "all";
    default:
      return format(date, "yyyy-MM-dd");
  }
}

function getGroupLabel(
  date: Date,
  mode: TimePeriodMode,
  referenceDate: Date = new Date(),
): string {
  switch (mode) {
    case "day": {
      if (isFuture(date)) return `Future — ${format(date, "MMM d, yyyy")}`;
      if (isToday(date)) return "Today";
      if (isYesterday(date)) return "Yesterday";
      return format(date, "MMM d, yyyy");
    }
    case "week": {
      if (isThisWeek(date, { weekStartsOn: 1 })) return "This Week";
      const lastWeekStart = subWeeks(referenceDate, 1);
      if (isSameWeek(date, lastWeekStart, { weekStartsOn: 1 }))
        return "Last Week";
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;
    }
    case "month": {
      if (isThisMonth(date)) return "This Month";
      const lastMonth = subMonths(referenceDate, 1);
      if (isSameMonth(date, lastMonth)) return "Last Month";
      return format(date, "MMM yyyy");
    }
    case "quarter": {
      const quarter = getQuarter(date);
      const year = date.getFullYear();
      if (isThisQuarter(date)) return `Q${quarter} ${year}`;
      const lastQuarter = subQuarters(referenceDate, 1);
      if (isSameQuarter(date, lastQuarter)) {
        const lq = getQuarter(lastQuarter);
        const ly = lastQuarter.getFullYear();
        return `Q${lq} ${ly}`;
      }
      return `Q${quarter} ${year}`;
    }
    case "year": {
      if (isThisYear(date)) return "This Year";
      const lastYear = subYears(referenceDate, 1);
      if (isSameYear(date, lastYear)) return "Last Year";
      return format(date, "yyyy");
    }
    case "all":
      return "All Transactions";
    default:
      return format(date, "MMM d, yyyy");
  }
}

function shouldIncludeTransaction(
  date: Date,
  mode: TimePeriodMode,
  referenceDate: Date = new Date(),
): boolean {
  switch (mode) {
    case "day":
      // Show 1 month of transactions
      return (
        date >= subMonths(startOfMonth(referenceDate), 0) || isFuture(date)
      );
    case "week":
      // Show 3 months of transactions
      return (
        date >= subMonths(startOfMonth(referenceDate), 2) || isFuture(date)
      );
    case "month":
      // Show 2 years of transactions
      return date >= subYears(startOfYear(referenceDate), 1) || isFuture(date);
    case "quarter":
      // Show 3 years of transactions
      return date >= subYears(startOfYear(referenceDate), 2) || isFuture(date);
    case "year":
      // Show 10 years of transactions
      return date >= subYears(startOfYear(referenceDate), 9) || isFuture(date);
    case "all":
      return true;
    default:
      return true;
  }
}

function buildTransactionGroups(
  transactions: Transaction[],
  mode: TimePeriodMode,
  referenceDate: Date,
  applyTimeRange: boolean,
): TimePeriodGroup[] {
  const groupMap = new Map<
    string,
    {
      label: string;
      transactions: Transaction[];
      totalExpense: number;
      totalIncome: number;
      sortDate: Date;
    }
  >();

  // Filter and group transactions
  for (const transaction of transactions) {
    const date = new Date(transaction.date);

    // Skip transactions outside the time range for the selected mode
    if (
      applyTimeRange &&
      !shouldIncludeTransaction(date, mode, referenceDate)
    ) {
      continue;
    }

    const key = getGroupKey(date, mode);
    const label = getGroupLabel(date, mode, referenceDate);

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        label,
        transactions: [],
        totalExpense: 0,
        totalIncome: 0,
        sortDate: date,
      });
    }

    const group = groupMap.get(key)!;
    group.transactions.push(transaction);
    group.totalExpense += transaction.expense;
    group.totalIncome += transaction.income;

    // Keep track of the most recent date in this group for sorting
    if (date > group.sortDate) {
      group.sortDate = date;
    }
  }

  // Convert map to array and sort by date (most recent first)
  const groups = Array.from(groupMap.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      transactions: value.transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      totalExpense: value.totalExpense,
      totalIncome: value.totalIncome,
      sortDate: value.sortDate,
    }))
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  // Move "Future" group to the top if it exists
  const futureIndex = groups.findIndex((g) => g.label === "Future");
  if (futureIndex > 0) {
    const [futureGroup] = groups.splice(futureIndex, 1);
    groups.unshift(futureGroup);
  }

  // Return without sortDate (internal only)
  return groups.map(
    ({ key, label, transactions, totalExpense, totalIncome }) => ({
      key,
      label,
      transactions,
      totalExpense,
      totalIncome,
    }),
  );
}

export function groupTransactionsByTimePeriod(
  transactions: Transaction[],
  mode: TimePeriodMode,
  referenceDate: Date = new Date(),
): TimePeriodGroup[] {
  return buildTransactionGroups(transactions, mode, referenceDate, true);
}

export function groupTransactionsByDate(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): TimePeriodGroup[] {
  return buildTransactionGroups(transactions, "day", referenceDate, false);
}

export const TIME_PERIOD_OPTIONS: { value: TimePeriodMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];
