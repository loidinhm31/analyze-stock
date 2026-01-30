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
import { MonthlyAnalysis } from "@/types";
import { formatCurrency } from "@/lib/utils";

export interface MonthlyTrendChartProps {
  data: MonthlyAnalysis[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const chartData = data.map((month) => ({
    month: month.yearMonth,
    expense: month.totalExpense,
    income: month.totalIncome,
    savings: month.netSavings,
    savingsRate: month.savingsRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EC" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#6F767E" }}
          angle={-45}
          textAnchor="end"
          height={80}
          stroke="#E6E8EC"
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: "#6F767E" }}
          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
          stroke="#E6E8EC"
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: "#6F767E" }}
          tickFormatter={(value) => `${value.toFixed(0)}%`}
          stroke="#E6E8EC"
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const data = payload[0].payload;
            return (
              <div
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                className="border rounded-lg p-3 shadow-lg"
              >
                <p className="font-semibold mb-2" style={{ color: "#111827" }}>
                  {data.month}
                </p>
                <p className="text-sm" style={{ color: "#DC2626" }}>
                  Expense: {formatCurrency(data.expense)}
                </p>
                <p className="text-sm" style={{ color: "#059669" }}>
                  Income: {formatCurrency(data.income)}
                </p>
                <p className="text-sm font-medium" style={{ color: "#111827" }}>
                  Savings: {formatCurrency(data.savings)}
                </p>
                <p className="text-sm" style={{ color: "#6B7280" }}>
                  Rate: {data.savingsRate.toFixed(1)}%
                </p>
              </div>
            );
          }}
        />
        <Legend />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="expense"
          fill="#DC2626"
          stroke="#DC2626"
          fillOpacity={0.1}
          name="Expense"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="income"
          stroke="#059669"
          strokeWidth={2}
          name="Income"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="savingsRate"
          stroke="#635BFF"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Savings Rate"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
