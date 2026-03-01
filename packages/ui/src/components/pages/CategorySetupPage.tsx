import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Layers,
  Loader2,
  Plus,
  Trash2,
  X,
  Edit2,
  Check,
  ArrowUpCircle,
  ArrowDownCircle,
  Link,
  MoreHorizontal,
  Tag,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@money-insight/ui/components/atoms";
import {
  MobileHeader,
  IconPicker,
} from "@money-insight/ui/components/molecules";
import {
  useCategoryGroupStore,
  useSpendingStore,
} from "@money-insight/ui/stores";
import type { CategoryGroup } from "@money-insight/ui/types";
import { formatCurrency } from "@money-insight/ui/lib";
import * as categoryService from "@money-insight/ui/services/categoryService";

interface CategorySetupPageProps {
  onBack?: () => void;
}

export function CategorySetupPage({ onBack }: CategorySetupPageProps) {
  const {
    categories: storedCategories,
    groups,
    mappings,
    isLoading,
    addGroup,
    updateGroup,
    deleteGroup,
    mapSubCategory,
    unmapSubCategory,
    updateCategory: updateCategoryInStore,
    addCategory: addCategoryToStore,
  } = useCategoryGroupStore();

  const { transactions } = useSpendingStore();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // For sub-category actions
  const [selectedSubCategory, setSelectedSubCategory] = useState<{
    name: string;
    parentId: string;
  } | null>(null);
  // For demoting parent to sub
  const [demotingGroupId, setDemotingGroupId] = useState<string | null>(null);
  // For adding sub-category to a group
  const [addingSubToGroupId, setAddingSubToGroupId] = useState<string | null>(
    null,
  );
  // For standalone category CRUD
  const [isAddingStandalone, setIsAddingStandalone] = useState(false);
  const [newStandaloneName, setNewStandaloneName] = useState("");
  const [editingStandalone, setEditingStandalone] = useState<string | null>(
    null,
  );
  const [editingStandaloneName, setEditingStandaloneName] = useState("");
  const [standaloneLoading, setStandaloneLoading] = useState(false);

  // Get all unique categories from transactions with their stats
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();

    transactions.forEach((t) => {
      if (t.expense > 0) {
        const current = stats.get(t.category) || { count: 0, total: 0 };
        stats.set(t.category, {
          count: current.count + 1,
          total: current.total + t.expense,
        });
      }
    });

    return stats;
  }, [transactions]);

  // Get mapped sub-categories (sub-category name -> parent group id)
  const mappedCategories = useMemo(() => {
    const map = new Map<string, string>();
    mappings.forEach((m) => {
      map.set(m.subCategory, m.parentGroupId);
    });
    return map;
  }, [mappings]);

  // Get parent group names for quick lookup
  const parentGroupNames = useMemo(() => {
    return new Set(groups.map((g) => g.name));
  }, [groups]);

  // Get unmapped categories (excluding those that are already parent groups)
  const unmappedCategories = useMemo(() => {
    return Array.from(categoryStats.keys())
      .filter((cat) => !mappedCategories.has(cat) && !parentGroupNames.has(cat))
      .sort((a, b) => {
        const statsA = categoryStats.get(a)!;
        const statsB = categoryStats.get(b)!;
        return statsB.total - statsA.total;
      });
  }, [categoryStats, mappedCategories, parentGroupNames]);

  // Get sub-categories for a group
  const getSubCategoriesForGroup = useCallback(
    (groupId: string) => {
      return mappings
        .filter((m) => m.parentGroupId === groupId)
        .map((m) => ({
          name: m.subCategory,
          stats: categoryStats.get(m.subCategory) || { count: 0, total: 0 },
        }))
        .sort((a, b) => b.stats.total - a.stats.total);
    },
    [mappings, categoryStats],
  );

  // Get stats for a parent group (including its own transactions if any)
  const getGroupStats = useCallback(
    (group: CategoryGroup) => {
      const subCategories = getSubCategoriesForGroup(group.id);
      const subTotal = subCategories.reduce((sum, c) => sum + c.stats.total, 0);
      const ownStats = categoryStats.get(group.name) || { count: 0, total: 0 };
      return {
        total: subTotal + ownStats.total,
        subCount: subCategories.length,
        ownStats,
      };
    },
    [getSubCategoriesForGroup, categoryStats],
  );

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await addGroup({
        name: newGroupName.trim(),
        isExpense: true,
      });
      setNewGroupName("");
      setIsAddingGroup(false);
    } catch (error) {
      console.error("Failed to add group:", error);
    }
  };

  // Add new standalone category
  const handleAddStandalone = async () => {
    if (!newStandaloneName.trim()) return;

    setStandaloneLoading(true);
    try {
      await categoryService.addCategory({
        name: newStandaloneName.trim(),
        isExpense: true,
      });
      setNewStandaloneName("");
      setIsAddingStandalone(false);
      // Refresh to show new category
      window.location.reload();
    } catch (error) {
      console.error("Failed to add standalone category:", error);
    } finally {
      setStandaloneLoading(false);
    }
  };

  // Rename standalone category
  const handleRenameStandalone = async (oldName: string) => {
    if (!editingStandaloneName.trim() || editingStandaloneName === oldName)
      return;

    setStandaloneLoading(true);
    try {
      await categoryService.renameCategory(
        oldName,
        editingStandaloneName.trim(),
      );
      setEditingStandalone(null);
      setEditingStandaloneName("");
      // Refresh to show updated category and transactions
      window.location.reload();
    } catch (error) {
      console.error("Failed to rename standalone category:", error);
    } finally {
      setStandaloneLoading(false);
    }
  };

  // Delete standalone category (only if no transactions)
  const handleDeleteStandalone = async (categoryName: string) => {
    const stats = categoryStats.get(categoryName);
    if (stats && stats.count > 0) {
      alert(
        `Cannot delete "${categoryName}" - it has ${stats.count} transactions. Remove or reassign transactions first.`,
      );
      return;
    }

    setStandaloneLoading(true);
    try {
      // Find the category ID from stored categories
      const categories = await categoryService.getCategories();
      const cat = categories.find((c) => c.name === categoryName);
      if (cat) {
        await categoryService.deleteCategory(cat.id);
      }
      // Refresh
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete standalone category:", error);
    } finally {
      setStandaloneLoading(false);
    }
  };

  // Promote an existing category to be a parent group
  const handlePromoteToParent = async (categoryName: string) => {
    try {
      await addGroup({
        name: categoryName,
        isExpense: true,
      });
      setSelectedCategory(null);
    } catch (error) {
      console.error("Failed to promote category:", error);
    }
  };

  // Demote a parent group to become a sub-category of another group
  const handleDemoteToSub = async (
    groupToDelete: CategoryGroup,
    newParentId: string,
  ) => {
    try {
      // First delete the parent group
      await deleteGroup(groupToDelete.id);
      // Then map the category name as sub-category under new parent
      await mapSubCategory(groupToDelete.name, newParentId);
      setDemotingGroupId(null);
    } catch (error) {
      console.error("Failed to demote group:", error);
    }
  };

  const handleUpdateGroup = async (group: CategoryGroup) => {
    if (!editingGroupName.trim()) return;

    try {
      await updateGroup({
        ...group,
        name: editingGroupName.trim(),
      });
      setEditingGroupId(null);
      setEditingGroupName("");
    } catch (error) {
      console.error("Failed to update group:", error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  const handleMapCategory = async (subCategory: string, groupId: string) => {
    try {
      await mapSubCategory(subCategory, groupId);
      setSelectedCategory(null);
      setAddingSubToGroupId(null);
    } catch (error) {
      console.error("Failed to map category:", error);
    }
  };

  const handleUnmapCategory = async (subCategory: string) => {
    try {
      await unmapSubCategory(subCategory);
      setSelectedSubCategory(null);
    } catch (error) {
      console.error("Failed to unmap category:", error);
    }
  };

  // Move sub-category to a different parent
  const handleMoveSubCategory = async (
    subCategory: string,
    newParentId: string,
  ) => {
    try {
      await mapSubCategory(subCategory, newParentId);
      setSelectedSubCategory(null);
    } catch (error) {
      console.error("Failed to move sub-category:", error);
    }
  };

  // Promote sub-category to parent
  const handlePromoteSubToParent = async (subCategoryName: string) => {
    try {
      // First unmap from current parent
      await unmapSubCategory(subCategoryName);
      // Then add as new parent group
      await addGroup({
        name: subCategoryName,
        isExpense: true,
      });
      setSelectedSubCategory(null);
    } catch (error) {
      console.error("Failed to promote sub-category:", error);
    }
  };

  // Helper to find stored category icon by name
  const getCategoryIcon = (name: string) =>
    storedCategories.find((c) => c.name === name)?.icon;

  // Update a standalone category's icon (keeps store in sync for useCategoryIcon)
  const handleUpdateStandaloneIcon = async (
    categoryName: string,
    icon: string,
  ) => {
    const cat = storedCategories.find((c) => c.name === categoryName);
    if (cat) {
      await updateCategoryInStore({ ...cat, icon });
    } else {
      await addCategoryToStore({ name: categoryName, isExpense: true, icon });
    }
  };

  // Auto-expand groups when first loaded
  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groups.map((g) => g.id)));
    }
  }, [groups, expandedGroups.size]);

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <MobileHeader
        title="Category Setup"
        showBack={!!onBack}
        onBack={onBack}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Parent Groups Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Parent Categories</CardTitle>
                  <CardDescription>
                    Group related categories together for analysis
                  </CardDescription>
                </div>
              </div>
              {!isAddingGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingGroup(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add new group input */}
            {isAddingGroup && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50">
                <FolderPlus className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="New parent category name..."
                  className="flex-1 h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddGroup();
                    if (e.key === "Escape") {
                      setIsAddingGroup(false);
                      setNewGroupName("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddGroup}
                  disabled={!newGroupName.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingGroup(false);
                    setNewGroupName("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Existing groups */}
            {groups.length === 0 && !isAddingGroup ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No parent categories yet</p>
                <p className="text-xs mt-1">
                  Create one or promote an existing category below
                </p>
              </div>
            ) : (
              groups.map((group) => {
                const subCategories = getSubCategoriesForGroup(group.id);
                const isExpanded = expandedGroups.has(group.id);
                const isEditing = editingGroupId === group.id;
                const groupStats = getGroupStats(group);
                const isDemoting = demotingGroupId === group.id;
                const isAddingSub = addingSubToGroupId === group.id;
                const canDemote =
                  subCategories.length === 0 && groups.length > 1;

                return (
                  <div
                    key={group.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Group header */}
                    <div
                      className="flex items-center gap-2 p-3 bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() =>
                        !isEditing &&
                        !isDemoting &&
                        toggleGroupExpanded(group.id)
                      }
                    >
                      {(subCategories.length > 0 ||
                        groupStats.ownStats.count > 0) && (
                        <button className="p-0.5">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      {subCategories.length === 0 &&
                        groupStats.ownStats.count === 0 && (
                          <div className="w-5" />
                        )}

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      >
                        <IconPicker
                          value={group.icon}
                          onChange={(icon) => updateGroup({ ...group, icon })}
                          triggerSize="lg"
                        />
                      </div>

                      {isEditing ? (
                        <Input
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          className="flex-1 h-7 text-sm"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateGroup(group);
                            if (e.key === "Escape") {
                              setEditingGroupId(null);
                              setEditingGroupName("");
                            }
                          }}
                        />
                      ) : (
                        <span className="flex-1 font-medium text-sm">
                          {group.name}
                        </span>
                      )}

                      <span className="text-xs text-muted-foreground">
                        {subCategories.length > 0
                          ? `${subCategories.length} sub-cat`
                          : "no sub-cat"}
                      </span>
                      {groupStats.total > 0 && (
                        <span className="text-xs font-medium text-destructive">
                          {formatCurrency(groupStats.total)}
                        </span>
                      )}

                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateGroup(group);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGroupId(null);
                              setEditingGroupName("");
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* Add sub-category button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddingSubToGroupId(
                                isAddingSub ? null : group.id,
                              );
                              setDemotingGroupId(null);
                            }}
                            title="Add sub-category"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGroupId(group.id);
                              setEditingGroupName(group.name);
                            }}
                            title="Rename"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {/* Demote option for parents without sub-categories */}
                          {canDemote && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDemotingGroupId(
                                  isDemoting ? null : group.id,
                                );
                                setAddingSubToGroupId(null);
                              }}
                              title="Change to sub-category"
                            >
                              <ArrowDownCircle className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Demote to sub-category options */}
                    {isDemoting && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-t">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                          Move "{group.name}" under:
                        </p>
                        <div className="space-y-1">
                          {groups
                            .filter((g) => g.id !== group.id)
                            .map((targetGroup) => (
                              <Button
                                key={targetGroup.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-sm h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDemoteToSub(group, targetGroup.id);
                                }}
                              >
                                <Layers className="h-3.5 w-3.5 mr-2 text-primary" />
                                {targetGroup.name}
                              </Button>
                            ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDemotingGroupId(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {/* Add sub-category options */}
                    {isAddingSub && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border-t">
                        <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                          Add sub-category to "{group.name}":
                        </p>
                        {unmappedCategories.length > 0 ? (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {unmappedCategories.map((cat) => (
                              <Button
                                key={cat}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-sm h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMapCategory(cat, group.id);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5 mr-2 text-green-600" />
                                {cat}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No standalone categories available
                          </p>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingSubToGroupId(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {/* Sub-categories and own transactions */}
                    {isExpanded &&
                      !isDemoting &&
                      !isAddingSub &&
                      (subCategories.length > 0 ||
                        groupStats.ownStats.count > 0) && (
                        <div className="border-t divide-y">
                          {/* Show parent's own transactions if any */}
                          {groupStats.ownStats.count > 0 && (
                            <div className="flex items-center gap-3 px-4 py-2 pl-10 text-sm bg-primary/5">
                              <span className="flex-1 italic text-muted-foreground">
                                (direct transactions)
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {groupStats.ownStats.count} txns
                              </span>
                              <span className="text-xs text-destructive">
                                {formatCurrency(groupStats.ownStats.total)}
                              </span>
                              <div className="w-6" />
                            </div>
                          )}
                          {subCategories.map((subCat) => {
                            const isSubSelected =
                              selectedSubCategory?.name === subCat.name &&
                              selectedSubCategory?.parentId === group.id;

                            return (
                              <div key={subCat.name}>
                                <div
                                  className={`flex items-center gap-3 px-4 py-2 pl-10 text-sm cursor-pointer transition-colors ${
                                    isSubSelected
                                      ? "bg-primary/10"
                                      : "hover:bg-accent/20"
                                  }`}
                                  onClick={() =>
                                    setSelectedSubCategory(
                                      isSubSelected
                                        ? null
                                        : {
                                            name: subCat.name,
                                            parentId: group.id,
                                          },
                                    )
                                  }
                                >
                                  <span className="flex-1">{subCat.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {subCat.stats.count} txns
                                  </span>
                                  <span className="text-xs text-destructive">
                                    {formatCurrency(subCat.stats.total)}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSubCategory(
                                        isSubSelected
                                          ? null
                                          : {
                                              name: subCat.name,
                                              parentId: group.id,
                                            },
                                      );
                                    }}
                                    title="More actions"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                {/* Sub-category actions */}
                                {isSubSelected && (
                                  <div className="px-4 py-2 pl-10 bg-accent/30 space-y-2">
                                    {/* Promote to parent */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-sm h-8"
                                      onClick={() =>
                                        handlePromoteSubToParent(subCat.name)
                                      }
                                    >
                                      <ArrowUpCircle className="h-3.5 w-3.5 mr-2 text-green-600" />
                                      Make "{subCat.name}" a parent
                                    </Button>

                                    {/* Move to different parent */}
                                    {groups.length > 1 && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                          <Link className="h-3 w-3" />
                                          Move to different parent:
                                        </p>
                                        {groups
                                          .filter((g) => g.id !== group.id)
                                          .map((targetGroup) => (
                                            <Button
                                              key={targetGroup.id}
                                              variant="ghost"
                                              size="sm"
                                              className="w-full justify-start text-sm h-7"
                                              onClick={() =>
                                                handleMoveSubCategory(
                                                  subCat.name,
                                                  targetGroup.id,
                                                )
                                              }
                                            >
                                              <Layers className="h-3 w-3 mr-2 text-primary" />
                                              {targetGroup.name}
                                            </Button>
                                          ))}
                                      </div>
                                    )}

                                    {/* Remove from parent */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-sm h-8 text-destructive hover:text-destructive"
                                      onClick={() =>
                                        handleUnmapCategory(subCat.name)
                                      }
                                    >
                                      <X className="h-3.5 w-3.5 mr-2" />
                                      Remove from parent (make standalone)
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Unmapped Categories Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Tag className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Standalone Categories
                  </CardTitle>
                  <CardDescription>
                    Categories not assigned to any parent
                  </CardDescription>
                </div>
              </div>
              {!isAddingStandalone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingStandalone(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add new standalone category */}
            {isAddingStandalone && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={newStandaloneName}
                  onChange={(e) => setNewStandaloneName(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddStandalone();
                    if (e.key === "Escape") {
                      setIsAddingStandalone(false);
                      setNewStandaloneName("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddStandalone}
                  disabled={!newStandaloneName.trim() || standaloneLoading}
                >
                  {standaloneLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingStandalone(false);
                    setNewStandaloneName("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {unmappedCategories.length === 0 && !isAddingStandalone ? (
              <div className="text-center py-6 text-muted-foreground">
                <Check className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm">All categories are organized!</p>
                <p className="text-xs mt-1">
                  Add new categories or import transactions with new categories
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {unmappedCategories.map((category) => {
                  const stats = categoryStats.get(category);
                  const isSelected = selectedCategory === category;
                  const isEditing = editingStandalone === category;
                  const hasTransactions = stats && stats.count > 0;

                  return (
                    <div key={category}>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() =>
                          !isEditing &&
                          setSelectedCategory(isSelected ? null : category)
                        }
                      >
                        {isEditing ? (
                          <>
                            <Input
                              value={editingStandaloneName}
                              onChange={(e) =>
                                setEditingStandaloneName(e.target.value)
                              }
                              className="flex-1 h-7 text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleRenameStandalone(category);
                                if (e.key === "Escape") {
                                  setEditingStandalone(null);
                                  setEditingStandaloneName("");
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameStandalone(category);
                              }}
                              disabled={standaloneLoading}
                            >
                              {standaloneLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStandalone(null);
                                setEditingStandaloneName("");
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0"
                            >
                              <IconPicker
                                value={getCategoryIcon(category)}
                                onChange={(icon) =>
                                  handleUpdateStandaloneIcon(category, icon)
                                }
                                triggerSize="lg"
                              />
                            </div>
                            <span className="flex-1 text-sm font-medium">
                              {category}
                            </span>
                            {hasTransactions ? (
                              <>
                                <span className="text-xs text-muted-foreground">
                                  {stats.count} txns
                                </span>
                                <span className="text-xs font-medium text-destructive">
                                  {formatCurrency(stats.total)}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                no transactions
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStandalone(category);
                                setEditingStandaloneName(category);
                              }}
                              title="Rename"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 w-7 p-0 ${
                                hasTransactions
                                  ? "text-muted-foreground cursor-not-allowed"
                                  : "text-destructive hover:text-destructive"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStandalone(category);
                              }}
                              title={
                                hasTransactions
                                  ? "Cannot delete - has transactions"
                                  : "Delete"
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Action options */}
                      {isSelected && !isEditing && (
                        <div className="mt-2 ml-4 p-3 rounded-lg bg-accent/30 space-y-3">
                          {/* Option 1: Make as parent */}
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-sm"
                              onClick={() => handlePromoteToParent(category)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ArrowUpCircle className="h-4 w-4 mr-2 text-green-600" />
                              )}
                              Make "{category}" a parent category
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1 ml-1">
                              This category will become a parent that other
                              categories can be grouped under
                            </p>
                          </div>

                          {/* Option 2: Assign to existing parent */}
                          {groups.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Link className="h-3 w-3" />
                                Or assign to existing parent:
                              </p>
                              <div className="space-y-1">
                                {groups.map((group) => (
                                  <Button
                                    key={group.id}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-sm h-8"
                                    onClick={() =>
                                      handleMapCategory(category, group.id)
                                    }
                                  >
                                    <Layers className="h-3.5 w-3.5 mr-2 text-primary" />
                                    {group.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
