import type { IStatisticsService } from "@money-insight/ui/adapters/factory/interfaces";
import type { Statistics, TransactionFilter } from "@money-insight/ui/types";
import { getDb } from "./database";

export class IndexedDBStatisticsAdapter implements IStatisticsService {
  async getStatistics(filter?: TransactionFilter): Promise<Statistics> {
    let transactions = await getDb().transactions.toArray();

    if (filter?.startDate) {
      transactions = transactions.filter((t) => t.date >= filter.startDate!);
    }
    if (filter?.endDate) {
      transactions = transactions.filter((t) => t.date <= filter.endDate!);
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
      totalExpense: totalExpense,
      totalIncome: totalIncome,
      netSavings: netSavings,
      savingsRate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0,
      transactionCount: transactions.length,
      categoryCount: categories.size,
      accountCount: accounts.size,
    };
  }
}
