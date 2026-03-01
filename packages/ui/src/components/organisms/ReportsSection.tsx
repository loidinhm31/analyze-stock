import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CategoryIcon,
} from "@money-insight/ui/components/atoms";
import { formatCurrency } from "@money-insight/ui/lib";
import { useCategoryIcon } from "@money-insight/ui/hooks";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Transaction } from "@money-insight/ui/types";

export interface ReportsSectionProps {
  transactions: Transaction[];
  valuesHidden?: boolean;
  currentYearMonth?: string;
}

export function ReportsSection({
  transactions,
  valuesHidden = false,
  currentYearMonth,
}: ReportsSectionProps) {
  const { getIcon } = useCategoryIcon();
  const maskValue = (value: string) => "*".repeat(value.length);

  const yearMonth = useMemo(() => {
    if (currentYearMonth) return currentYearMonth;
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  }, [currentYearMonth]);

  // Single-pass partition into spending/income; ISO date strings sort lexicographically
  const { spendingTransactions, incomeTransactions, totalSpending, totalIncome } =
    useMemo(() => {
      const spending: Transaction[] = [];
      const income: Transaction[] = [];
      let spendSum = 0;
      let incomeSum = 0;

      for (const t of transactions) {
        if (t.yearMonth !== yearMonth || t.excludeReport) continue;
        if (t.expense > 0) {
          spending.push(t);
          spendSum += t.expense;
        }
        if (t.income > 0) {
          income.push(t);
          incomeSum += t.income;
        }
      }

      const byDateDesc = (a: Transaction, b: Transaction) =>
        b.date < a.date ? -1 : b.date > a.date ? 1 : 0;

      return {
        spendingTransactions: spending.sort(byDateDesc),
        incomeTransactions: income.sort(byDateDesc),
        totalSpending: spendSum,
        totalIncome: incomeSum,
      };
    }, [transactions, yearMonth]);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = parseInt(yearMonth.split("-")[1], 10) - 1;
  const year = parseInt(yearMonth.split("-")[0], 10);
  const monthName = monthNames[month];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-lg font-bold font-heading text-foreground">
          Monthly Report
        </h2>
        <p className="text-sm text-muted-foreground">
          {monthName} {year} - Transactions counted in report
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-secondary-foreground">
                Spending
              </span>
            </div>
            <p className="text-lg font-bold font-heading text-destructive">
              {valuesHidden
                ? maskValue(formatCurrency(totalSpending))
                : formatCurrency(totalSpending)}
            </p>
            <p className="text-xs text-muted-foreground">
              {spendingTransactions.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-secondary-foreground">
                Income
              </span>
            </div>
            <p className="text-lg font-bold font-heading text-success">
              {valuesHidden
                ? maskValue(formatCurrency(totalIncome))
                : formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-muted-foreground">
              {incomeTransactions.length} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Lists - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending Transactions List */}
        <Card className="h-fit">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2 text-foreground">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Spending ({spendingTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {spendingTransactions.length === 0 ? (
              <p className="text-sm py-4 text-center text-muted-foreground">
                No spending transactions this month
              </p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {spendingTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {t.note || t.category}
                      </p>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-0.5 flex-wrap">
                        {new Date(t.date).toLocaleDateString()} •{" "}
                        {getIcon(t.category) && (
                          <CategoryIcon
                            name={getIcon(t.category)}
                            size={14}
                            className="inline-block shrink-0"
                          />
                        )}
                        {t.category} • {t.account}
                      </p>
                    </div>
                    <p className="text-sm font-bold ml-2 text-destructive">
                      {valuesHidden
                        ? maskValue(formatCurrency(t.expense))
                        : `-${formatCurrency(t.expense)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {/* Total - always visible */}
            {spendingTransactions.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg mt-2 bg-secondary">
                <p className="text-sm font-bold text-secondary-foreground">
                  Total Spending
                </p>
                <p className="text-sm font-bold text-secondary-foreground">
                  {valuesHidden
                    ? maskValue(formatCurrency(totalSpending))
                    : formatCurrency(totalSpending)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income Transactions List */}
        <Card className="h-fit">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4 text-success" />
              Income ({incomeTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {incomeTransactions.length === 0 ? (
              <p className="text-sm py-4 text-center text-muted-foreground">
                No income transactions this month
              </p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {incomeTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-success/5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {t.note || t.category}
                      </p>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-0.5 flex-wrap">
                        {new Date(t.date).toLocaleDateString()} •{" "}
                        {getIcon(t.category) && (
                          <CategoryIcon
                            name={getIcon(t.category)}
                            size={14}
                            className="inline-block shrink-0"
                          />
                        )}
                        {t.category} • {t.account}
                      </p>
                    </div>
                    <p className="text-sm font-bold ml-2 text-success">
                      {valuesHidden
                        ? maskValue(formatCurrency(t.income))
                        : `+${formatCurrency(t.income)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {/* Total - always visible */}
            {incomeTransactions.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg mt-2 bg-secondary">
                <p className="text-sm font-bold text-secondary-foreground">
                  Total Income
                </p>
                <p className="text-sm font-bold text-secondary-foreground">
                  {valuesHidden
                    ? maskValue(formatCurrency(totalIncome))
                    : formatCurrency(totalIncome)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
