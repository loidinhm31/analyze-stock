import { describe, expect, it } from "vitest";
import { getAllowedCategories, isKnownCategory } from "./transaction-form-helpers";

const categories = [
  { id: "expense-1", name: "Food", isExpense: true },
  { id: "expense-2", name: "Transport", isExpense: true },
  { id: "income-1", name: "Salary", isExpense: false },
] as const;

describe("transaction-form-helpers", () => {
  it("shows only expense categories for expense transactions", () => {
    expect(getAllowedCategories([...categories] as any, true).map((category) => category.name)).toEqual([
      "Food",
      "Transport",
    ]);
  });

  it("shows only income categories for income transactions", () => {
    expect(getAllowedCategories([...categories] as any, false).map((category) => category.name)).toEqual([
      "Salary",
    ]);
  });

  it("keeps a mismatched saved category available while editing a legacy transaction", () => {
    expect(
      getAllowedCategories([...categories] as any, true, "Salary").map((category) => category.name),
    ).toEqual(["Food", "Transport", "Salary"]);
  });

  it("rejects unknown category names", () => {
    expect(isKnownCategory([...categories] as any, "Unknown")).toBe(false);
    expect(isKnownCategory([...categories] as any, "Salary")).toBe(true);
  });
});
