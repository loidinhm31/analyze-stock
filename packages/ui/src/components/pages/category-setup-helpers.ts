import type { Category, CategoryGroup, CategoryMapping, Transaction } from "@money-insight/ui/types";

type CategoryStat = {
  count: number;
  total: number;
};

export function normalizeCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function hasDuplicateCategoryName(
  categories: Category[],
  nextName: string,
  excludedName?: string,
): boolean {
  const normalizedTarget = normalizeCategoryName(nextName);
  const normalizedExcluded = excludedName ? normalizeCategoryName(excludedName) : undefined;

  return categories.some((category) => {
    const normalizedName = normalizeCategoryName(category.name);
    if (normalizedExcluded && normalizedName === normalizedExcluded) {
      return false;
    }
    return normalizedName === normalizedTarget;
  });
}

export function buildCategoryStats(
  transactions: Transaction[],
  isExpense: boolean,
): Map<string, CategoryStat> {
  const stats = new Map<string, CategoryStat>();

  for (const transaction of transactions) {
    const amount = isExpense ? transaction.expense : transaction.income;
    if (amount <= 0) {
      continue;
    }

    const current = stats.get(transaction.category) ?? { count: 0, total: 0 };
    stats.set(transaction.category, {
      count: current.count + 1,
      total: current.total + amount,
    });
  }

  return stats;
}

export function getCategoryNamesForType(
  categories: Category[],
  isExpense: boolean,
): string[] {
  return categories
    .filter((category) => category.isExpense === isExpense)
    .map((category) => category.name);
}

export function getMappedCategoryNames(
  mappings: CategoryMapping[],
  categories: Category[],
  isExpense: boolean,
): Set<string> {
  const allowedNames = new Set(getCategoryNamesForType(categories, isExpense));
  return new Set(
    mappings
      .map((mapping) => mapping.subCategory)
      .filter((subCategory) => allowedNames.has(subCategory)),
  );
}

export function getParentGroupNamesForType(
  groups: CategoryGroup[],
  isExpense: boolean,
): Set<string> {
  return new Set(
    groups.filter((group) => group.isExpense === isExpense).map((group) => group.name),
  );
}

export function getStandaloneCategoriesForType(params: {
  categories: Category[];
  groups: CategoryGroup[];
  mappings: CategoryMapping[];
  isExpense: boolean;
}): Category[] {
  const { categories, groups, mappings, isExpense } = params;
  const mapped = getMappedCategoryNames(mappings, categories, isExpense);
  const parents = getParentGroupNamesForType(groups, isExpense);

  return categories
    .filter((category) => category.isExpense === isExpense)
    .filter((category) => !mapped.has(category.name) && !parents.has(category.name))
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}
