import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@money-insight/ui/components/atoms";
import { formatBudgetReferenceMonth } from "@money-insight/ui/lib";

interface BudgetCycleNavigatorProps {
  referenceDate: string;
  canGoToPreviousMonth: boolean;
  canGoToNextMonth: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export function BudgetCycleNavigator({
  referenceDate,
  canGoToPreviousMonth,
  canGoToNextMonth,
  onPreviousMonth,
  onNextMonth,
}: BudgetCycleNavigatorProps) {
  const referenceMonth = formatBudgetReferenceMonth(referenceDate);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-foreground">Budget history</p>
        <p className="text-sm text-muted-foreground">Viewing cycles for {referenceMonth}</p>
      </div>
      <div className="flex items-center gap-1" aria-label="Budget history month">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="View previous budget month"
          disabled={!canGoToPreviousMonth}
          onClick={onPreviousMonth}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="min-w-32 px-2 text-center text-sm font-medium text-foreground" aria-live="polite">
          {referenceMonth}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="View next budget month"
          disabled={!canGoToNextMonth}
          onClick={onNextMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
