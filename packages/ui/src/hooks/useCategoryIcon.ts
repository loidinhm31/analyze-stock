import { useCallback } from "react";
import { useCategoryGroupStore } from "@money-insight/ui/stores";

/**
 * Hook that resolves a category name to its icon name.
 *
 * Resolution order:
 * 1. If the category has an explicit icon on its Category record → return it
 * 2. If the category is a parent group name → return that group's icon
 * 3. If the category is a mapped sub-category → return parent group's icon
 * 4. Fallback: undefined (no icon)
 */
export function useCategoryIcon() {
  const { categories, groups, mappings } = useCategoryGroupStore();

  const getIcon = useCallback(
    (categoryName: string): string | undefined => {
      // 1. Check if a Category record has an explicit icon set
      const category = categories.find((c) => c.name === categoryName);
      if (category?.icon) return category.icon;

      // 2. Check if it's a parent group name
      const group = groups.find((g) => g.name === categoryName);
      if (group?.icon) return group.icon;

      // 3. Check if it's a mapped sub-category → resolve to parent group
      const mapping = mappings.find((m) => m.subCategory === categoryName);
      if (mapping) {
        const parentGroup = groups.find((g) => g.id === mapping.parentGroupId);
        if (parentGroup) return parentGroup.icon;
      }

      // 4. No icon found
      return undefined;
    },
    [categories, groups, mappings],
  );

  return { getIcon };
}
