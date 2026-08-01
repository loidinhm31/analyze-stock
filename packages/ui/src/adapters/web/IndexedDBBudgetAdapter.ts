import type { IBudgetService } from "@money-insight/ui/adapters/factory/interfaces";
import type { Budget, NewBudget } from "@money-insight/ui/types";
import { assertPositiveAmount, trackDelete } from "./indexedDbHelpers";
import { generateId, getDb } from "./database";

export class IndexedDBBudgetAdapter implements IBudgetService {
  async getBudgets(): Promise<Budget[]> {
    const budgets = await getDb().budgets.toArray();
    return budgets.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async getBudget(id: string): Promise<Budget | undefined> {
    return getDb().budgets.get(id);
  }

  async addBudget(input: NewBudget): Promise<Budget> {
    assertPositiveAmount(input.amount);

    const now = new Date().toISOString();
    const budget: Budget = {
      id: generateId(),
      ...input,
      amount: Math.abs(input.amount),
      categoryNames: [...input.categoryNames],
      accountNames: [...input.accountNames],
      status: input.status ?? "active",
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
      syncedAt: null,
    };

    await getDb().budgets.add(budget);
    return budget;
  }

  async updateBudget(budget: Budget): Promise<Budget> {
    assertPositiveAmount(budget.amount);

    const existing = await getDb().budgets.get(budget.id);
    if (!existing) {
      throw new Error("Budget not found");
    }

    const updated: Budget = {
      ...budget,
      amount: Math.abs(budget.amount),
      categoryNames: [...budget.categoryNames],
      accountNames: [...budget.accountNames],
      updatedAt: new Date().toISOString(),
      syncVersion: (existing.syncVersion || 0) + 1,
      syncedAt: null,
    };

    await getDb().budgets.put(updated);
    return updated;
  }

  async deleteBudget(id: string): Promise<void> {
    const existing = await getDb().budgets.get(id);
    if (existing) {
      await trackDelete("budgets", id, existing.syncVersion || 0);
    }
    await getDb().budgets.delete(id);
  }
}
