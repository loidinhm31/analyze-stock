import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccountTypeValueHistoryPoint } from "@money-insight/ui/services/account-type-value-history";
import {
  formatAccountValue,
  hasKnownHistory,
} from "./account-type-value-widget-helpers";

export interface AccountTypeValueChartProps {
  currency: string;
  points: readonly AccountTypeValueHistoryPoint[];
  valuesHidden: boolean;
}

export function AccountTypeValueChart({
  currency,
  points,
  valuesHidden,
}: AccountTypeValueChartProps) {
  if (valuesHidden) {
    return (
      <p className="text-xs text-muted-foreground" role="status">
        12-month chart hidden while values are protected.
      </p>
    );
  }

  if (!hasKnownHistory(points)) {
    return (
      <p className="text-xs text-muted-foreground" role="status">
        No completed history yet.
      </p>
    );
  }

  const chartData = points.map((point) => ({
    month: point.monthEnd.slice(0, 7),
    value: point.value,
  }));

  return (
    <div aria-label={`${currency} 12-month balance history chart`} role="img">
      <ResponsiveContainer width="100%" height={230}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
        >
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            stroke="var(--color-border)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value: number) =>
              formatAccountValue(value, currency)
            }
            tickLine={false}
            width={72}
            stroke="var(--color-border)"
          />
          <Tooltip
            content={({ active, label, payload }) => {
              const value = payload?.[0]?.value;
              if (!active || typeof value !== "number") return null;
              return (
                <div className="rounded-md border border-border bg-card p-2 text-xs shadow-lg">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-muted-foreground">
                    Balance: {formatAccountValue(value, currency)}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            connectNulls={false}
            dot={{ r: 2, fill: "var(--color-primary)" }}
            isAnimationActive={false}
            name="Balance"
            stroke="var(--color-primary)"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
