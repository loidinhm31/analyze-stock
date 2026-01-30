import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { CategorySpending } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { TransactionListModal } from "./TransactionListModal";

// Payment gateway color palette (Stripe-inspired)
const COLORS = [
  "#635BFF",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#DC2626",
  "#65A30D",
  "#4F46E5",
  "#EA580C",
];

export interface CategoryPieChartProps {
  data: CategorySpending[];
  valuesHidden?: boolean;
}

export function CategoryPieChart({
  data,
  valuesHidden = false,
}: CategoryPieChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategorySpending | null>(null);

  const chartData = data.slice(0, 10).map((cat) => ({
    name: cat.category,
    value: cat.total,
    percentage: cat.percentage,
    count: cat.count,
    transactions: cat.transactions,
  }));

  const handleClick = (chartEntry: any) => {
    const category = data.find((c) => c.category === chartEntry.name);
    if (category) {
      setSelectedCategory(category);
    }
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry: any) =>
              `${entry.name}: ${entry.percentage.toFixed(1)}%`
            }
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            onClick={handleClick}
            style={{ cursor: "pointer" }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke={entry.name === selectedCategory?.category ? "#000" : "none"}
                strokeWidth={entry.name === selectedCategory?.category ? 3 : 0}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                  className="border rounded-lg p-3 shadow-lg"
                >
                  <p className="font-semibold" style={{ color: "#111827" }}>
                    {data.name}
                  </p>
                  <p className="text-sm" style={{ color: "#111827" }}>
                    Amount: {valuesHidden ? "*".repeat(formatCurrency(data.value).length) : formatCurrency(data.value)}
                  </p>
                  <p className="text-sm" style={{ color: "#111827" }}>
                    Percentage: {data.percentage.toFixed(1)}%
                  </p>
                  <p className="text-sm" style={{ color: "#111827" }}>
                    Transactions: {data.count}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                    Click to view details
                  </p>
                </div>
              );
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Transaction List Modal */}
      <TransactionListModal
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={selectedCategory?.category || ""}
        subtitle={`${selectedCategory?.count || 0} transactions`}
        transactions={selectedCategory?.transactions || []}
        valuesHidden={valuesHidden}
      />
    </>
  );
}
