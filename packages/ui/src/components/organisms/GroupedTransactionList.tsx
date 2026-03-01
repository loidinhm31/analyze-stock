import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeftRight, ChevronDown, Scale } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  Badge,
  CategoryIcon,
} from "@money-insight/ui/components/atoms";
import { useCategoryIcon } from "@money-insight/ui/hooks";
import {
  cn,
  formatCurrency,
  groupTransactionsByTimePeriod,
  type TimePeriodMode,
} from "@money-insight/ui/lib";
import { getTransferDisplayNote } from "@money-insight/ui/services/transferService";
import type { Transaction } from "@money-insight/ui/types";

export interface GroupedTransactionListProps {
  transactions: Transaction[];
  periodMode: TimePeriodMode;
  valuesHidden?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function GroupedTransactionList({
  transactions,
  periodMode,
  valuesHidden = false,
  onTransactionClick,
}: GroupedTransactionListProps) {
  const { getIcon } = useCategoryIcon();
  const maskValue = (value: string) => "*".repeat(value.length);

  const groups = groupTransactionsByTimePeriod(transactions, periodMode);
  const groupKeysStr = groups.map((g) => g.key).join(",");

  // Default open the first group (most recent)
  const [openGroups, setOpenGroups] = useState<string[]>(
    groups.length > 0 ? [groups[0].key] : [],
  );

  // Prune stale keys and fall back to first group when all open groups disappear
  // (e.g. after delete removes the last transaction in an open group, or periodMode changes)
  useEffect(() => {
    if (groups.length === 0) return;
    const keySet = new Set(groups.map((g) => g.key));
    setOpenGroups((prev) => {
      const valid = prev.filter((k) => keySet.has(k));
      return valid.length > 0 ? valid : [groups[0].key];
    });
  // groupKeysStr is a stable string fingerprint of the group set — safe dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMode, groupKeysStr]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No transactions found</p>
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      value={openGroups}
      onValueChange={setOpenGroups}
      className="space-y-2"
    >
      {groups.map((group) => {
        const isOpen = openGroups.includes(group.key);

        return (
          <AccordionItem
            key={group.key}
            value={group.key}
            className="border rounded-lg overflow-hidden"
          >
            {/* Custom Accordion Trigger with Group Header */}
            <button
              type="button"
              onClick={() => {
                if (isOpen) {
                  setOpenGroups(openGroups.filter((k) => k !== group.key));
                } else {
                  setOpenGroups([...openGroups, group.key]);
                }
              }}
              className={cn(
                "flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-accent/50",
                isOpen && "bg-accent/30",
              )}
            >
              <div className="flex items-center gap-3">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {group.label}
                  </span>
                  <span className="text-xs ml-2 text-muted-foreground">
                    ({group.transactions.length} transaction
                    {group.transactions.length !== 1 ? "s" : ""})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {group.totalExpense > 0 && (
                  <span className="font-medium text-destructive">
                    {valuesHidden
                      ? maskValue(formatCurrency(group.totalExpense))
                      : `-${formatCurrency(group.totalExpense)}`}
                  </span>
                )}
                {group.totalIncome > 0 && (
                  <span className="font-medium text-success">
                    {valuesHidden
                      ? maskValue(formatCurrency(group.totalIncome))
                      : `+${formatCurrency(group.totalIncome)}`}
                  </span>
                )}
              </div>
            </button>

            <AccordionContent className="px-4 pb-4 pt-0">
              <div className="space-y-2">
                {group.transactions.map((transaction) => {
                  const isExpense = transaction.expense > 0;
                  const isAdjustment =
                    transaction.source === "balance_adjustment";
                  const isTransfer = transaction.source === "transfer";
                  const transactionDate = new Date(transaction.date);

                  let displayCategory: string;
                  let displayNote: string | undefined;
                  if (isAdjustment) {
                    displayCategory = "Balance Adjustment";
                  } else if (isTransfer) {
                    displayCategory = "Transfer";
                    displayNote = getTransferDisplayNote(transaction);
                  } else {
                    displayCategory = transaction.category;
                    displayNote = transaction.note || undefined;
                  }

                  const amountColor = isAdjustment
                    ? "var(--color-primary-500)"
                    : isTransfer
                      ? "var(--color-text-secondary)"
                      : isExpense
                        ? "var(--color-destructive)"
                        : "var(--color-success)";

                  return (
                    <div
                      key={transaction.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors",
                        onTransactionClick && "cursor-pointer",
                        isAdjustment && "border-primary/20 bg-primary/5",
                        isTransfer && "border-muted-foreground/20 bg-muted/20",
                      )}
                      onClick={() => onTransactionClick?.(transaction)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAdjustment && (
                            <Scale className="h-4 w-4 text-primary" />
                          )}
                          {isTransfer && (
                            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium text-secondary-foreground">
                            {format(transactionDate, "MMM dd")}
                          </span>
                          <Badge variant={isAdjustment ? "default" : "outline"}>
                            <span className="inline-flex items-center gap-1">
                              {!isAdjustment &&
                                !isTransfer &&
                                getIcon(transaction.category) && (
                                  <CategoryIcon
                                    name={getIcon(transaction.category)}
                                    size={16}
                                    className="inline-block shrink-0"
                                  />
                                )}
                              {displayCategory}
                            </span>
                          </Badge>
                          <Badge variant="secondary">
                            {transaction.account}
                          </Badge>
                        </div>
                        {displayNote && !isAdjustment && (
                          <p className="text-sm truncate mt-1 text-muted-foreground">
                            {displayNote}
                          </p>
                        )}
                        {isAdjustment && (
                          <p className="text-sm mt-1 text-primary">
                            Auto-adjusting entry
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-2">
                        <p
                          className="font-semibold"
                          style={{ color: amountColor }}
                        >
                          {valuesHidden
                            ? maskValue(
                                formatCurrency(
                                  isExpense
                                    ? transaction.expense
                                    : transaction.income,
                                ),
                              )
                            : isExpense
                              ? `-${formatCurrency(transaction.expense)}`
                              : transaction.income > 0
                                ? `+${formatCurrency(transaction.income)}`
                                : formatCurrency(0)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
