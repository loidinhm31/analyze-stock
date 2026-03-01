import { create } from "zustand";
import type {
  Category,
  CategoryGroup,
  CategoryMapping,
} from "@money-insight/ui/types";
import * as categoryGroupService from "@money-insight/ui/services/categoryGroupService";
import * as categoryService from "@money-insight/ui/services/categoryService";

interface CategoryGroupStore {
  // Data
  categories: Category[];
  groups: CategoryGroup[];
  mappings: CategoryMapping[];
  lookupMap: Map<string, string>;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFromDatabase: () => Promise<void>;
  addGroup: (
    group: Omit<CategoryGroup, "id" | "syncVersion" | "syncedAt">,
  ) => Promise<CategoryGroup>;
  updateGroup: (group: CategoryGroup) => Promise<CategoryGroup>;
  deleteGroup: (id: string) => Promise<void>;
  mapSubCategory: (
    subCategory: string,
    parentGroupId: string,
  ) => Promise<CategoryMapping>;
  unmapSubCategory: (subCategory: string) => Promise<void>;
  updateCategory: (category: Category) => Promise<Category>;
  addCategory: (
    category: Omit<Category, "id" | "syncVersion" | "syncedAt">,
  ) => Promise<Category>;

  // Resolver
  resolveParent: (subCategory: string) => string;

  // Internal
  rebuildLookup: () => void;
  triggerAnalysisRefresh: () => void;
}

export const useCategoryGroupStore = create<CategoryGroupStore>()(
  (set, get) => {
    // Scoped to factory closure — no cross-test leakage (would be module-level otherwise)
    let _analysisRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    return {
      // Initial state
      categories: [],
      groups: [],
      mappings: [],
      lookupMap: new Map<string, string>(),
      isLoaded: false,
      isLoading: false,
      error: null,

      // Load from database
      loadFromDatabase: async () => {
        set({ isLoading: true, error: null });

        try {
          const [groups, mappings, categories] = await Promise.all([
            categoryGroupService.getCategoryGroups(),
            categoryGroupService.getCategoryMappings(),
            categoryService.getCategories(),
          ]);

          set({ groups, mappings, categories, isLoading: false, isLoaded: true });
          get().rebuildLookup();
        } catch (error) {
          console.error("Failed to load category groups:", error);
          set({
            isLoading: false,
            isLoaded: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load category groups",
          });
        }
      },

      // Add a new group
      addGroup: async (groupData) => {
        set({ isLoading: true });

        try {
          const group = await categoryGroupService.addCategoryGroup(groupData);
          set((state) => ({
            groups: [...state.groups, group],
            isLoading: false,
          }));
          get().rebuildLookup();
          get().triggerAnalysisRefresh();
          return group;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Failed to add group",
          });
          throw error;
        }
      },

      // Update a group
      updateGroup: async (group) => {
        set({ isLoading: true });

        try {
          const updated = await categoryGroupService.updateCategoryGroup(group);
          set((state) => ({
            groups: state.groups.map((g) => (g.id === updated.id ? updated : g)),
            isLoading: false,
          }));
          get().rebuildLookup();
          get().triggerAnalysisRefresh();
          return updated;
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : "Failed to update group",
          });
          throw error;
        }
      },

      // Delete a group (cascade deletes mappings)
      deleteGroup: async (id) => {
        set({ isLoading: true });

        try {
          await categoryGroupService.deleteCategoryGroup(id);
          set((state) => ({
            groups: state.groups.filter((g) => g.id !== id),
            mappings: state.mappings.filter((m) => m.parentGroupId !== id),
            isLoading: false,
          }));
          get().rebuildLookup();
          get().triggerAnalysisRefresh();
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : "Failed to delete group",
          });
          throw error;
        }
      },

      // Map a sub-category to a parent group
      mapSubCategory: async (subCategory, parentGroupId) => {
        set({ isLoading: true });

        try {
          const mapping = await categoryGroupService.mapSubCategory(
            subCategory,
            parentGroupId,
          );
          set((state) => ({
            mappings: [
              ...state.mappings.filter((m) => m.subCategory !== subCategory),
              mapping,
            ],
            isLoading: false,
          }));
          get().rebuildLookup();
          get().triggerAnalysisRefresh();
          return mapping;
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to map sub-category",
          });
          throw error;
        }
      },

      // Remove a sub-category mapping
      unmapSubCategory: async (subCategory) => {
        set({ isLoading: true });

        try {
          await categoryGroupService.unmapSubCategory(subCategory);
          set((state) => ({
            mappings: state.mappings.filter((m) => m.subCategory !== subCategory),
            isLoading: false,
          }));
          get().rebuildLookup();
          get().triggerAnalysisRefresh();
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to unmap sub-category",
          });
          throw error;
        }
      },

      // Update a category (e.g. when setting an icon)
      updateCategory: async (category) => {
        try {
          const updated = await categoryService.updateCategory(category);
          set((state) => ({
            categories: state.categories.map((c) =>
              c.id === updated.id ? updated : c,
            ),
          }));
          return updated;
        } catch (error) {
          throw error;
        }
      },

      // Add a new standalone category (creates the record if missing)
      addCategory: async (categoryData) => {
        try {
          const created = await categoryService.addCategory(categoryData);
          set((state) => ({ categories: [...state.categories, created] }));
          return created;
        } catch (error) {
          throw error;
        }
      },

      // Synchronous resolver using in-memory lookup
      resolveParent: (subCategory) => {
        const { lookupMap } = get();
        return lookupMap.get(subCategory) ?? subCategory;
      },

      // Rebuild the lookup map
      rebuildLookup: () => {
        const { groups, mappings } = get();

        const groupMap = new Map<string, string>();
        for (const group of groups) {
          groupMap.set(group.id, group.name);
        }

        const lookup = new Map<string, string>();
        for (const mapping of mappings) {
          const parentName = groupMap.get(mapping.parentGroupId);
          if (parentName) {
            lookup.set(mapping.subCategory, parentName);
          }
        }

        set({ lookupMap: lookup });
      },

      // Trigger spending store refresh
      triggerAnalysisRefresh: () => {
        // Debounced dynamic import: coalesces rapid calls (e.g. batch mapping updates)
        // and avoids bundler issues from the spendingStore ↔ categoryGroupStore circular import.
        if (_analysisRefreshTimer) clearTimeout(_analysisRefreshTimer);
        _analysisRefreshTimer = setTimeout(() => {
          _analysisRefreshTimer = null;
          import("@money-insight/ui/stores/spendingStore").then(
            ({ useSpendingStore }) => {
              const { refreshAnalysis, isDbReady } = useSpendingStore.getState();
              if (isDbReady) refreshAnalysis();
            },
          );
        }, 50);
      },
    };
  },
);
