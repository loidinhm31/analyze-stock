import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms";
import { TrendingReportChart } from "./TrendingReportChart";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import type { MonthlyReport } from "@/types";
import { Link } from "react-router-dom";

export interface MonthlyReportSectionProps {
  report: MonthlyReport;
  valuesHidden?: boolean;
}

export function MonthlyReportSection({
  report,
  valuesHidden = false,
}: MonthlyReportSectionProps) {
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
            <Calendar className="h-5 w-5" style={{ color: "#6B7280" }} />
            <CardTitle
              className="text-base sm:text-lg font-heading"
              style={{ color: "#111827" }}
            >
              Report this month
            </CardTitle>
          </div>
          <Link
            to="/reports"
            className="text-sm cursor-pointer hover:underline"
            style={{ color: "#635BFF" }}
          >
            See reports
          </Link>
        </div>
        <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
          {monthName} {report.year} - Day {currentDay} of {report.daysInMonth}
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: "#FEF2F2" }}
          >
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Spent so far
            </p>
            <p
              className="text-lg font-bold font-heading"
              style={{ color: "#DC2626" }}
            >
              {valuesHidden
                ? maskValue(formatCurrency(report.currentDayExpense))
                : formatCurrency(report.currentDayExpense)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {isOverBudget ? (
                <TrendingUp className="h-3 w-3" style={{ color: "#DC2626" }} />
              ) : (
                <TrendingDown
                  className="h-3 w-3"
                  style={{ color: "#059669" }}
                />
              )}
              <span
                className="text-xs"
                style={{ color: isOverBudget ? "#DC2626" : "#059669" }}
              >
                {isOverBudget ? "+" : ""}
                {percentDiff.toFixed(1)}% vs avg
              </span>
            </div>
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: "#F0FDF4" }}
          >
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Income
            </p>
            <p
              className="text-lg font-bold font-heading"
              style={{ color: "#059669" }}
            >
              {valuesHidden
                ? maskValue(formatCurrency(report.totalIncome))
                : formatCurrency(report.totalIncome)}
            </p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
              3-mo avg:{" "}
              {valuesHidden
                ? maskValue(formatCurrency(report.previousThreeMonthAverage))
                : formatCurrency(report.previousThreeMonthAverage)}
            </p>
          </div>
        </div>

        {/* Trending Chart */}
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: "#374151" }}>
            Cumulative spending trend
          </p>
          <TrendingReportChart report={report} />
        </div>
      </CardContent>
    </Card>
  );
}
