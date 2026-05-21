import { useSpendingStore } from "@money-insight/ui/stores";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@money-insight/ui/components/atoms";
import { formatCurrency } from "@money-insight/ui/lib";
import { getTransferDisplayNote } from "@money-insight/ui/services/transferService";
import type { Transaction } from "@money-insight/ui/types";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useNav } from "@money-insight/ui/hooks";

function getTransactionDescription(transaction: Transaction): string {
  if (transaction.source === "transfer") {
    return getTransferDisplayNote(transaction);
  }

  return transaction.note || transaction.category;
}

export function ReportsPage() {
  const { to } = useNav();
  const { transactions, valuesHidden } = useSpendingStore();
  const maskValue = (value: string) => "*".repeat(value.length);

  // Get current month's year-month string
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;

  // Filter transactions for current month, excluding those marked as excludeReport
  const currentMonthTransactions = transactions.filter((t) => {
    return t.yearMonth === currentYearMonth && !t.excludeReport;
  });

  // Separate into spending and income
  const spendingTransactions = currentMonthTransactions
    .filter((t) => t.expense > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const incomeTransactions = currentMonthTransactions
    .filter((t) => t.income > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate totals
  const totalSpending = spendingTransactions.reduce(
    (sum, t) => sum + t.expense,
    0,
  );
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.income, 0);

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
  const monthName = monthNames[now.getMonth()];

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={to("dashboard")}
          className="p-2 rounded-lg hover:bg-(--color-bg-light) transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-secondary-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-heading text-foreground">
            Monthly Report
          </h1>
          <p className="text-sm text-muted-foreground">
            {monthName} {now.getFullYear()} - Transactions counted in report
          </p>
        </div>
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
              Spending Transactions ({spendingTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {spendingTransactions.length === 0 ? (
              <p className="text-sm py-4 text-center text-muted-foreground">
                No spending transactions this month
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {spendingTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {getTransactionDescription(t)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()} • {t.category} •{" "}
                        {t.account}
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
              Income Transactions ({incomeTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {incomeTransactions.length === 0 ? (
              <p className="text-sm py-4 text-center text-muted-foreground">
                No income transactions this month
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {incomeTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-success/5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {getTransactionDescription(t)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()} • {t.category} •{" "}
                        {t.account}
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
