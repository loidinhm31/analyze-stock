import { useSpendingStore } from "@/stores/spending-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export function ReportsPage() {
  const { transactions, valuesHidden } = useSpendingStore();
  const maskValue = (value: string) => "*".repeat(value.length);

  // Get current month's year-month string
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;

  // Filter transactions for current month, excluding those marked as excludeReport
  const currentMonthTransactions = transactions.filter((t) => {
    return t.year_month === currentYearMonth && !t.exclude_report;
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
          to="/dashboard"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "#374151" }} />
        </Link>
        <div>
          <h1
            className="text-xl font-bold font-heading"
            style={{ color: "#111827" }}
          >
            Monthly Report
          </h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            {monthName} {now.getFullYear()} - Transactions counted in report
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4" style={{ color: "#DC2626" }} />
              <span
                className="text-sm font-medium"
                style={{ color: "#374151" }}
              >
                Spending
              </span>
            </div>
            <p
              className="text-lg font-bold font-heading"
              style={{ color: "#DC2626" }}
            >
              {valuesHidden
                ? maskValue(formatCurrency(totalSpending))
                : formatCurrency(totalSpending)}
            </p>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {spendingTransactions.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" style={{ color: "#059669" }} />
              <span
                className="text-sm font-medium"
                style={{ color: "#374151" }}
              >
                Income
              </span>
            </div>
            <p
              className="text-lg font-bold font-heading"
              style={{ color: "#059669" }}
            >
              {valuesHidden
                ? maskValue(formatCurrency(totalIncome))
                : formatCurrency(totalIncome)}
            </p>
            <p className="text-xs" style={{ color: "#6B7280" }}>
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
            <CardTitle
              className="text-base font-heading flex items-center gap-2"
              style={{ color: "#111827" }}
            >
              <TrendingDown className="h-4 w-4" style={{ color: "#DC2626" }} />
              Spending Transactions ({spendingTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {spendingTransactions.length === 0 ? (
              <p
                className="text-sm py-4 text-center"
                style={{ color: "#6B7280" }}
              >
                No spending transactions this month
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {spendingTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: "#FEF2F2" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "#111827" }}
                      >
                        {t.note || t.category}
                      </p>
                      <p className="text-xs" style={{ color: "#6B7280" }}>
                        {new Date(t.date).toLocaleDateString()} • {t.category} •{" "}
                        {t.account}
                      </p>
                    </div>
                    <p
                      className="text-sm font-bold ml-2"
                      style={{ color: "#DC2626" }}
                    >
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
              <div
                className="flex items-center justify-between p-3 rounded-lg mt-2"
                style={{ backgroundColor: "#374151" }}
              >
                <p className="text-sm font-bold" style={{ color: "#FFFFFF" }}>
                  Total Spending
                </p>
                <p className="text-sm font-bold" style={{ color: "#FFFFFF" }}>
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
            <CardTitle
              className="text-base font-heading flex items-center gap-2"
              style={{ color: "#111827" }}
            >
              <TrendingUp className="h-4 w-4" style={{ color: "#059669" }} />
              Income Transactions ({incomeTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {incomeTransactions.length === 0 ? (
              <p
                className="text-sm py-4 text-center"
                style={{ color: "#6B7280" }}
              >
                No income transactions this month
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {incomeTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: "#F0FDF4" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "#111827" }}
                      >
                        {t.note || t.category}
                      </p>
                      <p className="text-xs" style={{ color: "#6B7280" }}>
                        {new Date(t.date).toLocaleDateString()} • {t.category} •{" "}
                        {t.account}
                      </p>
                    </div>
                    <p
                      className="text-sm font-bold ml-2"
                      style={{ color: "#059669" }}
                    >
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
              <div
                className="flex items-center justify-between p-3 rounded-lg mt-2"
                style={{ backgroundColor: "#374151" }}
              >
                <p className="text-sm font-bold" style={{ color: "#FFFFFF" }}>
                  Total Income
                </p>
                <p className="text-sm font-bold" style={{ color: "#FFFFFF" }}>
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
