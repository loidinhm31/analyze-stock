import { Badge } from "@money-insight/ui/components/atoms";
import { DebtItem } from "@money-insight/ui/components/molecules";
import type { Debt } from "@money-insight/ui/types";

interface DebtSections {
  active: Debt[];
  completed: Debt[];
}

export interface DebtListProps {
  sections: DebtSections;
  valuesHidden?: boolean;
  onSelectDebt: (debt: Debt) => void;
}

export function DebtList({
  sections,
  valuesHidden = false,
  onSelectDebt,
}: DebtListProps) {
  const hasDebts = sections.active.length > 0 || sections.completed.length > 0;

  if (!hasDebts) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <h2 className="font-semibold text-foreground">No debts yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a payable or receivable item to start tracking balances and
          settlements.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DebtListSection
        title="Incomplete"
        debts={sections.active}
        valuesHidden={valuesHidden}
        onSelectDebt={onSelectDebt}
      />
      <DebtListSection
        title="Complete"
        debts={sections.completed}
        valuesHidden={valuesHidden}
        onSelectDebt={onSelectDebt}
      />
    </div>
  );
}

interface DebtListSectionProps {
  title: string;
  debts: Debt[];
  valuesHidden: boolean;
  onSelectDebt: (debt: Debt) => void;
}

function DebtListSection({
  title,
  debts,
  valuesHidden,
  onSelectDebt,
}: DebtListSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <Badge variant="outline">{debts.length}</Badge>
        </div>
      </div>

      {debts.length > 0 ? (
        <div className="space-y-3">
          {debts.map((debt) => (
            <DebtItem
              key={debt.id}
              debt={debt}
              valuesHidden={valuesHidden}
              onClick={onSelectDebt}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          No {title.toLowerCase()} debts in this tab.
        </div>
      )}
    </section>
  );
}
