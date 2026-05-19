import type { Category } from "@money-insight/ui/types";

export function getAllowedCategories(
  categories: Category[],
  isExpense: boolean,
  selectedCategory?: string,
): Category[] {
  const filtered = categories.filter((category) => category.isExpense === isExpense);

  if (!selectedCategory?.trim()) {
    return filtered;
  }

  const selected = categories.find((category) => category.name === selectedCategory);
  if (!selected || filtered.some((category) => category.name === selectedCategory)) {
    return filtered;
  }

  return [...filtered, selected];
}

export function isKnownCategory(categories: Category[], categoryName: string): boolean {
  return categories.some((category) => category.name === categoryName);
}
