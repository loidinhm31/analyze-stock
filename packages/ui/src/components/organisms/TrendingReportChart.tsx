import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import type { MonthlyReport } from "@/types";
import { formatCurrency } from "@/lib/utils";

export interface TrendingReportChartProps {
  report: MonthlyReport;
}

export function TrendingReportChart({ report }: TrendingReportChartProps) {
  // Build chart data combining current month and 3-month average
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === report.year &&
    today.getMonth() + 1 === report.month;
  const currentDay = isCurrentMonth ? today.getDate() : report.daysInMonth;

  const chartData = report.dailySpending
    .filter((d) => d.dayOfMonth <= currentDay)
    .map((day) => {
      const avgData = report.previousThreeMonthDailyPattern.find(
        (a) => a.dayOfMonth === day.dayOfMonth,
      );

      return {
        day: day.dayOfMonth,
        displayDate: day.displayDate,
        currentExpense: day.cumulativeExpense,
        averageExpense: avgData?.averageCumulativeExpense || 0,
        dailyExpense: day.expense,
        dailyAverage: avgData?.averageExpense || 0,
      };
    });

  // Add remaining days for average line (projected)
  if (isCurrentMonth && currentDay < report.daysInMonth) {
    for (let day = currentDay + 1; day <= report.daysInMonth; day++) {
      const avgData = report.previousThreeMonthDailyPattern.find(
        (a) => a.dayOfMonth === day,
      );
      if (avgData) {
        chartData.push({
          day,
          displayDate: `${report.month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`,
          currentExpense: undefined as unknown as number,
          averageExpense: avgData.averageCumulativeExpense,
          dailyExpense: undefined as unknown as number,
          dailyAverage: avgData.averageExpense,
        });
      }
    }
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EC" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#6F767E" }}
          stroke="#E6E8EC"
          tickFormatter={(value) => value.toString()}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6F767E" }}
          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
          stroke="#E6E8EC"
        />
        <Tooltip
          content={({ payload, label }) => {
            if (!payload || payload.length === 0) return null;
            const data = payload[0].payload;
            return (
              <div
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                className="border rounded-lg p-3 shadow-lg"
              >
                <p className="font-semibold mb-2" style={{ color: "#111827" }}>
                  Day {label}
                </p>
                {data.currentExpense !== undefined && (
                  <p className="text-sm" style={{ color: "#DC2626" }}>
                    This month: {formatCurrency(data.currentExpense)}
                  </p>
                )}
                <p className="text-sm" style={{ color: "#6B7280" }}>
                  3-month avg: {formatCurrency(data.averageExpense)}
                </p>
                {data.dailyExpense !== undefined && data.dailyExpense > 0 && (
                  <p
                    className="text-xs mt-1 pt-1 border-t"
                    style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                  >
                    Today: {formatCurrency(data.dailyExpense)}
                  </p>
                )}
              </div>
            );
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) => (
            <span style={{ color: "#374151", fontSize: 12 }}>{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="currentExpense"
          fill="#DC2626"
          stroke="#DC2626"
          fillOpacity={0.15}
          strokeWidth={2}
          name="This month"
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="averageExpense"
          stroke="#9CA3AF"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="3-month average"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
