import type { Category, CategoryGroup, Transaction } from "@money-insight/ui/types";
import { generateId, getCurrentTimestamp, getDb, SYNC_META_KEYS, type MoneyInsightDatabase } from "./database";

type CategoryUsage = {
  expenseCount: number;
  incomeCount: number;
};

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
}

export function inferCategoryUsage(transactions: Transaction[]): Map<string, CategoryUsage> {
  const usage = new Map<string, CategoryUsage>();

  for (const transaction of transactions) {
    const name = transaction.category.trim();
    if (!name) {
      continue;
    }

    const current = usage.get(name) ?? { expenseCount: 0, incomeCount: 0 };
    if (transaction.amount < 0 || transaction.expense > 0) {
      current.expenseCount += 1;
    } else {
      current.incomeCount += 1;
    }
    usage.set(name, current);
  }

  return usage;
}

export function inferCategoryType(usage?: CategoryUsage): boolean {
  if (!usage) {
    return true;
  }

  return usage.expenseCount >= usage.incomeCount;
}

export function buildMissingCategories(params: {
  categories: Category[];
  transactions: Transaction[];
  groups?: CategoryGroup[];
}): Category[] {
  const { categories, transactions, groups = [] } = params;
  const usage = inferCategoryUsage(transactions);
  const existingByName = new Map(categories.map((category) => [category.name, category]));
  const missing: Category[] = [];
  const now = getCurrentTimestamp();

  for (const [name, counts] of usage.entries()) {
    if (existingByName.has(name)) {
      continue;
    }

    const category: Category = {
      id: generateId(),
      name,
      isExpense: inferCategoryType(counts),
      syncVersion: now,
      syncedAt: null,
    };
    missing.push(category);
    existingByName.set(name, category);
  }

  for (const group of groups) {
    if (existingByName.has(group.name)) {
      continue;
    }

    const category: Category = {
      id: generateId(),
      name: group.name,
      icon: group.icon,
      color: group.color,
      isExpense: group.isExpense,
      syncVersion: now,
      syncedAt: null,
    };
    missing.push(category);
    existingByName.set(group.name, category);
  }

  return missing;
}

export async function ensureCategoryBackfill(db: MoneyInsightDatabase = getDb()): Promise<void> {
  const completed = await db.getSyncMeta(SYNC_META_KEYS.CATEGORY_BACKFILL_V1);
  if (completed === "true") {
    return;
  }

  await db.transaction("rw", [db.categories, db.transactions, db.categoryGroups, db._syncMeta], async () => {
    const alreadyCompleted = await db.getSyncMeta(SYNC_META_KEYS.CATEGORY_BACKFILL_V1);
    if (alreadyCompleted === "true") {
      return;
    }

    const [categories, transactions, groups] = await Promise.all([
      db.categories.toArray(),
      db.transactions.toArray(),
      db.categoryGroups.toArray(),
    ]);

    const missingCategories = buildMissingCategories({
      categories,
      transactions,
      groups,
    });

    if (missingCategories.length > 0) {
      await db.categories.bulkAdd(missingCategories);
    }

    await db.setSyncMeta(SYNC_META_KEYS.CATEGORY_BACKFILL_V1, "true");
  });
}
