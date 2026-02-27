import type { ICategoryService } from "@money-insight/ui/adapters/factory/interfaces";
import type { Category } from "@money-insight/ui/types";
import { getDb, generateId, getCurrentTimestamp } from "./database";

export class IndexedDBCategoryAdapter implements ICategoryService {
  async getCategories(): Promise<Category[]> {
    // Derive categories from existing transactions
    const transactions = await getDb().transactions.toArray();
    const categoryMap = new Map<string, { isExpense: boolean }>();

    for (const tx of transactions) {
      if (!categoryMap.has(tx.category)) {
        categoryMap.set(tx.category, {
          isExpense: tx.expense > 0,
        });
      }
    }

    // Also include any manually created categories
    const storedCategories = await getDb().categories.toArray();
    for (const cat of storedCategories) {
      if (!categoryMap.has(cat.name)) {
        categoryMap.set(cat.name, { isExpense: cat.isExpense });
      }
    }

    return Array.from(categoryMap.entries()).map(([name, info]) => {
      // Check if there's a stored category with this name to get its UUID
      const stored = storedCategories.find((c) => c.name === name);
      return {
        id: stored?.id || generateId(),
        name,
        icon: stored?.icon,
        color: stored?.color,
        isExpense: info.isExpense,
        syncVersion: stored?.syncVersion ?? 0,
        syncedAt: stored?.syncedAt ?? null,
      };
    });
  }

  async addCategory(
    categoryData: Omit<Category, "id" | "syncVersion" | "syncedAt">,
  ): Promise<Category> {
    const category: Category = {
      ...categoryData,
      id: generateId(),
      syncVersion: getCurrentTimestamp(),
      syncedAt: null,
    };

    await getDb().categories.add(category);
    return category;
  }

  async updateCategory(category: Category): Promise<Category> {
    const updated: Category = {
      ...category,
      syncVersion: getCurrentTimestamp(),
      syncedAt: null,
    };

    await getDb().categories.put(updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await getDb().categories.delete(id);
  }

  async renameCategory(oldName: string, newName: string): Promise<void> {
    // Update all transactions with the old category name
    await getDb().transaction("rw", getDb().transactions, getDb().categories, async () => {
      // Update transactions
      const transactionsToUpdate = await getDb().transactions
        .where("category")
        .equals(oldName)
        .toArray();

      for (const tx of transactionsToUpdate) {
        await getDb().transactions.update(tx.id, {
          category: newName,
          syncVersion: getCurrentTimestamp(),
          syncedAt: null,
        });
      }

      // Update the category record if it exists
      const storedCategory = await getDb().categories
        .filter((c) => c.name === oldName)
        .first();

      if (storedCategory) {
        await getDb().categories.update(storedCategory.id, {
          name: newName,
          syncVersion: getCurrentTimestamp(),
          syncedAt: null,
        });
      }
    });
  }
}
