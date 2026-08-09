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
import { MonthlyAnalysis } from "@money-insight/ui/types";
import { formatCurrency } from "@money-insight/ui/lib";

export interface MonthlyTrendChartProps {
  data: MonthlyAnalysis[];
  valuesHidden?: boolean;
}

export function MonthlyTrendChart({
  data,
  valuesHidden = false,
}: MonthlyTrendChartProps) {
  if (valuesHidden) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Monthly trend hidden while values are protected.
      </p>
    );
  }

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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          angle={-45}
          textAnchor="end"
          height={80}
          stroke="var(--color-border)"
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
          stroke="var(--color-border)"
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(value) => `${value.toFixed(0)}%`}
          stroke="var(--color-border)"
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const data = payload[0].payload;
            return (
              <div className="border rounded-lg p-3 shadow-lg bg-card border-border">
                <p className="font-semibold mb-2 text-foreground">
                  {data.month}
                </p>
                <p className="text-sm text-destructive">
                  Expense: {formatCurrency(data.expense)}
                </p>
                <p className="text-sm text-success">
                  Income: {formatCurrency(data.income)}
                </p>
                <p className="text-sm font-medium text-foreground">
                  Savings: {formatCurrency(data.savings)}
                </p>
                <p className="text-sm text-muted-foreground">
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
          fill="var(--color-destructive)"
          stroke="var(--color-destructive)"
          fillOpacity={0.1}
          name="Expense"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="income"
          stroke="var(--color-success)"
          strokeWidth={2}
          name="Income"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="savingsRate"
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Savings Rate"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
