import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBBudgetAdapter } from "./IndexedDBBudgetAdapter";

const { mockDb, generateIdMock, trackDeleteMock, assertPositiveAmountMock } =
  vi.hoisted(() => ({
    mockDb: {
      budgets: {
        toArray: vi.fn(),
        get: vi.fn(),
        add: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
    },
    generateIdMock: vi.fn(),
    trackDeleteMock: vi.fn(),
    assertPositiveAmountMock: vi.fn(),
  }));

vi.mock("./database", () => ({
  getDb: () => mockDb,
  generateId: generateIdMock,
}));

vi.mock("./indexedDbHelpers", () => ({
  assertPositiveAmount: assertPositiveAmountMock,
  trackDelete: trackDeleteMock,
}));

describe("IndexedDBBudgetAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateIdMock.mockReturnValue("generated-id");
    mockDb.budgets.toArray.mockResolvedValue([]);
    mockDb.budgets.get.mockResolvedValue(undefined);
  });

  it("creates budgets with sync metadata and active default status", async () => {
    generateIdMock.mockReturnValueOnce("budget-1");

    const adapter = new IndexedDBBudgetAdapter();
    const budget = await adapter.addBudget({
      name: "Food",
      amount: 500,
      currency: "VND",
      categoryNames: ["Food", "Coffee"],
      accountNames: [],
      firstCycleStartDate: "2024-01-15",
    });

    expect(assertPositiveAmountMock).toHaveBeenCalledWith(500);
    expect(mockDb.budgets.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "budget-1",
        status: "active",
        syncVersion: 1,
        syncedAt: null,
      }),
    );
    expect(budget.categoryNames).toEqual(["Food", "Coffee"]);
  });

  it("tracks deletes for synced budgets", async () => {
    mockDb.budgets.get.mockResolvedValue({
      id: "budget-1",
      syncVersion: 3,
    });

    const adapter = new IndexedDBBudgetAdapter();
    await adapter.deleteBudget("budget-1");

    expect(trackDeleteMock).toHaveBeenCalledWith("budgets", "budget-1", 3);
    expect(mockDb.budgets.delete).toHaveBeenCalledWith("budget-1");
  });
});
