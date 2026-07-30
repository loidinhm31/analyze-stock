import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@money-insight/ui/components/atoms";
import {
  cn,
  formatCurrency,
  groupTransactionsByDate,
  groupTransactionsByTimePeriod,
  type TimePeriodMode,
} from "@money-insight/ui/lib";
import {
  getInitialOpenGroupKeys,
  reconcileOpenGroupKeys,
} from "../../lib/transactionGroupOpenState";
import type { Transaction } from "@money-insight/ui/types";
import { DateTransactionGroup } from "./DateTransactionGroup";

export interface GroupedTransactionListProps {
  transactions: Transaction[];
  periodMode: TimePeriodMode;
  valuesHidden?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

function formatSummaryValue(
  value: number,
  sign: "-" | "+" | "",
  valuesHidden: boolean,
) {
  const formatted = formatCurrency(Math.abs(value));
  return valuesHidden ? "*".repeat(formatted.length) : `${sign}${formatted}`;
}

export function GroupedTransactionList({
  transactions,
  periodMode,
  valuesHidden = false,
  onTransactionClick,
}: GroupedTransactionListProps) {
  const groups = useMemo(
    () => groupTransactionsByTimePeriod(transactions, periodMode),
    [transactions, periodMode],
  );
  const groupsWithDateSections = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        dateGroups:
          periodMode === "day"
            ? [group]
            : groupTransactionsByDate(group.transactions),
      })),
    [groups, periodMode],
  );
  const groupKeys = groupsWithDateSections.map((group) => group.key);
  const groupKeysFingerprint = groupKeys.join(",");
  const previousPeriodMode = useRef(periodMode);
  const hasInitializedOpenGroups = useRef(false);
  const [openGroups, setOpenGroups] = useState(() =>
    getInitialOpenGroupKeys(groupKeys, periodMode),
  );

  useEffect(() => {
    setOpenGroups((previousOpenGroups) =>
      periodMode === "day" && !hasInitializedOpenGroups.current
        ? groupKeys
        : reconcileOpenGroupKeys(
            previousOpenGroups,
            groupKeys,
            previousPeriodMode.current,
            periodMode,
          ),
    );
    if (groupKeys.length > 0) {
      hasInitializedOpenGroups.current = true;
    }
    previousPeriodMode.current = periodMode;
  }, [groupKeysFingerprint, periodMode]);

  if (groupsWithDateSections.length === 0) {
    return (
      <div className="py-12 text-center">
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
      {groupsWithDateSections.map((group) => {
        const net = group.totalIncome - group.totalExpense;
        const netClass =
          net > 0
            ? "text-success"
            : net < 0
              ? "text-destructive"
              : "text-muted-foreground";

        return (
          <AccordionItem
            key={group.key}
            value={group.key}
            className={cn(
              "overflow-hidden rounded-lg border border-border bg-card",
              periodMode === "day" && "border-l-4 border-l-primary shadow-sm",
            )}
          >
            <AccordionTrigger
              className={cn(
                "min-h-11 px-3 py-2.5 no-underline hover:bg-accent/50 hover:no-underline focus-visible:z-10 focus-visible:ring-inset sm:px-4",
                periodMode === "day" && "bg-primary/5 hover:bg-primary/10",
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {group.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {group.transactions.length} transaction
                    {group.transactions.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="hidden items-center gap-4 text-right text-xs sm:flex">
                  <SummaryMetric
                    label="Expense"
                    value={formatSummaryValue(
                      group.totalExpense,
                      "-",
                      valuesHidden,
                    )}
                    className="text-destructive"
                  />
                  <SummaryMetric
                    label="Income"
                    value={formatSummaryValue(
                      group.totalIncome,
                      "+",
                      valuesHidden,
                    )}
                    className="text-success"
                  />
                  <SummaryMetric
                    label="Net"
                    value={formatSummaryValue(
                      net,
                      net > 0 ? "+" : net < 0 ? "-" : "",
                      valuesHidden,
                    )}
                    className={netClass}
                  />
                </span>
                <span className="grid text-right text-xs sm:hidden">
                  <span className={cn("font-semibold tabular-nums", netClass)}>
                    {formatSummaryValue(
                      net,
                      net > 0 ? "+" : net < 0 ? "-" : "",
                      valuesHidden,
                    )}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatSummaryValue(group.totalExpense, "-", valuesHidden)}{" "}
                    · {formatSummaryValue(group.totalIncome, "+", valuesHidden)}
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="border-t border-border bg-muted/20 px-2 py-1.5 sm:px-3">
              <div
                className={
                  periodMode === "day" ? "divide-y divide-border" : "space-y-2"
                }
              >
                {group.dateGroups.map((dateGroup) => (
                  <DateTransactionGroup
                    key={dateGroup.key}
                    group={dateGroup}
                    showHeader={periodMode !== "day"}
                    valuesHidden={valuesHidden}
                    onTransactionClick={onTransactionClick}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function SummaryMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <span className="min-w-16">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("block font-semibold tabular-nums", className)}>
        {value}
      </span>
    </span>
  );
}
