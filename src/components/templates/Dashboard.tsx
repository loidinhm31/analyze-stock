import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
} from "@/components/atoms";
import { StatCard } from "@/components/molecules";
import {
  CategoryPieChart,
  MonthlyTrendChart,
  BottleneckAlerts,
  TransactionList,
  TransactionDetailModal,
  DateRangeFilter,
} from "@/components/organisms";
import { formatCurrency } from "@/lib/utils";
import { Eye, EyeOff, Wallet } from "lucide-react";
import type {
  Transaction,
  CategorySpending,
  MonthlyAnalysis,
  SpendingBottleneck,
} from "@/types";

interface WalletBalance {
  account: string;
  balance: number;
  totalIncome: number;
  totalExpense: number;
}

export interface DashboardProps {
  transactions: Transaction[];
  categorySpending: CategorySpending[];
  monthlyAnalysis: MonthlyAnalysis[];
  bottlenecks: SpendingBottleneck[];
  walletBalances: WalletBalance[];
  stats: {
    transactionCount: number;
    categoryCount: number;
    totalExpense: number;
    totalIncome: number;
    netSavings: number;
    avgTransaction: number;
    savingsRate: number;
  } | null;
  selectedCategory: string | null;
  filter: {
    dateRange?: {
      startDate: Date | undefined;
      endDate: Date | undefined;
    };
  };
  onCategorySelect: (category: string | null) => void;
  onFilterApply: (dateRange: { startDate: Date; endDate: Date }) => void;
  onFilterClear: () => void;
  valuesHidden: boolean;
  onToggleValuesHidden: () => void;
}

export function Dashboard({
  transactions,
  categorySpending,
  monthlyAnalysis,
  bottlenecks,
  walletBalances,
  stats,
  selectedCategory,
  filter,
  onCategorySelect,
  onFilterApply,
  onFilterClear,
  valuesHidden,
  onToggleValuesHidden,
}: DashboardProps) {
  const selectedCategoryData = useMemo(() => {
    return categorySpending.find((cat) => cat.category === selectedCategory);
  }, [categorySpending, selectedCategory]);

  // Mask value with asterisks matching the original length
  const maskValue = (value: string) => "*".repeat(value.length);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold font-heading"
              style={{ color: "#111827" }}
            >
              Spending Analysis
            </h1>
            <p className="text-sm sm:text-base" style={{ color: "#6B7280" }}>
              {stats?.transactionCount} transactions • {stats?.categoryCount}{" "}
              categories
            </p>
          </div>
          <DateRangeFilter
            dateRange={filter.dateRange}
            onApply={onFilterApply}
            onClear={onFilterClear}
          />
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>
            Financial Summary
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleValuesHidden}
            className="h-8 w-8 p-0"
            title={valuesHidden ? "Show values" : "Hide values"}
          >
            {valuesHidden ? (
              <EyeOff className="h-4 w-4" style={{ color: "#6B7280" }} />
            ) : (
              <Eye className="h-4 w-4" style={{ color: "#6B7280" }} />
            )}
          </Button>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Expenses"
            value={(() => {
              const formatted = formatCurrency(stats?.totalExpense || 0);
              return valuesHidden ? maskValue(formatted) : formatted;
            })()}
            subtitle={
              valuesHidden
                ? undefined
                : `Avg: ${formatCurrency(stats?.avgTransaction || 0)}/transaction`
            }
          />
          <StatCard
            title="Total Income"
            value={(() => {
              const formatted = formatCurrency(stats?.totalIncome || 0);
              return valuesHidden ? maskValue(formatted) : formatted;
            })()}
            valueColor="#059669"
          />
          <StatCard
            title="Net Savings"
            value={(() => {
              const formatted = formatCurrency(stats?.netSavings || 0);
              return valuesHidden ? maskValue(formatted) : formatted;
            })()}
            valueColor={(stats?.netSavings || 0) >= 0 ? "#059669" : "#DC2626"}
          />
          <StatCard
            title="Savings Rate"
            value={`${stats?.savingsRate.toFixed(1)}%`}
            subtitle={
              (stats?.savingsRate || 0) >= 30 ? "Excellent!" : "Target: 30%"
            }
          />
        </div>

        {/* Wallet Balances */}
        {walletBalances.length > 0 && (
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" style={{ color: "#6B7280" }} />
                <CardTitle
                  className="text-base sm:text-lg font-heading"
                  style={{ color: "#111827" }}
                >
                  Wallet Balances
                </CardTitle>
              </div>
              <div className="mt-2">
                <span className="text-sm" style={{ color: "#6B7280" }}>
                  Total Balance
                </span>
                <p
                  className="text-xl sm:text-2xl font-bold font-heading"
                  style={{
                    color:
                      walletBalances.reduce((sum, w) => sum + w.balance, 0) >= 0
                        ? "#059669"
                        : "#DC2626",
                  }}
                >
                  {(() => {
                    const totalBalance = walletBalances.reduce(
                      (sum, w) => sum + w.balance,
                      0,
                    );
                    const formatted = formatCurrency(totalBalance);
                    return valuesHidden ? maskValue(formatted) : formatted;
                  })()}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="wallets" className="border-b-0">
                  <AccordionTrigger className="text-sm hover:no-underline py-2">
                    <span style={{ color: "#6B7280" }}>
                      View {walletBalances.length} wallet
                      {walletBalances.length > 1 ? "s" : ""}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {walletBalances.map((wallet) => {
                        const formattedBalance = formatCurrency(wallet.balance);
                        return (
                          <div
                            key={wallet.account}
                            className="flex items-center justify-between py-2 border-b border-[#E5E7EB] last:border-b-0"
                          >
                            <span
                              className="text-sm font-medium"
                              style={{ color: "#374151" }}
                            >
                              {wallet.account}
                            </span>
                            <span
                              className="text-sm font-semibold"
                              style={{
                                color:
                                  wallet.balance >= 0 ? "#059669" : "#DC2626",
                              }}
                            >
                              {valuesHidden
                                ? maskValue(formattedBalance)
                                : formattedBalance}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Spending Insights */}
        <BottleneckAlerts
          bottlenecks={bottlenecks}
          onCategoryClick={onCategorySelect}
        />

        {/* Main Visualizations */}
        <Tabs defaultValue="overview" className="space-y-3 sm:space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">
              Monthly
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm">
              Categories
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs sm:text-sm">
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle
                    className="text-base sm:text-lg font-heading"
                    style={{ color: "#111827" }}
                  >
                    Spending by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <CategoryPieChart
                    data={categorySpending}
                    selectedCategory={selectedCategory}
                    onCategoryClick={onCategorySelect}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle
                    className="text-base sm:text-lg font-heading"
                    style={{ color: "#111827" }}
                  >
                    Monthly Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <MonthlyTrendChart data={monthlyAnalysis} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <CardTitle
                  className="text-base sm:text-lg font-heading"
                  style={{ color: "#111827" }}
                >
                  Monthly Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <MonthlyTrendChart data={monthlyAnalysis} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <CardTitle
                  className="text-base sm:text-lg font-heading"
                  style={{ color: "#111827" }}
                >
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <CategoryPieChart
                  data={categorySpending}
                  selectedCategory={selectedCategory}
                  onCategoryClick={onCategorySelect}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <CardTitle
                  className="text-base sm:text-lg font-heading"
                  style={{ color: "#111827" }}
                >
                  All Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <TransactionList transactions={transactions} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={!!selectedCategory}
        onClose={() => onCategorySelect(null)}
        selectedCategory={selectedCategory}
        categoryData={selectedCategoryData}
      />
    </>
  );
}
