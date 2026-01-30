import type { IStatisticsService } from "@/adapters/interfaces";
import type { Statistics, TransactionFilter } from "@/types";
import { db } from "./database";

export class IndexedDBStatisticsAdapter implements IStatisticsService {
  async getStatistics(filter?: TransactionFilter): Promise<Statistics> {
    let transactions = await db.transactions.toArray();

    if (filter?.start_date) {
      transactions = transactions.filter((t) => t.date >= filter.start_date!);
    }
    if (filter?.end_date) {
      transactions = transactions.filter((t) => t.date <= filter.end_date!);
    }
    if (filter?.categories?.length) {
      transactions = transactions.filter((t) =>
        filter.categories!.includes(t.category),
      );
    }
    if (filter?.accounts?.length) {
      transactions = transactions.filter((t) =>
        filter.accounts!.includes(t.account),
      );
    }

    const totalExpense = transactions.reduce((sum, t) => sum + t.expense, 0);
    const totalIncome = transactions.reduce((sum, t) => sum + t.income, 0);
    const netSavings = totalIncome - totalExpense;
    const categories = new Set(transactions.map((t) => t.category));
    const accounts = new Set(transactions.map((t) => t.account));

    return {
      total_expense: totalExpense,
      total_income: totalIncome,
      net_savings: netSavings,
      savings_rate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0,
      transaction_count: transactions.length,
      category_count: categories.size,
      account_count: accounts.size,
    };
  }
}
