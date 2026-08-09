import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@money-insight/ui/components/atoms";
import { TrendingReportChart } from "@money-insight/ui/components/organisms";
import { formatCurrency } from "@money-insight/ui/lib";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import type { MonthlyReport } from "@money-insight/ui/types";
import { Link } from "react-router-dom";
import { useNav } from "@money-insight/ui/hooks";

export interface MonthlyReportSectionProps {
  report: MonthlyReport;
  valuesHidden?: boolean;
}

export function MonthlyReportSection({
  report,
  valuesHidden = false,
}: MonthlyReportSectionProps) {
  const { to } = useNav();
  const maskValue = (value: string) => "*".repeat(value.length);

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

  const monthName = monthNames[report.month - 1];

  // Calculate comparison with 3-month average
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === report.year &&
    today.getMonth() + 1 === report.month;
  const currentDay = isCurrentMonth ? today.getDate() : report.daysInMonth;

  // Get pro-rated average for comparison
  const avgDayData = report.previousThreeMonthDailyPattern.find(
    (d) => d.dayOfMonth === currentDay,
  );
  const proRatedAverage = avgDayData?.averageCumulativeExpense || 0;

  const difference = report.currentDayExpense - proRatedAverage;
  const percentDiff =
    proRatedAverage > 0 ? (difference / proRatedAverage) * 100 : 0;
  const isOverBudget = difference > 0;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base sm:text-lg font-heading text-foreground">
              Report this month
            </CardTitle>
          </div>
          <Link
            to={to("transactions")}
            className="text-sm cursor-pointer hover:underline text-primary"
          >
            See all transactions
          </Link>
        </div>
        <p className="text-sm mt-1 text-muted-foreground">
          {monthName} {report.year} - Day {currentDay} of {report.daysInMonth}
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-destructive/10">
            <p className="text-xs text-muted-foreground">Spent so far</p>
            <p className="text-lg font-bold font-heading text-destructive">
              {valuesHidden
                ? maskValue(formatCurrency(report.currentDayExpense))
                : formatCurrency(report.currentDayExpense)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {isOverBudget ? (
                <TrendingUp className="h-3 w-3 text-destructive" />
              ) : (
                <TrendingDown className="h-3 w-3 text-success" />
              )}
              <span
                className="text-xs"
                style={{
                  color: isOverBudget
                    ? "var(--color-destructive)"
                    : "var(--color-success)",
                }}
              >
                {valuesHidden
                  ? "•••• vs avg"
                  : `${isOverBudget ? "+" : ""}${percentDiff.toFixed(1)}% vs avg`}
              </span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-success/10">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-bold font-heading text-success">
              {valuesHidden
                ? maskValue(formatCurrency(report.totalIncome))
                : formatCurrency(report.totalIncome)}
            </p>
            <p className="text-xs mt-1 text-muted-foreground">
              3-mo avg:{" "}
              {valuesHidden
                ? maskValue(formatCurrency(report.previousThreeMonthAverage))
                : formatCurrency(report.previousThreeMonthAverage)}
            </p>
          </div>
        </div>

        {/* Trending Chart */}
        <div>
          <p className="text-sm font-medium mb-2 text-secondary-foreground">
            Cumulative spending trend
          </p>
          <TrendingReportChart report={report} valuesHidden={valuesHidden} />
        </div>
      </CardContent>
    </Card>
  );
}
