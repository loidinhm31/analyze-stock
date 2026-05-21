import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
} from "@money-insight/ui/components/atoms";
import { StatCard } from "@money-insight/ui/components/molecules";
import {
  CategoryPieChart,
  MonthlyTrendChart,
  BottleneckAlerts,
  TransactionList,
  DateRangeFilter,
  SearchInput,
  MonthlyReportSection,
  TopSpendingSection,
  ReportsSection,
} from "@money-insight/ui/components/organisms";
import { formatCurrency } from "@money-insight/ui/lib";
import { CircleHelp, Eye, EyeOff, Wallet } from "lucide-react";
import type {
  Transaction,
  CategorySpending,
  MonthlyAnalysis,
  SpendingBottleneck,
  MonthlyReport,
} from "@money-insight/ui/types";

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
  currentMonthReport: MonthlyReport | null;
  stats: {
    transactionCount: number;
    categoryCount: number;
    totalExpense: number;
    totalIncome: number;
    netSavings: number;
    avgTransaction: number;
    savingsRate: number;
  } | null;
  filter: {
    dateRange?: {
      startDate: Date | undefined;
      endDate: Date | undefined;
    };
    search?: string;
  };
  onSearchChange: (search: string) => void;
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
  currentMonthReport,
  stats,
  filter,
  onSearchChange,
  onFilterApply,
  onFilterClear,
  valuesHidden,
  onToggleValuesHidden,
}: DashboardProps) {
  // Mask value with asterisks matching the original length
  const maskValue = (value: string) => "*".repeat(value.length);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
            Money Analysis
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {stats?.transactionCount} transactions • {stats?.categoryCount}{" "}
            categories
            {filter.search && ` • Searching: "${filter.search}"`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <SearchInput value={filter.search || ""} onChange={onSearchChange} />
          <DateRangeFilter
            dateRange={filter.dateRange}
            onApply={onFilterApply}
            onClear={onFilterClear}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
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
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
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
          valueColor="var(--color-success)"
        />
        <StatCard
          title="Net Savings"
          value={(() => {
            const formatted = formatCurrency(stats?.netSavings || 0);
            return valuesHidden ? maskValue(formatted) : formatted;
          })()}
          valueColor={
            (stats?.netSavings || 0) >= 0
              ? "var(--color-success)"
              : "var(--color-destructive)"
          }
        />
        <StatCard
          title="Savings Rate"
          value={`${stats?.savingsRate.toFixed(1)}%`}
          subtitle={
            (stats?.savingsRate || 0) >= 30 ? "Excellent!" : "Target: 30%"
          }
          icon={
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  aria-label="Show savings rate calculation"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-2 p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    How it&apos;s calculated
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Savings Rate = Net Savings / Total Income × 100
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Net Savings = Total Income - Total Expenses
                  </p>
                </div>
                {!valuesHidden && stats ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Current period: ({formatCurrency(stats.netSavings)} /{" "}
                    {formatCurrency(stats.totalIncome)}) × 100 ={" "}
                    {stats.savingsRate.toFixed(1)}%
                  </p>
                ) : null}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  If total income is 0, this card shows 0%.
                </p>
              </PopoverContent>
            </Popover>
          }
        />
      </div>

      {/* Wallet Balances */}
      {walletBalances.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base sm:text-lg font-heading text-foreground">
                Wallet Balances
              </CardTitle>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                Total Balance
              </span>
              <p
                className="text-xl sm:text-2xl font-bold font-heading"
                style={{
                  color:
                    walletBalances.reduce((sum, w) => sum + w.balance, 0) >= 0
                      ? "var(--color-success)"
                      : "var(--color-destructive)",
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
                  <span className="text-muted-foreground">
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
                          className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                        >
                          <span className="text-sm font-medium text-secondary-foreground">
                            {wallet.account}
                          </span>
                          <span
                            className="text-sm font-semibold"
                            style={{
                              color:
                                wallet.balance >= 0
                                  ? "var(--color-success)"
                                  : "var(--color-destructive)",
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

      {/* Top Spending */}
      <TopSpendingSection
        transactions={transactions}
        valuesHidden={valuesHidden}
      />

      {/* Monthly Report */}
      {currentMonthReport && (
        <MonthlyReportSection
          report={currentMonthReport}
          valuesHidden={valuesHidden}
        />
      )}

      {/* Spending Insights */}
      <BottleneckAlerts bottlenecks={bottlenecks} valuesHidden={valuesHidden} />

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
          <TabsTrigger value="reports" className="text-xs sm:text-sm">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 sm:space-y-4">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg font-heading text-foreground">
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <CategoryPieChart
                  data={categorySpending}
                  valuesHidden={valuesHidden}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg font-heading text-foreground">
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
              <CardTitle className="text-base sm:text-lg font-heading text-foreground">
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
              <CardTitle className="text-base sm:text-lg font-heading text-foreground">
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <CategoryPieChart
                data={categorySpending}
                valuesHidden={valuesHidden}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg font-heading text-foreground">
                All Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <TransactionList transactions={transactions} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <ReportsSection
            transactions={transactions}
            valuesHidden={valuesHidden}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
