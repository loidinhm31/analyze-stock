import type {
  ProcessedTransaction,
  CategorySpending,
  MonthlyAnalysis,
  YearlyAnalysis,
  SpendingBottleneck,
  FilterState,
  DailySpending,
  DailyAverageSpending,
  MonthlyReport,
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

  // Analyze daily spending for a given month
  analyzeDailySpending(yearMonth: string): DailySpending[] {
    const [year, month] = yearMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Filter transactions for this month
    const monthTransactions = this.transactions.filter(
      (t) => t.yearMonth === yearMonth,
    );

    // Group by day
    const dailyMap = new Map<number, { expense: number; income: number }>();

    for (let day = 1; day <= daysInMonth; day++) {
      dailyMap.set(day, { expense: 0, income: 0 });
    }

    monthTransactions.forEach((t) => {
      const day = t.date.getDate();
      const current = dailyMap.get(day) || { expense: 0, income: 0 };
      dailyMap.set(day, {
        expense: current.expense + t.expense,
        income: current.income + t.income,
      });
    });

    // Build daily spending array with cumulative totals
    const dailySpending: DailySpending[] = [];
    let cumulativeExpense = 0;
    let cumulativeIncome = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = dailyMap.get(day) || { expense: 0, income: 0 };
      cumulativeExpense += dayData.expense;
      cumulativeIncome += dayData.income;

      const dateStr = `${yearMonth}-${day.toString().padStart(2, "0")}`;
      const displayDate = `${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`;

      dailySpending.push({
        date: dateStr,
        dayOfMonth: day,
        displayDate,
        expense: dayData.expense,
        income: dayData.income,
        cumulativeExpense,
        cumulativeIncome,
      });
    }

    return dailySpending;
  }

  // Calculate average spending pattern across multiple months
  calculateAverageSpendingPattern(
    yearMonths: string[],
  ): DailyAverageSpending[] {
    if (yearMonths.length === 0) {
      return [];
    }

    // Analyze each month
    const monthlyPatterns = yearMonths.map((ym) =>
      this.analyzeDailySpending(ym),
    );

    // Find max days (use 31 for consistent comparison)
    const maxDays = 31;
    const pattern: DailyAverageSpending[] = [];

    for (let day = 1; day <= maxDays; day++) {
      let totalExpense = 0;
      let totalCumulativeExpense = 0;
      let count = 0;

      monthlyPatterns.forEach((daily) => {
        const dayData = daily.find((d) => d.dayOfMonth === day);
        if (dayData) {
          totalExpense += dayData.expense;
          totalCumulativeExpense += dayData.cumulativeExpense;
          count++;
        }
      });

      if (count > 0) {
        pattern.push({
          dayOfMonth: day,
          displayDate: `${day.toString().padStart(2, "0")}`,
          averageExpense: totalExpense / count,
          averageCumulativeExpense: totalCumulativeExpense / count,
        });
      }
    }

    return pattern;
  }

  // Get monthly report with current month data and 3-month average comparison
  getMonthlyReport(currentYearMonth?: string): MonthlyReport | null {
    // Determine current year-month
    const now = new Date();
    const targetYearMonth =
      currentYearMonth ||
      `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;

    const [year, month] = targetYearMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Get daily spending for current month
    const dailySpending = this.analyzeDailySpending(targetYearMonth);

    // Calculate totals
    const totalExpense = dailySpending.reduce((sum, d) => sum + d.expense, 0);
    const totalIncome = dailySpending.reduce((sum, d) => sum + d.income, 0);

    // Get current day expense (for today if viewing current month)
    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() + 1 === month;
    const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;
    const currentDayData = dailySpending.find(
      (d) => d.dayOfMonth === currentDay,
    );
    const currentDayExpense = currentDayData?.cumulativeExpense || totalExpense;

    // Get previous 3 months
    const previousMonths: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const prevDate = new Date(year, month - 1 - i, 1);
      const prevYearMonth = `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, "0")}`;
      previousMonths.push(prevYearMonth);
    }

    // Calculate 3-month average pattern
    const previousThreeMonthDailyPattern =
      this.calculateAverageSpendingPattern(previousMonths);

    // Calculate 3-month average total expense
    const previousMonthsExpenses = previousMonths.map((ym) => {
      const daily = this.analyzeDailySpending(ym);
      return daily.reduce((sum, d) => sum + d.expense, 0);
    });
    const validExpenses = previousMonthsExpenses.filter((e) => e > 0);
    const previousThreeMonthAverage =
      validExpenses.length > 0
        ? validExpenses.reduce((sum, e) => sum + e, 0) / validExpenses.length
        : 0;

    return {
      yearMonth: targetYearMonth,
      year,
      month,
      daysInMonth,
      dailySpending,
      totalExpense,
      totalIncome,
      currentDayExpense,
      previousThreeMonthAverage,
      previousThreeMonthDailyPattern,
    };
  }
}
