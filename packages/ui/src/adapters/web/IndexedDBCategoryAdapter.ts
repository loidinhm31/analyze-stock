import type { ICategoryService } from "@/adapters/interfaces";
import type { Category } from "@/types";
import { db } from "./database";

export class IndexedDBCategoryAdapter implements ICategoryService {
  async getCategories(): Promise<Category[]> {
    // Derive categories from existing transactions
    const transactions = await db.transactions.toArray();
    const categoryMap = new Map<string, { isExpense: boolean }>();

    for (const tx of transactions) {
      if (!categoryMap.has(tx.category)) {
        categoryMap.set(tx.category, {
          isExpense: tx.expense > 0,
        });
      }
    }

    // Also include any manually created categories
    const storedCategories = await db.categories.toArray();
    for (const cat of storedCategories) {
      if (!categoryMap.has(cat.name)) {
        categoryMap.set(cat.name, { isExpense: cat.is_expense });
      }
    }

    return Array.from(categoryMap.entries()).map(([name, info], index) => ({
      id: index + 1,
      name,
      is_expense: info.isExpense,
    }));
  }
}
