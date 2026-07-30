import type { TimePeriodGroup } from "@money-insight/ui/lib";
import type { Transaction } from "@money-insight/ui/types";
import { GroupedTransactionRow } from "./GroupedTransactionRow";

interface DateTransactionGroupProps {
  group: TimePeriodGroup;
  showHeader: boolean;
  valuesHidden: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function DateTransactionGroup({
  group,
  showHeader,
  valuesHidden,
  onTransactionClick,
}: DateTransactionGroupProps) {
  const rows = group.transactions.map((transaction) => (
    <GroupedTransactionRow
      key={transaction.id}
      transaction={transaction}
      showDate={false}
      valuesHidden={valuesHidden}
      onTransactionClick={onTransactionClick}
    />
  ));

  if (!showHeader) {
    return <>{rows}</>;
  }

  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border bg-accent/30 px-3 py-2">
        <span className="text-xs font-semibold text-foreground">
          {group.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {group.transactions.length} item
          {group.transactions.length === 1 ? "" : "s"}
        </span>
      </header>
      <div className="divide-y divide-border">{rows}</div>
    </section>
  );
}
