import { create } from "zustand";
import type {
  Budget,
  NewBudget,
  NewNotificationEvent,
  NotificationEvent,
  JsonObject,
  Transaction,
} from "@money-insight/ui/types";
import { calculateBudgetUsage, type BudgetUsage } from "@money-insight/ui/lib/budget-calculations";
import * as budgetService from "@money-insight/ui/services/budgetService";
import { useCategoryGroupStore } from "./categoryGroupStore";

interface BudgetStore {
  budgets: Budget[];
  usage: Record<string, BudgetUsage>;
  isLoading: boolean;
  isDbReady: boolean;
  error: string | null;
  loadBudgets: () => Promise<void>;
  addBudget: (input: NewBudget) => Promise<Budget>;
  updateBudget: (budget: Budget) => Promise<Budget>;
  pauseBudget: (id: string) => Promise<Budget>;
  resumeBudget: (id: string) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  refreshUsage: (
    transactions?: Transaction[],
    asOfDate?: string,
  ) => Promise<Record<string, BudgetUsage>>;
  enqueueBudgetEvent: (
    input: NewNotificationEvent,
  ) => Promise<NotificationEvent | null>;
  reset: () => void;
}

async function loadCurrentTransactions(): Promise<Transaction[]> {
  const { useSpendingStore } =
    await import("@money-insight/ui/stores/spendingStore");
  return useSpendingStore.getState().transactions;
}

function buildUsageMap(
  budgets: Budget[],
  transactions: Transaction[],
  asOfDate: string,
): Record<string, BudgetUsage> {
  const resolveCategoryName = useCategoryGroupStore.getState().resolveParent;
  return Object.fromEntries(
    budgets.map((budget) => [
      budget.id,
      calculateBudgetUsage(budget, transactions, asOfDate, { resolveCategoryName }),
    ]),
  );
}

function requireBudget(budgets: Budget[], id: string): Budget {
  const budget = budgets.find((item) => item.id === id);
  if (!budget) {
    throw new Error("Budget not found");
  }
  return budget;
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function readPayloadString(
  payload: JsonObject | undefined,
  key: string,
): string | undefined {
  const value = payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function shouldSkipDuplicateEvent(
  existingEvents: NotificationEvent[],
  input: NewNotificationEvent,
): NotificationEvent | null {
  const inputBudgetId = readPayloadString(input.payload, "budgetId");
  const inputCycleKey = readPayloadString(input.payload, "cycleKey");
  const inputReason = readPayloadString(input.payload, "reason");

  const match = existingEvents.find((event) => {
    if (event.eventType !== input.eventType || event.status === "failed") {
      return false;
    }

    const eventBudgetId = readPayloadString(event.payload, "budgetId");
    const eventCycleKey = readPayloadString(event.payload, "cycleKey");
    const eventReason = readPayloadString(event.payload, "reason");

    return (
      event.sourceRowId === input.sourceRowId &&
      eventBudgetId === inputBudgetId &&
      eventCycleKey === inputCycleKey &&
      eventReason === inputReason
    );
  });

  return match ?? null;
}

export const useBudgetStore = create<BudgetStore>()((set, get) => ({
  budgets: [],
  usage: {},
  isLoading: false,
  isDbReady: false,
  error: null,

  loadBudgets: async () => {
    set({ isLoading: true, error: null });

    try {
      const budgets = await budgetService.getBudgets();
      set({ budgets, isLoading: false, isDbReady: false });
      await get().refreshUsage();
      set({ isDbReady: true });
    } catch (error) {
      set({
        isLoading: false,
        isDbReady: false,
        error: error instanceof Error ? error.message : "Failed to load budgets",
      });
      throw error;
    }
  },

  addBudget: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const budget = await budgetService.addBudget(input);
      const budgets = [budget, ...get().budgets];
      set({ budgets, isLoading: false, isDbReady: false });
      await get().refreshUsage();
      set({ isDbReady: true });
      return budget;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to add budget",
      });
      throw error;
    }
  },

  updateBudget: async (budget) => {
    set({ isLoading: true, error: null });

    try {
      const updated = await budgetService.updateBudget(budget);
      set((state) => ({
        budgets: state.budgets.map((item) => (item.id === updated.id ? updated : item)),
        isLoading: false,
        isDbReady: false,
      }));
      await get().refreshUsage();
      set({ isDbReady: true });
      return updated;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to update budget",
      });
      throw error;
    }
  },

  pauseBudget: async (id) =>
    get().updateBudget({
      ...requireBudget(get().budgets, id),
      status: "paused",
    }),

  resumeBudget: async (id) =>
    get().updateBudget({
      ...requireBudget(get().budgets, id),
      status: "active",
    }),

  deleteBudget: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await budgetService.deleteBudget(id);
      set((state) => {
        const usage = { ...state.usage };
        delete usage[id];
        return {
          budgets: state.budgets.filter((budget) => budget.id !== id),
          usage,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to delete budget",
      });
      throw error;
    }
  },

  refreshUsage: async (transactions, asOfDate) => {
    const currentTransactions = transactions ?? (await loadCurrentTransactions());
    const budgets = get().budgets;
    const effectiveDate = asOfDate ?? getTodayIsoDate();
    const usage = buildUsageMap(budgets, currentTransactions, effectiveDate);
    set({ usage });
    return usage;
  },

  enqueueBudgetEvent: async (input) => {
    const existingEvent = shouldSkipDuplicateEvent(
      await budgetService.getNotificationEvents(),
      input,
    );
    if (existingEvent) {
      return existingEvent;
    }

    return budgetService.enqueueNotificationEvent(input);
  },

  reset: () => {
    set({
      budgets: [],
      usage: {},
      isLoading: false,
      isDbReady: false,
      error: null,
    });
  },
}));
