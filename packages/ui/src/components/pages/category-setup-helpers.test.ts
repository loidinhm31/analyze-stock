import { describe, expect, it } from "vitest";
import {
  buildCategoryStats,
  getStandaloneCategoriesForType,
  hasDuplicateCategoryName,
} from "./category-setup-helpers";

describe("category-setup-helpers", () => {
  it("blocks duplicate names globally even when the type differs", () => {
    expect(
      hasDuplicateCategoryName(
        [
          { id: "expense-1", name: "Salary", isExpense: false },
          { id: "expense-2", name: "Food", isExpense: true },
        ] as any,
        "salary",
      ),
    ).toBe(true);
  });

  it("returns standalone persisted categories only for the requested type", () => {
    const standalone = getStandaloneCategoriesForType({
      categories: [
        { id: "1", name: "Food", isExpense: true },
        { id: "2", name: "Salary", isExpense: false },
        { id: "3", name: "Travel", isExpense: true },
      ] as any,
      groups: [{ id: "group-1", name: "Travel", isExpense: true }] as any,
      mappings: [{ id: "mapping-1", subCategory: "Food", parentGroupId: "group-1" }] as any,
      isExpense: true,
    });

    expect(standalone).toEqual([]);
  });

  it("builds per-type category stats from persisted transaction usage", () => {
    const stats = buildCategoryStats(
      [
        { category: "Food", expense: 20, income: 0 },
        { category: "Food", expense: 10, income: 0 },
        { category: "Salary", expense: 0, income: 100 },
      ] as any,
      true,
    );

    expect(stats.get("Food")).toEqual({ count: 2, total: 30 });
    expect(stats.has("Salary")).toBe(false);
  });
});
