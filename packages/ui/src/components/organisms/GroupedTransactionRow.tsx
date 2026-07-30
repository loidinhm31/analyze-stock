import { type KeyboardEvent } from "react";
import { ArrowLeftRight, HandCoins, Scale } from "lucide-react";
import { Badge, CategoryIcon } from "@money-insight/ui/components/atoms";
import { getTransactionItemDisplay } from "@money-insight/ui/components/molecules";
import { useCategoryIcon } from "@money-insight/ui/hooks";
import { cn, formatCurrency } from "@money-insight/ui/lib";
import type { Transaction } from "@money-insight/ui/types";

interface GroupedTransactionRowProps {
  transaction: Transaction;
  showDate: boolean;
  valuesHidden: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

function formatAmount(transaction: Transaction, valuesHidden: boolean): string {
  const isExpense = transaction.expense > 0;
  const amount = isExpense ? transaction.expense : transaction.income;
  const value = formatCurrency(amount);

  if (valuesHidden) {
    return "*".repeat(value.length);
  }

  if (isExpense) return `-${value}`;
  if (transaction.income > 0) return `+${value}`;
  return formatCurrency(0);
}

export function GroupedTransactionRow({
  transaction,
  showDate,
  valuesHidden,
  onTransactionClick,
}: GroupedTransactionRowProps) {
  const { getIcon } = useCategoryIcon();
  const isExpense = transaction.expense > 0;
  const {
    isAdjustment,
    isTransfer,
    isDebtInitialization,
    isDebtSettlement,
    displayCategory,
    displayNote,
  } = getTransactionItemDisplay({
    category: transaction.category,
    note: transaction.note,
    source: transaction.source,
    transaction,
  });
  const iconName = getIcon(transaction.category);
  const amountClass = cn(
    "shrink-0 text-right text-sm font-semibold tabular-nums",
    isAdjustment
      ? "text-primary"
      : isTransfer
        ? "text-muted-foreground"
        : isExpense
          ? isDebtSettlement
            ? "text-warning"
            : "text-destructive"
          : "text-success",
  );
  const stateClass = cn(
    isAdjustment && "bg-primary/5",
    isTransfer && "bg-muted/30",
    isDebtInitialization && "bg-success/5",
    isDebtSettlement && "bg-warning/5",
  );
  const rowClassName = cn(
    "flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-200",
    onTransactionClick &&
      "cursor-pointer hover:bg-accent/60 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    stateClass,
  );
  const details = (
    <>
      <div className="flex shrink-0 items-center text-muted-foreground">
        {isAdjustment ? (
          <Scale
            className="h-4 w-4 text-primary"
            aria-label="Balance adjustment"
          />
        ) : isTransfer ? (
          <ArrowLeftRight className="h-4 w-4" aria-label="Transfer" />
        ) : isDebtInitialization ? (
          <HandCoins
            className="h-4 w-4 text-success"
            aria-label="Debt initialization"
          />
        ) : isDebtSettlement ? (
          <HandCoins
            className="h-4 w-4 text-warning"
            aria-label="Debt settlement"
          />
        ) : iconName ? (
          <CategoryIcon name={iconName} size={28} className="shrink-0" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          {showDate && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {transaction.date.slice(0, 10)}
            </span>
          )}
          <span className="truncate text-sm font-medium text-foreground">
            {displayCategory}
          </span>
          <Badge className="hidden shrink-0 sm:inline-flex" variant="secondary">
            {transaction.account}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {isAdjustment
            ? "Auto-adjusting entry"
            : displayNote || transaction.account}
        </p>
      </div>
      <span className={amountClass}>
        {formatAmount(transaction, valuesHidden)}
      </span>
    </>
  );

  if (!onTransactionClick) {
    return <div className={rowClassName}>{details}</div>;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onTransactionClick(transaction);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={rowClassName}
      onClick={() => onTransactionClick(transaction)}
      onKeyDown={handleKeyDown}
    >
      {details}
    </div>
  );
}
