import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  Edit2,
  Layers,
  Link,
  Loader2,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@money-insight/ui/components/atoms";
import { IconPicker, MobileHeader } from "@money-insight/ui/components/molecules";
import { formatCurrency } from "@money-insight/ui/lib";
import { useCategoryGroupStore, useSpendingStore } from "@money-insight/ui/stores";
import type { Category, CategoryGroup } from "@money-insight/ui/types";
import * as categoryService from "@money-insight/ui/services/categoryService";
import {
  buildCategoryStats,
  getStandaloneCategoriesForType,
  hasDuplicateCategoryName,
} from "./category-setup-helpers";

interface CategorySetupPageProps {
  onBack?: () => void;
}

const TYPE_SECTIONS = [
  {
    key: "expense" as const,
    title: "Expense Categories",
    description: "Saved categories available for expense transactions.",
    isExpense: true,
  },
  {
    key: "income" as const,
    title: "Income Categories",
    description: "Saved categories available for income transactions.",
    isExpense: false,
  },
];

type SectionKey = (typeof TYPE_SECTIONS)[number]["key"];

export function CategorySetupPage({ onBack }: CategorySetupPageProps) {
  const {
    categories,
    groups,
    mappings,
    isLoading,
    addGroup,
    updateGroup,
    deleteGroup,
    mapSubCategory,
    unmapSubCategory,
    updateCategory,
    addCategory,
  } = useCategoryGroupStore();
  const { transactions } = useSpendingStore();

  const [pageError, setPageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newParentName, setNewParentName] = useState<Record<SectionKey, string>>({
    expense: "",
    income: "",
  });
  const [newStandaloneName, setNewStandaloneName] = useState<Record<SectionKey, string>>({
    expense: "",
    income: "",
  });
  const [draftMappedCategory, setDraftMappedCategory] = useState<Record<string, string>>({});
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const expenseStats = useMemo(() => buildCategoryStats(transactions, true), [transactions]);
  const incomeStats = useMemo(() => buildCategoryStats(transactions, false), [transactions]);

  const refreshFromDatabase = useCallback(async () => {
    await useSpendingStore.getState().initFromDatabase();
  }, []);

  const findCategoryByName = useCallback(
    (name: string) => categories.find((category) => category.name === name),
    [categories],
  );

  const setSectionValue = (
    setter: Dispatch<SetStateAction<Record<SectionKey, string>>>,
    key: SectionKey,
    value: string,
  ) => {
    setter((current) => ({ ...current, [key]: value }));
  };

  const runMutation = async (callback: () => Promise<void>, shouldReload = false) => {
    setPageError(null);
    setSaving(true);
    try {
      await callback();
      if (shouldReload) {
        await refreshFromDatabase();
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Category update failed.");
    } finally {
      setSaving(false);
    }
  };

  const ensureNewCategoryName = (
    name: string,
    sectionLabel: string,
    excludedName?: string,
  ) => {
    if (!name.trim()) {
      throw new Error(`Enter a ${sectionLabel} category name.`);
    }

    if (hasDuplicateCategoryName(categories, name, excludedName)) {
      throw new Error(`Category "${name.trim()}" already exists.`);
    }
  };

  const handleCreateParent = async (sectionKey: SectionKey, isExpense: boolean) => {
    const name = newParentName[sectionKey].trim();
    ensureNewCategoryName(name, sectionKey);

    await runMutation(async () => {
      const created = await addCategory({
        name,
        isExpense,
      });
      await addGroup({
        name: created.name,
        isExpense: created.isExpense,
        icon: created.icon,
        color: created.color,
      });
      setSectionValue(setNewParentName, sectionKey, "");
    });
  };

  const handleCreateStandalone = async (sectionKey: SectionKey, isExpense: boolean) => {
    const name = newStandaloneName[sectionKey].trim();
    ensureNewCategoryName(name, sectionKey);

    await runMutation(async () => {
      await addCategory({
        name,
        isExpense,
      });
      setSectionValue(setNewStandaloneName, sectionKey, "");
    });
  };

  const handlePromoteCategory = async (category: Category) => {
    await runMutation(async () => {
      await addGroup({
        name: category.name,
        isExpense: category.isExpense,
        icon: category.icon,
        color: category.color,
      });
    });
  };

  const handlePromoteMappedCategory = async (category: Category) => {
    await runMutation(async () => {
      await unmapSubCategory(category.name);
      await addGroup({
        name: category.name,
        isExpense: category.isExpense,
        icon: category.icon,
        color: category.color,
      });
    }, true);
  };

  const handleRenameCategory = async (category: Category) => {
    const nextName = editingName.trim();
    ensureNewCategoryName(nextName, category.isExpense ? "expense" : "income", category.name);

    await runMutation(async () => {
      await categoryService.renameCategory(category.name, nextName);
      setEditingCategoryId(null);
      setEditingName("");
    }, true);
  };

  const handleRenameGroup = async (group: CategoryGroup) => {
    const nextName = editingName.trim();
    ensureNewCategoryName(nextName, group.isExpense ? "expense" : "income", group.name);

    await runMutation(async () => {
      await categoryService.renameCategory(group.name, nextName);
      await updateGroup({
        ...group,
        name: nextName,
      });
      setEditingGroupId(null);
      setEditingName("");
    }, true);
  };

  const handleDeleteStandalone = async (category: Category, transactionCount: number) => {
    if (transactionCount > 0) {
      setPageError(`Cannot delete "${category.name}" while it still has transactions.`);
      return;
    }

    await runMutation(async () => {
      await categoryService.deleteCategory(category.id);
    }, true);
  };

  const handleDeleteParent = async (group: CategoryGroup, directTransactionCount: number) => {
    if (directTransactionCount > 0) {
      setPageError(`Cannot delete "${group.name}" while it still has direct transactions.`);
      return;
    }

    await runMutation(async () => {
      await deleteGroup(group.id);
      const category = findCategoryByName(group.name);
      if (category) {
        await categoryService.deleteCategory(category.id);
      }
    }, true);
  };

  const handleUpdateCategoryAppearance = async (
    category: Category,
    patch: Partial<Pick<Category, "icon" | "color">>,
  ) => {
    await runMutation(async () => {
      await updateCategory({
        ...category,
        ...patch,
      });
    });
  };

  const handleUpdateGroupAppearance = async (
    group: CategoryGroup,
    patch: Partial<Pick<CategoryGroup, "icon" | "color">>,
  ) => {
    await runMutation(async () => {
      const category = findCategoryByName(group.name);
      if (category) {
        await updateCategory({
          ...category,
          ...patch,
        });
      }
      await updateGroup({
        ...group,
        ...patch,
      });
    });
  };

  const handleAssignSubCategory = async (groupId: string) => {
    const categoryName = draftMappedCategory[groupId];
    if (!categoryName) {
      return;
    }

    await runMutation(async () => {
      await mapSubCategory(categoryName, groupId);
      setDraftMappedCategory((current) => ({ ...current, [groupId]: "" }));
    }, true);
  };

  const handleMakeStandalone = async (categoryName: string) => {
    await runMutation(async () => {
      await unmapSubCategory(categoryName);
    }, true);
  };

  const renderSection = (section: (typeof TYPE_SECTIONS)[number]) => {
    const stats = section.isExpense ? expenseStats : incomeStats;
    const groupsForType = groups
      .filter((group) => group.isExpense === section.isExpense)
      .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
    const standaloneCategories = getStandaloneCategoriesForType({
      categories,
      groups,
      mappings,
      isExpense: section.isExpense,
    });

    return (
      <section key={section.key} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <p className="text-sm text-muted-foreground">{section.description}</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Parent Categories</CardTitle>
                  <CardDescription>
                    Group saved categories together without deriving them from transactions.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newParentName[section.key]}
                onChange={(event) => setSectionValue(setNewParentName, section.key, event.target.value)}
                placeholder={`New ${section.key} parent name`}
              />
              <Button
                type="button"
                onClick={() => void handleCreateParent(section.key, section.isExpense)}
                disabled={saving || isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Parent
              </Button>
            </div>

            {groupsForType.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parent categories yet.</p>
            ) : (
              groupsForType.map((group) => {
                const subCategories = mappings
                  .filter((mapping) => mapping.parentGroupId === group.id)
                  .map((mapping) => findCategoryByName(mapping.subCategory))
                  .filter((category): category is Category => Boolean(category))
                  .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
                const directStats = stats.get(group.name) ?? { count: 0, total: 0 };
                const childTotal = subCategories.reduce(
                  (sum, category) => sum + (stats.get(category.name)?.total ?? 0),
                  0,
                );
                const availableStandalone = standaloneCategories.filter((category) => category.name !== group.name);
                const isEditing = editingGroupId === group.id;

                return (
                  <div key={group.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="flex items-center gap-3 flex-1">
                        <IconPicker
                          value={group.icon}
                          onChange={(icon) => void handleUpdateGroupAppearance(group, { icon })}
                          triggerSize="lg"
                        />
                        {isEditing ? (
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="flex-1"
                          />
                        ) : (
                          <div className="flex-1">
                            <p className="font-medium">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {subCategories.length} sub-categories
                              {directStats.count > 0 ? `, ${directStats.count} direct transactions` : ""}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={group.color ?? "#64748b"}
                          className="w-12 p-1"
                          onChange={(event) => void handleUpdateGroupAppearance(group, { color: event.target.value })}
                        />
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleRenameGroup(group)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingGroupId(null);
                                setEditingName("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingGroupId(group.id);
                                setEditingName(group.name);
                                setEditingCategoryId(null);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleDeleteParent(group, directStats.count)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Select
                        value={draftMappedCategory[group.id] || undefined}
                        onValueChange={(value) =>
                          setDraftMappedCategory((current) => ({ ...current, [group.id]: value }))
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Assign standalone category" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStandalone.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleAssignSubCategory(group.id)}
                        disabled={!draftMappedCategory[group.id]}
                      >
                        <Link className="mr-2 h-4 w-4" />
                        Add Sub-Category
                      </Button>
                    </div>

                    <div className="rounded-lg bg-accent/30 p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Total impact</span>
                        <span className={section.isExpense ? "text-destructive" : "text-green-600"}>
                          {formatCurrency(directStats.total + childTotal)}
                        </span>
                      </div>
                      {subCategories.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sub-categories assigned.</p>
                      ) : (
                        subCategories.map((category) => {
                          const categoryStats = stats.get(category.name) ?? { count: 0, total: 0 };
                          return (
                            <div
                              key={category.id}
                              className="flex flex-col gap-2 rounded-md border bg-background px-3 py-2 sm:flex-row sm:items-center"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">{category.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {categoryStats.count} transactions
                                </p>
                              </div>
                              <span className={section.isExpense ? "text-sm text-destructive" : "text-sm text-green-600"}>
                                {formatCurrency(categoryStats.total)}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void handleMakeStandalone(category.name)}
                                >
                                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                                  Standalone
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void handlePromoteMappedCategory(category)}
                                >
                                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                                  Parent
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Tag className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Standalone Categories</CardTitle>
                <CardDescription>
                  Saved categories not currently grouped under a parent.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newStandaloneName[section.key]}
                onChange={(event) => setSectionValue(setNewStandaloneName, section.key, event.target.value)}
                placeholder={`New ${section.key} category`}
              />
              <Button
                type="button"
                onClick={() => void handleCreateStandalone(section.key, section.isExpense)}
                disabled={saving || isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>

            {standaloneCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No standalone categories available.</p>
            ) : (
              standaloneCategories.map((category) => {
                const categoryStats = stats.get(category.name) ?? { count: 0, total: 0 };
                const isEditing = editingCategoryId === category.id;

                return (
                  <div key={category.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="flex items-center gap-3 flex-1">
                        <IconPicker
                          value={category.icon}
                          onChange={(icon) => void handleUpdateCategoryAppearance(category, { icon })}
                          triggerSize="lg"
                        />
                        {isEditing ? (
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="flex-1"
                          />
                        ) : (
                          <div className="flex-1">
                            <p className="font-medium">{category.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {categoryStats.count} transactions
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={category.color ?? "#64748b"}
                          className="w-12 p-1"
                          onChange={(event) => void handleUpdateCategoryAppearance(category, { color: event.target.value })}
                        />
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleRenameCategory(category)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCategoryId(null);
                                setEditingName("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCategoryId(category.id);
                                setEditingName(category.name);
                                setEditingGroupId(null);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleDeleteStandalone(category, categoryStats.count)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className={section.isExpense ? "text-sm text-destructive" : "text-sm text-green-600"}>
                        {formatCurrency(categoryStats.total)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handlePromoteCategory(category)}
                      >
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                        Make Parent
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    );
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <MobileHeader title="Category Setup" showBack={!!onBack} onBack={onBack} />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {pageError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {pageError}
          </div>
        )}

        {(saving || isLoading) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving category changes
          </div>
        )}

        {TYPE_SECTIONS.map(renderSection)}
      </div>
    </div>
  );
}
