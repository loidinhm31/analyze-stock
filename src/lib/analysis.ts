import type {
  ProcessedTransaction,
  CategorySpending,
  MonthlyAnalysis,
  YearlyAnalysis,
  SpendingBottleneck,
  FilterState,
} from "@/types";
import { matchesSearch } from "@/lib/utils";

export class SpendingAnalyzer {
  private transactions: ProcessedTransaction[];

  constructor(transactions: ProcessedTransaction[]) {
    this.transactions = transactions;
  }

  // Filter transactions based on criteria
  filterTransactions(filter: FilterState): ProcessedTransaction[] {
    let filtered = [...this.transactions];

    if (filter.dateRange) {
      filtered = filtered.filter(
        (t) =>
          t.date >= filter.dateRange!.startDate &&
          t.date <= filter.dateRange!.endDate,
      );
    }

    if (filter.categories.length > 0) {
      filtered = filtered.filter((t) => filter.categories.includes(t.category));
    }

    if (filter.accounts.length > 0) {
      filtered = filtered.filter((t) => filter.accounts.includes(t.account));
    }

    if (filter.minAmount !== undefined) {
      filtered = filtered.filter((t) => t.expense >= filter.minAmount!);
    }

    if (filter.maxAmount !== undefined) {
      filtered = filtered.filter((t) => t.expense <= filter.maxAmount!);
    }

    if (filter.search?.trim()) {
      filtered = filtered.filter((t) => matchesSearch(t, filter.search!));
    }

    return filtered;
  }

  // Analyze by category
  analyzeCategorySpending(
    transactions: ProcessedTransaction[] = this.transactions,
  ): CategorySpending[] {
    const categoryMap = new Map<string, ProcessedTransaction[]>();

    transactions.forEach((t) => {
      if (t.expense > 0) {
        if (!categoryMap.has(t.category)) {
          categoryMap.set(t.category, []);
        }
        categoryMap.get(t.category)!.push(t);
      }
    });

    const totalExpense = transactions.reduce((sum, t) => sum + t.expense, 0);

    return Array.from(categoryMap.entries())
      .map(([category, txns]) => {
        const total = txns.reduce((sum, t) => sum + t.expense, 0);
        return {
          category,
          total,
          count: txns.length,
          average: total / txns.length,
          percentage: (total / totalExpense) * 100,
          transactions: txns,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  // Analyze by month
  analyzeMonthly(
    transactions: ProcessedTransaction[] = this.transactions,
  ): MonthlyAnalysis[] {
    const monthMap = new Map<string, ProcessedTransaction[]>();

    transactions.forEach((t) => {
      if (!monthMap.has(t.yearMonth)) {
        monthMap.set(t.yearMonth, []);
      }
      monthMap.get(t.yearMonth)!.push(t);
    });

    return Array.from(monthMap.entries())
      .map(([yearMonth, txns]) => {
        const totalExpense = txns.reduce((sum, t) => sum + t.expense, 0);
        const totalIncome = txns.reduce((sum, t) => sum + t.income, 0);
        const netSavings = totalIncome - totalExpense;

        return {
          yearMonth,
          totalExpense,
          totalIncome,
          netSavings,
          savingsRate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0,
          categoryBreakdown: this.analyzeCategorySpending(txns),
        };
      })
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }

  // Analyze by year
  analyzeYearly(
    transactions: ProcessedTransaction[] = this.transactions,
  ): YearlyAnalysis[] {
    const yearMap = new Map<number, ProcessedTransaction[]>();

    transactions.forEach((t) => {
      if (!yearMap.has(t.year)) {
        yearMap.set(t.year, []);
      }
      yearMap.get(t.year)!.push(t);
    });

    return Array.from(yearMap.entries())
      .map(([year, txns]) => {
        const totalExpense = txns.reduce((sum, t) => sum + t.expense, 0);
        const totalIncome = txns.reduce((sum, t) => sum + t.income, 0);
        const netSavings = totalIncome - totalExpense;

        return {
          year,
          totalExpense,
          totalIncome,
          netSavings,
          savingsRate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0,
          monthlyData: this.analyzeMonthly(txns),
          categoryBreakdown: this.analyzeCategorySpending(txns),
        };
      })
      .sort((a, b) => a.year - b.year);
  }

  // Detect spending bottlenecks
  detectBottlenecks(
    transactions: ProcessedTransaction[] = this.transactions,
  ): SpendingBottleneck[] {
    const bottlenecks: SpendingBottleneck[] = [];
    const categorySpending = this.analyzeCategorySpending(transactions);

    categorySpending.forEach((cat) => {
      // High amount bottleneck (>15% of total spending)
      if (cat.percentage > 15) {
        bottlenecks.push({
          type: "high_amount",
          category: cat.category,
          severity: cat.percentage > 20 ? "critical" : "high",
          amount: cat.total,
          percentage: cat.percentage,
          suggestion: `${cat.category} represents ${cat.percentage.toFixed(1)}% of your spending. Consider reducing by 20-30%.`,
          transactions: cat.transactions,
        });
      }

      // High frequency bottleneck (>100 transactions)
      if (cat.count > 100) {
        bottlenecks.push({
          type: "high_frequency",
          category: cat.category,
          severity:
            cat.count > 500 ? "critical" : cat.count > 200 ? "high" : "medium",
          amount: cat.total,
          percentage: cat.percentage,
          suggestion: `${cat.count} transactions in ${cat.category}. Small purchases add up to ${this.formatCurrency(cat.total)}.`,
          transactions: cat.transactions,
        });
      }
    });

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // Calculate statistics
  getStatistics(transactions: ProcessedTransaction[] = this.transactions) {
    const totalExpense = transactions.reduce((sum, t) => sum + t.expense, 0);
    const totalIncome = transactions.reduce((sum, t) => sum + t.income, 0);
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    const expenseTransactions = transactions.filter((t) => t.expense > 0);
    const avgTransaction = totalExpense / expenseTransactions.length;

    const categories = new Set(transactions.map((t) => t.category));
    const accounts = new Set(transactions.map((t) => t.account));

    return {
      totalExpense,
      totalIncome,
      netSavings,
      savingsRate,
      avgTransaction,
      transactionCount: transactions.length,
      categoryCount: categories.size,
      accountCount: accounts.size,
      dateRange: {
        start: transactions[0]?.date,
        end: transactions[transactions.length - 1]?.date,
      },
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
