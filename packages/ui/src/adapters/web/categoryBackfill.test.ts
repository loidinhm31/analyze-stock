import { describe, expect, it, vi } from "vitest";
import { buildMissingCategories, ensureCategoryBackfill } from "./categoryBackfill";

describe("buildMissingCategories", () => {
  it("creates missing rows from transactions and defaults ties to expense", () => {
    const categories = [
      {
        id: "existing",
        name: "Salary",
        isExpense: false,
        icon: "wallet",
        color: "#00ff00",
        syncVersion: 1,
        syncedAt: 1,
      },
    ];

    const transactions = [
      {
        id: "tx-1",
        category: "Food",
        amount: -10,
        expense: 10,
        income: 0,
      },
      {
        id: "tx-2",
        category: "Food",
        amount: -5,
        expense: 5,
        income: 0,
      },
      {
        id: "tx-3",
        category: "Bonus",
        amount: 20,
        expense: 0,
        income: 20,
      },
      {
        id: "tx-4",
        category: "Mixed",
        amount: -10,
        expense: 10,
        income: 0,
      },
      {
        id: "tx-5",
        category: "Mixed",
        amount: 10,
        expense: 0,
        income: 10,
      },
    ] as any;

    const missing = buildMissingCategories({
      categories: categories as any,
      transactions,
    });

    expect(missing.map((category) => [category.name, category.isExpense])).toEqual([
      ["Food", true],
      ["Bonus", false],
      ["Mixed", true],
    ]);
  });

  it("does not overwrite existing persisted rows and can backfill missing group rows", () => {
    const missing = buildMissingCategories({
      categories: [
        {
          id: "category-1",
          name: "Travel",
          isExpense: false,
          icon: "plane",
          color: "#123456",
          syncVersion: 1,
          syncedAt: 1,
        },
      ] as any,
      transactions: [
        {
          id: "tx-1",
          category: "Travel",
          amount: -50,
          expense: 50,
          income: 0,
        },
      ] as any,
      groups: [
        {
          id: "group-1",
          name: "Housing",
          isExpense: true,
          icon: "home",
          color: "#abcdef",
          syncVersion: 1,
          syncedAt: 1,
        },
      ] as any,
    });

    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({
      name: "Housing",
      isExpense: true,
      icon: "home",
      color: "#abcdef",
    });
  });
});

describe("ensureCategoryBackfill", () => {
  it("runs only once per database", async () => {
    const bulkAdd = vi.fn();
    const setSyncMeta = vi.fn();
    const getSyncMeta = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce("true");

    const db = {
      categories: {
        toArray: vi.fn().mockResolvedValue([]),
        bulkAdd,
      },
      transactions: {
        toArray: vi.fn().mockResolvedValue([
          {
            id: "tx-1",
            category: "Food",
            amount: -10,
            expense: 10,
            income: 0,
          },
        ]),
      },
      categoryGroups: {
        toArray: vi.fn().mockResolvedValue([]),
      },
      _syncMeta: {},
      getSyncMeta,
      setSyncMeta,
      transaction: vi.fn(async (_mode: unknown, _tables: unknown, callback: () => Promise<void>) => callback()),
    };

    await ensureCategoryBackfill(db as any);
    await ensureCategoryBackfill(db as any);

    expect(bulkAdd).toHaveBeenCalledTimes(1);
    expect(setSyncMeta).toHaveBeenCalledWith("categoryBackfillV1", "true");
  });
});
