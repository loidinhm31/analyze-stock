import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { CategorySpending } from "@money-insight/ui/types";
import { formatCurrency } from "@money-insight/ui/lib";
import { CategoryIcon } from "@money-insight/ui/components/atoms";
import { useCategoryIcon } from "@money-insight/ui/hooks";
import { TransactionListModal } from "./TransactionListModal";
import { SubCategoryBreakdownModal } from "./SubCategoryBreakdownModal";

// Chart color palette using CSS variables
const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-accent)",
  "var(--color-destructive)",
  "var(--color-success)",
  "var(--color-primary)",
  "var(--color-warning)",
];

export interface CategoryPieChartProps {
  data: CategorySpending[];
  valuesHidden?: boolean;
}

export function CategoryPieChart({
  data,
  valuesHidden = false,
}: CategoryPieChartProps) {
  const { getIcon } = useCategoryIcon();
  const [selectedCategory, setSelectedCategory] =
    useState<CategorySpending | null>(null);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const chartData = useMemo(
    () =>
      data.slice(0, 10).map((cat) => ({
        name: cat.category,
        value: cat.total,
        percentage: cat.percentage,
        count: cat.count,
        transactions: cat.transactions,
        hasSubCategories: !!cat.subCategories && cat.subCategories.length > 0,
      })),
    [data],
  );

  const handleClick = (chartEntry: any) => {
    const category = data.find((c) => c.category === chartEntry.name);
    if (category) {
      setSelectedCategory(category);
      // Show sub-category breakdown if it has sub-categories, otherwise show transactions
      if (category.subCategories && category.subCategories.length > 0) {
        setShowSubCategoryModal(true);
      } else {
        setShowTransactionModal(true);
      }
    }
  };

  const handleSubCategorySelect = (subCategory: CategorySpending) => {
    // Close sub-category modal and show transactions for the selected sub-category
    setShowSubCategoryModal(false);
    setSelectedCategory(subCategory);
    setShowTransactionModal(true);
  };

  const handleCloseModals = () => {
    setSelectedCategory(null);
    setShowSubCategoryModal(false);
    setShowTransactionModal(false);
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
            fill="var(--color-chart-1)"
            dataKey="value"
            onClick={handleClick}
            style={{ cursor: "pointer" }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke={
                  entry.name === selectedCategory?.category
                    ? "var(--color-foreground)"
                    : "none"
                }
                strokeWidth={entry.name === selectedCategory?.category ? 3 : 0}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div className="border rounded-lg p-3 shadow-lg bg-card border-border">
                  <p className="font-semibold text-foreground inline-flex items-center gap-1.5">
                    {getIcon(data.name) && (
                      <CategoryIcon
                        name={getIcon(data.name)}
                        size={20}
                        className="inline-block shrink-0"
                      />
                    )}
                    {data.name}
                  </p>
                  <p className="text-sm text-foreground">
                    Amount:{" "}
                    {valuesHidden
                      ? "*".repeat(formatCurrency(data.value).length)
                      : formatCurrency(data.value)}
                  </p>
                  <p className="text-sm text-foreground">
                    Percentage: {data.percentage.toFixed(1)}%
                  </p>
                  <p className="text-sm text-foreground">
                    Transactions: {data.count}
                  </p>
                  {data.hasSubCategories && (
                    <p className="text-xs mt-1 text-primary">
                      Has sub-categories
                    </p>
                  )}
                  <p className="text-xs mt-1 text-muted-foreground">
                    Click to view details
                  </p>
                </div>
              );
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Sub-Category Breakdown Modal */}
      {selectedCategory?.subCategories && (
        <SubCategoryBreakdownModal
          isOpen={showSubCategoryModal}
          onClose={handleCloseModals}
          parentCategory={selectedCategory.category}
          subCategories={selectedCategory.subCategories}
          onSubCategorySelect={handleSubCategorySelect}
          valuesHidden={valuesHidden}
        />
      )}

      {/* Transaction List Modal */}
      <TransactionListModal
        isOpen={showTransactionModal}
        onClose={handleCloseModals}
        title={selectedCategory?.category || ""}
        subtitle={`${selectedCategory?.count || 0} transactions`}
        transactions={selectedCategory?.transactions || []}
        valuesHidden={valuesHidden}
      />
    </>
  );
}
