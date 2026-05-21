import { format } from "date-fns";
import { CalendarDays, CreditCard, UserRound } from "lucide-react";
import { Badge, Button } from "@money-insight/ui/components/atoms";
import { cn } from "@money-insight/ui/lib";
import type { Debt } from "@money-insight/ui/types";
import {
  formatDebtMoney,
  maskValue,
} from "../organisms/debt-form-helpers";

export interface DebtItemProps {
  debt: Debt;
  valuesHidden?: boolean;
  onClick: (debt: Debt) => void;
}

export function DebtItem({
  debt,
  valuesHidden = false,
  onClick,
}: DebtItemProps) {
  const isCompleted = debt.remainingAmount <= 0;
  const formattedPrincipal = formatDebtMoney(
    debt.principalAmount,
    debt.currency,
  );
  const formattedRemaining = formatDebtMoney(
    Math.max(debt.remainingAmount, 0),
    debt.currency,
  );
  const formattedSettled = formatDebtMoney(debt.settledAmount, debt.currency);

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto w-full justify-start rounded-lg p-0 text-left hover:bg-transparent"
      onClick={() => onClick(debt)}
    >
      <div className="w-full rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "font-semibold text-foreground",
                  isCompleted && "line-through text-muted-foreground",
                )}
              >
                {debt.name}
              </span>
              <Badge variant={isCompleted ? "success" : "warning"}>
                {isCompleted ? "Complete" : "Incomplete"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <UserRound className="h-4 w-4" />
                {debt.counterpartyName}
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                {debt.accountId}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {format(new Date(debt.originatedAt), "MMM dd, yyyy")}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Remaining
            </p>
            <p
              className={cn(
                "text-sm font-semibold",
                isCompleted ? "text-success" : "text-foreground",
              )}
            >
              {valuesHidden ? maskValue(formattedRemaining) : formattedRemaining}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <span>
              Settled:{" "}
              <strong className="text-foreground">
                {valuesHidden ? maskValue(formattedSettled) : formattedSettled}
              </strong>
            </span>
            <span>
              Principal:{" "}
              <strong className="text-foreground">
                {valuesHidden
                  ? maskValue(formattedPrincipal)
                  : formattedPrincipal}
              </strong>
            </span>
          </div>
          {debt.dueDate ? (
            <span className="text-muted-foreground">
              Due {format(new Date(debt.dueDate), "MMM dd, yyyy")}
            </span>
          ) : (
            <span className="text-muted-foreground">No due date</span>
          )}
        </div>
      </div>
    </Button>
  );
}
