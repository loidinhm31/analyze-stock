import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  CategoryIcon,
} from "@money-insight/ui/components/atoms";
import { useCategoryIcon } from "@money-insight/ui/hooks";
import { TransactionListModal } from "@money-insight/ui/components/organisms";
import { formatCurrency } from "@money-insight/ui/lib";
import { TrendingUp } from "lucide-react";
import type { Transaction } from "@money-insight/ui/types";
import { useCategoryGroupStore } from "@money-insight/ui/stores";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";

interface CategoryTotal {
  category: string;
  total: number;
  count: number;
  percentage: number;
  transactions: Transaction[];
}

export interface TopSpendingSectionProps {
  transactions: Transaction[];
  valuesHidden?: boolean;
}

export function TopSpendingSection({
  transactions,
  valuesHidden = false,
}: TopSpendingSectionProps) {
  const { getIcon } = useCategoryIcon();
  const [activeTab, setActiveTab] = useState<"week" | "month">("week");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryTotal | null>(null);

  // Get category lookup for grouping
  const { lookupMap } = useCategoryGroupStore();

  // Calculate date ranges
  const { weekStart, weekEnd, monthStart, monthEnd } = useMemo(() => {
    const now = new Date();
    return {
      weekStart: startOfWeek(now, { weekStartsOn: 1 }),
      weekEnd: endOfWeek(now, { weekStartsOn: 1 }),
      monthStart: startOfMonth(now),
      monthEnd: endOfMonth(now),
    };
  }, []);

  // Calculate top spending for the current week (grouped by parent category)
  const weeklyTopSpending = useMemo(() => {
    return calculateTopSpending(transactions, weekStart, weekEnd, lookupMap);
  }, [transactions, weekStart, weekEnd, lookupMap]);

  // Calculate top spending for the current month (grouped by parent category)
  const monthlyTopSpending = useMemo(() => {
    return calculateTopSpending(transactions, monthStart, monthEnd, lookupMap);
  }, [transactions, monthStart, monthEnd, lookupMap]);

  // Mask value with asterisks
  const maskValue = (value: string) => "*".repeat(value.length);

  const handleCategoryClick = (item: CategoryTotal) => {
    setSelectedCategory(item);
  };

  const renderTopSpending = (data: CategoryTotal[]) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No spending data for this period
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data.slice(0, 5).map((item, index) => {
          const formattedAmount = formatCurrency(item.total);
          return (
            <div
              key={item.category}
              className="flex items-center justify-between py-2 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted rounded-lg px-2 -mx-2 transition-colors"
              onClick={() => handleCategoryClick(item)}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor:
                      index === 0
                        ? "var(--color-destructive-bg)"
                        : index === 1
                          ? "var(--color-warning-bg)"
                          : index === 2
                            ? "var(--color-info-bg)"
                            : "var(--color-muted)",
                    color:
                      index === 0
                        ? "var(--color-destructive)"
                        : index === 1
                          ? "var(--color-warning)"
                          : index === 2
                            ? "var(--color-info)"
                            : "var(--color-muted-foreground)",
                  }}
                >
                  {index + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  {getIcon(item.category) && (
                    <CategoryIcon
                      name={getIcon(item.category)}
                      size={20}
                      className="inline-block shrink-0"
                    />
                  )}
                  <span className="text-sm font-medium text-secondary-foreground">
                    {item.category}
                  </span>
                  <span className="text-xs ml-2 text-muted-foreground">
                    ({item.count} transactions)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-destructive">
                  {valuesHidden ? maskValue(formattedAmount) : formattedAmount}
                </span>
                <span className="text-xs block text-muted-foreground">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Get total for display
  const weeklyTotal = weeklyTopSpending.reduce((sum, c) => sum + c.total, 0);
  const monthlyTotal = monthlyTopSpending.reduce((sum, c) => sum + c.total, 0);

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base sm:text-lg font-heading text-foreground">
                Top Spending
              </CardTitle>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">
                {activeTab === "week" ? "This Week" : "This Month"} Total
              </span>
              <p className="text-lg font-bold font-heading text-destructive">
                {valuesHidden
                  ? maskValue(
                      formatCurrency(
                        activeTab === "week" ? weeklyTotal : monthlyTotal,
                      ),
                    )
                  : formatCurrency(
                      activeTab === "week" ? weeklyTotal : monthlyTotal,
                    )}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "week" | "month")}
            className="w-full"
          >
            <TabsList className="w-full mb-4">
              <TabsTrigger value="week" className="flex-1 text-xs sm:text-sm">
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="flex-1 text-xs sm:text-sm">
                Month
              </TabsTrigger>
            </TabsList>

            <TabsContent value="week" className="mt-0">
              {renderTopSpending(weeklyTopSpending)}
            </TabsContent>

            <TabsContent value="month" className="mt-0">
              {renderTopSpending(monthlyTopSpending)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction List Modal */}
      <TransactionListModal
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={selectedCategory?.category || ""}
        subtitle={activeTab === "week" ? "This Week" : "This Month"}
        transactions={selectedCategory?.transactions || []}
        valuesHidden={valuesHidden}
      />
    </>
  );
}

// Helper function to calculate top spending categories within a date range
// Optionally groups by parent category using the lookup map
function calculateTopSpending(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
  categoryLookup?: Map<string, string>,
): CategoryTotal[] {
  // Filter transactions within the date range (expenses only, excluding report-excluded transactions)
  const filtered = transactions.filter((t) => {
    if (t.expense <= 0) return false;
    if (t.excludeReport) return false;
    const txDate = new Date(t.date);
    return isWithinInterval(txDate, { start: startDate, end: endDate });
  });

  // Group by category (or parent category if lookup is provided)
  const categoryMap = new Map<
    string,
    { total: number; count: number; transactions: Transaction[] }
  >();
  let totalExpense = 0;

  filtered.forEach((t) => {
    // Resolve to parent category if lookup exists, otherwise use original
    const categoryKey =
      categoryLookup && categoryLookup.size > 0
        ? (categoryLookup.get(t.category) ?? t.category)
        : t.category;

    const current = categoryMap.get(categoryKey) || {
      total: 0,
      count: 0,
      transactions: [],
    };
    categoryMap.set(categoryKey, {
      total: current.total + t.expense,
      count: current.count + 1,
      transactions: [...current.transactions, t],
    });
    totalExpense += t.expense;
  });

  // Convert to array and calculate percentages
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
      transactions: data.transactions,
    }))
    .sort((a, b) => b.total - a.total);
}
