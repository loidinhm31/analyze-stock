import { format } from "date-fns";
import { Pause, Pencil, Play, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@money-insight/ui/components/atoms";
import { formatCurrency } from "@money-insight/ui/lib";
import type { Budget } from "@money-insight/ui/types";
import type { BudgetUsage } from "@money-insight/ui/lib/budget-calculations";

interface BudgetProgressListProps {
  budgets: Budget[];
  usage: Record<string, BudgetUsage>;
  valuesHidden: boolean;
  onEdit: (budget: Budget) => void;
  onPause: (budgetId: string) => Promise<unknown>;
  onResume: (budgetId: string) => Promise<unknown>;
  onDelete: (budgetId: string) => Promise<void>;
}

function formatBudgetAmount(amount: number, currency: string, valuesHidden: boolean) {
  if (valuesHidden) return "••••";
  return currency === "VND" ? formatCurrency(amount) : `${currency} ${amount.toLocaleString("en-US")}`;
}

function summarizeList(values: string[], emptyLabel: string) {
  if (values.length === 0) return emptyLabel;
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2} more`;
}

export function BudgetProgressList({
  budgets,
  usage,
  valuesHidden,
  onEdit,
  onPause,
  onResume,
  onDelete,
}: BudgetProgressListProps) {
  if (budgets.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No budgets in this section.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {budgets.map((budget) => {
        const currentUsage = usage[budget.id];
        const percentUsed = Math.min(currentUsage?.percentUsed ?? 0, 100);
        const overAmount = currentUsage ? Math.max(0, currentUsage.spent - budget.amount) : 0;

        return (
          <Card key={budget.id}>
            <CardHeader className="gap-3 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{budget.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {summarizeList(budget.categoryNames, "No categories")}
                  </p>
                </div>
                <Badge
                  variant={
                    budget.status === "active"
                      ? overAmount > 0
                        ? "warning"
                        : "success"
                      : "outline"
                  }
                >
                  {budget.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatBudgetAmount(currentUsage?.spent ?? 0, budget.currency, valuesHidden)}
                    {" / "}
                    {formatBudgetAmount(budget.amount, budget.currency, valuesHidden)}
                  </span>
                  <span className={overAmount > 0 ? "text-warning-foreground" : "text-muted-foreground"}>
                    {overAmount > 0
                      ? `${formatBudgetAmount(overAmount, budget.currency, valuesHidden)} over`
                      : `${formatBudgetAmount(Math.max(currentUsage?.remaining ?? budget.amount, 0), budget.currency, valuesHidden)} left`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${overAmount > 0 ? "bg-warning" : "bg-primary"}`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
              </div>
              <div className="grid gap-1 text-sm text-muted-foreground">
                <p>
                  Cycle:{" "}
                  {currentUsage
                    ? `${format(new Date(`${currentUsage.startDate}T00:00:00`), "MMM d")} to ${format(new Date(`${currentUsage.endDate}T00:00:00`), "MMM d, yyyy")}`
                    : "No cycle data yet"}
                </p>
                <p>Accounts: {summarizeList(budget.accountNames, "All accounts")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(budget)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                {budget.status === "active" ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void onPause(budget.id)}>
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => void onResume(budget.id)}>
                    <Play className="h-4 w-4" />
                    Resume
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => void onDelete(budget.id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
