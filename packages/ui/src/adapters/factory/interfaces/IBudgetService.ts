import type { Budget, NewBudget } from "@money-insight/ui/types";

export interface IBudgetService {
  getBudgets(): Promise<Budget[]>;
  getBudget(id: string): Promise<Budget | undefined>;
  addBudget(input: NewBudget): Promise<Budget>;
  updateBudget(budget: Budget): Promise<Budget>;
  deleteBudget(id: string): Promise<void>;
}
