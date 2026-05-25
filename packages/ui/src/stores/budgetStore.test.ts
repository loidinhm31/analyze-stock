import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Budget, NotificationEvent } from "@money-insight/ui/types";
import { setBudgetService, resetServices } from "@money-insight/ui/adapters";
import { useSpendingStore } from "./spendingStore";
import { useBudgetStore } from "./budgetStore";

const budget: Budget = {
  id: "budget-1",
  name: "Food",
  amount: 1000,
  currency: "VND",
  categoryNames: ["Food"],
  accountNames: [],
  firstCycleStartDate: "2024-01-01",
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  syncVersion: 1,
  syncedAt: null,
};

describe("budgetStore", () => {
  beforeEach(() => {
    resetServices();
    useBudgetStore.getState().reset();
    useSpendingStore.getState().reset();
  });

  it("refreshes usage against today by default instead of latest transaction date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-20T08:00:00.000Z"));

    setBudgetService({
      getBudgets: vi.fn().mockResolvedValue([budget]),
      getBudget: vi.fn(),
      addBudget: vi.fn(),
      updateBudget: vi.fn(),
      deleteBudget: vi.fn(),
      getNotificationEvents: vi.fn().mockResolvedValue([]),
      enqueueNotificationEvent: vi.fn(),
      updateNotificationEventStatus: vi.fn(),
    });
    useSpendingStore.setState({
      transactions: [
        {
          id: "tx-1",
          source: "manual",
          note: "",
          amount: -700,
          category: "Food",
          account: "Cash",
          currency: "VND",
          date: "2024-01-15",
          excludeReport: false,
          expense: 700,
          income: 0,
          yearMonth: "2024-01",
          year: 2024,
          month: 1,
          createdAt: "2024-01-15T00:00:00.000Z",
          updatedAt: "2024-01-15T00:00:00.000Z",
          syncVersion: 1,
          syncedAt: null,
        },
      ],
    });

    await useBudgetStore.getState().loadBudgets();

    expect(useBudgetStore.getState().usage["budget-1"]).toMatchObject({
      cycleKey: "2024-03-01",
      spent: 0,
    });

    vi.useRealTimers();
  });

  it("marks updateBudget store state ready after update", async () => {
    setBudgetService({
      getBudgets: vi.fn(),
      getBudget: vi.fn(),
      addBudget: vi.fn(),
      updateBudget: vi.fn().mockResolvedValue({
        ...budget,
        amount: 1500,
        updatedAt: "2024-01-02T00:00:00.000Z",
      }),
      deleteBudget: vi.fn(),
      getNotificationEvents: vi.fn().mockResolvedValue([]),
      enqueueNotificationEvent: vi.fn(),
      updateNotificationEventStatus: vi.fn(),
    });
    useBudgetStore.setState({
      budgets: [budget],
      usage: {},
      isLoading: false,
      isDbReady: false,
      error: null,
    });

    await useBudgetStore.getState().updateBudget({ ...budget, amount: 1500 });

    expect(useBudgetStore.getState().isDbReady).toBe(true);
  });

  it("keeps budget store ready while updating an existing budget", async () => {
    const readinessStates: boolean[] = [];

    setBudgetService({
      getBudgets: vi.fn(),
      getBudget: vi.fn(),
      addBudget: vi.fn(),
      updateBudget: vi.fn().mockResolvedValue({
        ...budget,
        amount: 1500,
        updatedAt: "2024-01-02T00:00:00.000Z",
      }),
      deleteBudget: vi.fn(),
      getNotificationEvents: vi.fn().mockResolvedValue([]),
      enqueueNotificationEvent: vi.fn(),
      updateNotificationEventStatus: vi.fn(),
    });
    useBudgetStore.setState({
      budgets: [budget],
      usage: {},
      isLoading: false,
      isDbReady: true,
      error: null,
    });

    const unsubscribe = useBudgetStore.subscribe((state) => {
      readinessStates.push(state.isDbReady);
    });

    await useBudgetStore.getState().updateBudget({ ...budget, amount: 1500 });
    unsubscribe();

    expect(readinessStates).not.toContain(false);
    expect(useBudgetStore.getState().isDbReady).toBe(true);
  });

  it("skips duplicate worsened events for the same transaction and cycle", async () => {
    const existingEvent: NotificationEvent = {
      id: "event-1",
      eventType: "budget_overrun",
      title: "Budget exceeded: Food",
      body: "Food spent 1,200/1,000 VND.",
      priority: "high",
      payload: {
        budgetId: "budget-1",
        cycleKey: "2024-01-01",
        reason: "worsened",
      },
      dedupeKey: "money-insight:budget_overrun:budget-1:2024-01-01:worsened:tx-2",
      status: "pending",
      triggeredAt: "2024-01-10T00:00:00.000Z",
      attemptCount: 0,
      sourceTable: "transactions",
      sourceRowId: "tx-2",
      createdAt: "2024-01-10T00:00:00.000Z",
      updatedAt: "2024-01-10T00:00:00.000Z",
      syncVersion: 1,
      syncedAt: null,
    };
    const enqueueMock = vi.fn();

    setBudgetService({
      getBudgets: vi.fn(),
      getBudget: vi.fn(),
      addBudget: vi.fn(),
      updateBudget: vi.fn(),
      deleteBudget: vi.fn(),
      getNotificationEvents: vi.fn().mockResolvedValue([existingEvent]),
      enqueueNotificationEvent: enqueueMock,
      updateNotificationEventStatus: vi.fn(),
    });

    const result = await useBudgetStore.getState().enqueueBudgetEvent({
      eventType: "budget_overrun",
      title: "Budget exceeded: Food",
      body: "Food spent 1,250/1,000 VND.",
      priority: "high",
      payload: {
        budgetId: "budget-1",
        cycleKey: "2024-01-01",
        reason: "worsened",
      },
      dedupeKey: "money-insight:budget_overrun:budget-1:2024-01-01:worsened:tx-2",
      triggeredAt: "2024-01-11T00:00:00.000Z",
      sourceTable: "transactions",
      sourceRowId: "tx-2",
    });

    expect(result).toEqual(existingEvent);
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});
