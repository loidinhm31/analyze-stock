import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBCategoryAdapter } from "./IndexedDBCategoryAdapter";

const mockDb = {
  categories: {
    toArray: vi.fn(),
    toCollection: vi.fn(),
    where: vi.fn(),
    update: vi.fn(),
  },
  transactions: {
    where: vi.fn(),
    update: vi.fn(),
  },
  categoryGroups: {
    where: vi.fn(),
    update: vi.fn(),
  },
  categoryMappings: {
    where: vi.fn(),
    update: vi.fn(),
  },
  transaction: vi.fn(),
};

vi.mock("./database", () => ({
  getDb: () => mockDb,
  generateId: () => "generated-id",
  getCurrentTimestamp: () => 42,
}));

describe("IndexedDBCategoryAdapter", () => {
  beforeEach(() => {
    mockDb.categories.toArray.mockResolvedValue([]);
    mockDb.categories.toCollection.mockReturnValue({
      filter: () => ({
        first: vi.fn().mockResolvedValue(undefined),
      }),
    });
    mockDb.categories.where.mockImplementation((field: string) => ({
      equals: (_value: string) => ({
        first: vi.fn().mockResolvedValue(field === "name" ? undefined : undefined),
      }),
    }));
    mockDb.transactions.where.mockReturnValue({
      equals: () => ({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    });
    mockDb.categoryGroups.where.mockReturnValue({
      equals: () => ({
        first: vi.fn().mockResolvedValue(undefined),
      }),
    });
    mockDb.categoryMappings.where.mockReturnValue({
      equals: () => ({
        first: vi.fn().mockResolvedValue(undefined),
      }),
    });
    mockDb.transaction.mockImplementation(
      async (
        _mode: unknown,
        _tableA: unknown,
        _tableB: unknown,
        _tableC: unknown,
        _tableD: unknown,
        callback: () => Promise<void>,
      ) => callback(),
    );
  });

  it("returns persisted category rows only in deterministic order", async () => {
    mockDb.categories.toArray.mockResolvedValue([
      {
        id: "b",
        name: "Travel",
        isExpense: true,
        syncVersion: 1,
        syncedAt: 1,
      },
      {
        id: "a",
        name: "Food",
        isExpense: true,
        syncVersion: 1,
        syncedAt: 1,
      },
    ]);

    const adapter = new IndexedDBCategoryAdapter();
    const categories = await adapter.getCategories();

    expect(categories.map((category) => category.name)).toEqual(["Food", "Travel"]);
    expect(categories.map((category) => category.id)).toEqual(["a", "b"]);
  });

  it("renames linked transactions, parent groups, and mappings together", async () => {
    const storedCategory = {
      id: "category-1",
      name: "Old Name",
      isExpense: true,
      syncVersion: 1,
      syncedAt: 1,
    };
    const storedGroup = {
      id: "group-1",
      name: "Old Name",
      isExpense: true,
      syncVersion: 2,
      syncedAt: 1,
    };
    const storedMapping = {
      id: "mapping-1",
      subCategory: "Old Name",
      parentGroupId: "parent-1",
      syncVersion: 3,
      syncedAt: 1,
    };

    mockDb.transactions.where.mockReturnValue({
      equals: () => ({
        toArray: vi.fn().mockResolvedValue([{ id: "tx-1" }]),
      }),
    });
    mockDb.categories.where.mockImplementation(() => ({
      equals: (value: string) => ({
        first: vi.fn().mockResolvedValue(value === "Old Name" ? storedCategory : undefined),
      }),
    }));
    mockDb.categoryGroups.where.mockReturnValue({
      equals: () => ({
        first: vi.fn().mockResolvedValue(storedGroup),
      }),
    });
    mockDb.categoryMappings.where.mockReturnValue({
      equals: () => ({
        first: vi.fn().mockResolvedValue(storedMapping),
      }),
    });

    const adapter = new IndexedDBCategoryAdapter();
    await adapter.renameCategory("Old Name", "New Name");

    expect(mockDb.transactions.update).toHaveBeenCalledWith("tx-1", expect.objectContaining({ category: "New Name" }));
    expect(mockDb.categories.update).toHaveBeenCalledWith("category-1", expect.objectContaining({ name: "New Name" }));
    expect(mockDb.categoryGroups.update).toHaveBeenCalledWith("group-1", expect.objectContaining({ name: "New Name" }));
    expect(mockDb.categoryMappings.update).toHaveBeenCalledWith("mapping-1", expect.objectContaining({ subCategory: "New Name" }));
  });
});
