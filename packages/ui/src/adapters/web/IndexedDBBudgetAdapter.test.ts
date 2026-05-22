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
      notificationEvents: {
        toArray: vi.fn(),
        get: vi.fn(),
        add: vi.fn(),
        put: vi.fn(),
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
    mockDb.notificationEvents.toArray.mockResolvedValue([]);
    mockDb.notificationEvents.get.mockResolvedValue(undefined);
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

  it("enqueues notification events with pending defaults", async () => {
    generateIdMock.mockReturnValueOnce("event-1");

    const adapter = new IndexedDBBudgetAdapter();
    const event = await adapter.enqueueNotificationEvent({
      eventType: "budget_overrun",
      title: "Budget exceeded",
      body: "Food budget is over limit",
      payload: { budgetId: "budget-1" },
      triggeredAt: "2024-01-20T00:00:00.000Z",
      sourceTable: "transactions",
      sourceRowId: "tx-1",
    });

    expect(mockDb.notificationEvents.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "event-1",
        priority: "normal",
        status: "pending",
        attemptCount: 0,
      }),
    );
    expect(event.payload).toEqual({ budgetId: "budget-1" });
  });

  it("updates notification event status with a bumped sync version", async () => {
    mockDb.notificationEvents.get.mockResolvedValue({
      id: "event-1",
      eventType: "budget_overrun",
      title: "Budget exceeded",
      body: "Food budget is over limit",
      priority: "high",
      status: "pending",
      triggeredAt: "2024-01-20T00:00:00.000Z",
      attemptCount: 0,
      createdAt: "2024-01-20T00:00:00.000Z",
      updatedAt: "2024-01-20T00:00:00.000Z",
      syncVersion: 2,
      syncedAt: 100,
    });

    const adapter = new IndexedDBBudgetAdapter();
    const event = await adapter.updateNotificationEventStatus("event-1", {
      status: "failed",
      lastError: "network",
      attemptCount: 1,
    });

    expect(mockDb.notificationEvents.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "event-1",
        status: "failed",
        lastError: "network",
        attemptCount: 1,
        syncVersion: 3,
        syncedAt: null,
      }),
    );
    expect(event.status).toBe("failed");
  });
});
