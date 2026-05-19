import type { ICategoryService } from "@money-insight/ui/adapters/factory/interfaces";
import type { Category } from "@money-insight/ui/types";
import { getDb, generateId, getCurrentTimestamp } from "./database";
import { sortCategories } from "./categoryBackfill";

export class IndexedDBCategoryAdapter implements ICategoryService {
  async getCategories(): Promise<Category[]> {
    const categories = await getDb().categories.toArray();
    return sortCategories(categories);
  }

  async addCategory(
    categoryData: Omit<Category, "id" | "syncVersion" | "syncedAt">,
  ): Promise<Category> {
    await this.assertUniqueName(categoryData.name);

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
    await this.assertUniqueName(category.name, category.id);

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
    await this.assertUniqueName(newName);

    // Update all transactions with the old category name
    await getDb().transaction(
      "rw",
      getDb().transactions,
      getDb().categories,
      getDb().categoryGroups,
      getDb().categoryMappings,
      async () => {
      // Update transactions
        const transactionsToUpdate = await getDb().transactions
          .where("category")
          .equals(oldName)
          .toArray();

        const nextSyncVersion = getCurrentTimestamp();
        for (const tx of transactionsToUpdate) {
          await getDb().transactions.update(tx.id, {
            category: newName,
            syncVersion: nextSyncVersion,
            syncedAt: null,
          });
        }

        const storedCategory = await getDb().categories.where("name").equals(oldName).first();
        if (storedCategory) {
          await getDb().categories.update(storedCategory.id, {
            name: newName,
            syncVersion: nextSyncVersion,
            syncedAt: null,
          });
        }

        const storedGroup = await getDb().categoryGroups.where("name").equals(oldName).first();
        if (storedGroup) {
          await getDb().categoryGroups.update(storedGroup.id, {
            name: newName,
            syncVersion: (storedGroup.syncVersion || 0) + 1,
            syncedAt: null,
          });
        }

        const mappedCategory = await getDb().categoryMappings.where("subCategory").equals(oldName).first();
        if (mappedCategory) {
          await getDb().categoryMappings.update(mappedCategory.id, {
            subCategory: newName,
            syncVersion: (mappedCategory.syncVersion || 0) + 1,
            syncedAt: null,
          });
        }
      },
    );
  }

  private async assertUniqueName(name: string, excludedId?: string): Promise<void> {
    const normalized = name.trim().toLocaleLowerCase();
    const existing = await getDb().categories
      .toCollection()
      .filter((category) => category.name.trim().toLocaleLowerCase() === normalized)
      .first();

    if (existing && existing.id !== excludedId) {
      throw new Error(`Category "${name.trim()}" already exists.`);
    }
  }
}
