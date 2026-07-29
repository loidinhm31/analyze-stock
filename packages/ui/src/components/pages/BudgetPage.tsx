import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, PiggyBank, Plus } from "lucide-react";
import { Alert, AlertDescription, Button } from "@money-insight/ui/components/atoms";
import { BudgetCycleNavigator } from "@money-insight/ui/components/molecules";
import { BudgetFormDialog, BudgetProgressList } from "@money-insight/ui/components/organisms";
import { useNav } from "@money-insight/ui/hooks";
import { moveBudgetHistoryReferenceDate } from "@money-insight/ui/lib";
import { useBudgetStore, useCategoryGroupStore, useSpendingStore } from "@money-insight/ui/stores";
import type { Budget, NewBudget } from "@money-insight/ui/types";

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function BudgetPage() {
  const { to } = useNav();
  const { accounts, transactions, valuesHidden } = useSpendingStore();
  const { categories } = useCategoryGroupStore();
  const {
    budgets,
    usage,
    isLoading,
    isDbReady,
    error,
    loadBudgets,
    addBudget,
    updateBudget,
    pauseBudget,
    resumeBudget,
    deleteBudget,
    refreshUsage,
  } = useBudgetStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedReferenceDate, setSelectedReferenceDate] = useState(getTodayIsoDate);
  const today = getTodayIsoDate();

  useEffect(() => {
    if (!isDbReady) {
      void loadBudgets();
    }
  }, [isDbReady, loadBudgets]);

  const earliestReferenceDate = useMemo(
    () => budgets.reduce<string | null>(
      (earliest, budget) => !earliest || budget.firstCycleStartDate < earliest
        ? budget.firstCycleStartDate
        : earliest,
      null,
    ),
    [budgets],
  );
  const effectiveReferenceDate = earliestReferenceDate && selectedReferenceDate < earliestReferenceDate
    ? earliestReferenceDate
    : selectedReferenceDate;
  const visibleBudgets = useMemo(
    () => budgets.filter((budget) => budget.firstCycleStartDate <= effectiveReferenceDate),
    [budgets, effectiveReferenceDate],
  );
  const activeBudgets = useMemo(
    () => visibleBudgets.filter((budget) => budget.status === "active"),
    [visibleBudgets],
  );
  const pausedBudgets = useMemo(
    () => visibleBudgets.filter((budget) => budget.status === "paused"),
    [visibleBudgets],
  );

  useEffect(() => {
    if (earliestReferenceDate && selectedReferenceDate < earliestReferenceDate) {
      setSelectedReferenceDate(earliestReferenceDate);
    }
  }, [earliestReferenceDate, selectedReferenceDate]);

  useEffect(() => {
    if (!isDbReady) return;
    void refreshUsage(transactions, effectiveReferenceDate);
  }, [budgets, effectiveReferenceDate, isDbReady, refreshUsage, transactions]);

  const previousReferenceDate = useMemo(
    () => moveBudgetHistoryReferenceDate(
      effectiveReferenceDate,
      -1,
      visibleBudgets,
      earliestReferenceDate ?? undefined,
      today,
    ),
    [earliestReferenceDate, effectiveReferenceDate, today, visibleBudgets],
  );
  const nextReferenceDate = useMemo(
    () => moveBudgetHistoryReferenceDate(
      effectiveReferenceDate,
      1,
      visibleBudgets,
      earliestReferenceDate ?? undefined,
      today,
    ),
    [earliestReferenceDate, effectiveReferenceDate, today, visibleBudgets],
  );
  const canGoToPreviousMonth = previousReferenceDate !== effectiveReferenceDate;
  const canGoToNextMonth = nextReferenceDate !== effectiveReferenceDate;

  const openCreateDialog = useCallback(() => {
    setEditingBudget(null);
    setIsDialogOpen(true);
  }, []);

  const handleBudgetSubmit = useCallback(
    async (input: NewBudget | Budget) => {
      if ("id" in input) {
        await updateBudget(input);
      } else {
        await addBudget(input);
      }
      setEditingBudget(null);
    },
    [addBudget, updateBudget],
  );

  return (
    <div className="flex h-full flex-col pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Link to={to("/dashboard")} className="rounded-lg p-2 transition-colors hover:bg-(--color-bg-light)">
            <ArrowLeft className="h-5 w-5 text-secondary-foreground" />
          </Link>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">Budgets</h1>
            <p className="text-sm text-muted-foreground">
              {activeBudgets.length} active • {pausedBudgets.length} paused
              {isLoading ? " • Refreshing..." : ""}
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Add Budget
        </Button>
      </div>

      {error ? (
        <div className="px-4 pb-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto px-4 pb-4">
        <BudgetCycleNavigator
          referenceDate={effectiveReferenceDate}
          canGoToPreviousMonth={canGoToPreviousMonth}
          canGoToNextMonth={canGoToNextMonth}
          onPreviousMonth={() => setSelectedReferenceDate(previousReferenceDate)}
          onNextMonth={() => setSelectedReferenceDate(nextReferenceDate)}
        />

        {!isLoading && budgets.length === 0 ? (
          <Alert>
            <PiggyBank className="h-4 w-4" />
            <AlertDescription>
              Budget progress updates immediately when existing transactions match the selected categories.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-4 grid gap-6">
          <section className="grid gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active budgets</h2>
            <BudgetProgressList
              budgets={activeBudgets}
              usage={usage}
              valuesHidden={valuesHidden}
              onEdit={(budget) => {
                setEditingBudget(budget);
                setIsDialogOpen(true);
              }}
              onPause={pauseBudget}
              onResume={resumeBudget}
              onDelete={deleteBudget}
            />
          </section>
          <section className="grid gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Paused budgets</h2>
            <BudgetProgressList
              budgets={pausedBudgets}
              usage={usage}
              valuesHidden={valuesHidden}
              onEdit={(budget) => {
                setEditingBudget(budget);
                setIsDialogOpen(true);
              }}
              onPause={pauseBudget}
              onResume={resumeBudget}
              onDelete={deleteBudget}
            />
          </section>
        </div>
      </div>

      <BudgetFormDialog
        open={isDialogOpen}
        budget={editingBudget}
        categories={categories}
        accounts={accounts}
        isSubmitting={isLoading}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingBudget(null);
          }
        }}
        onSubmit={handleBudgetSubmit}
      />
    </div>
  );
}
