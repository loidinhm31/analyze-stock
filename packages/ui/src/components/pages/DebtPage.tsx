import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@money-insight/ui/components/atoms";
import {
  DebtDetailDialog,
  DebtForm,
  DebtList,
} from "@money-insight/ui/components/organisms";
import { useNav } from "@money-insight/ui/hooks";
import { useDebtStore, useSpendingStore } from "@money-insight/ui/stores";
import type { Debt, DebtSettlementInput, NewDebt } from "@money-insight/ui/types";

export function DebtPage() {
  const { to } = useNav();
  const { accounts, valuesHidden } = useSpendingStore();
  const {
    payableSections,
    receivableSections,
    selectedDebt,
    selectedDebtSettlements,
    isLoading,
    error,
    loadDebts,
    addDebt,
    updateDebt,
    deleteDebt,
    selectDebt,
    addSettlement,
    deleteSettlement,
  } = useDebtStore();

  const [activeTab, setActiveTab] = useState<"payable" | "receivable">(
    "payable",
  );
  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  useEffect(() => {
    void loadDebts();
  }, [loadDebts]);

  const activeSections = useMemo(
    () => (activeTab === "payable" ? payableSections : receivableSections),
    [activeTab, payableSections, receivableSections],
  );

  const debtCount =
    activeSections.active.length + activeSections.completed.length;

  const openCreateDialog = useCallback(() => {
    setEditingDebt(null);
    setIsDebtFormOpen(true);
  }, []);

  const closeDebtForm = useCallback(() => {
    setEditingDebt(null);
    setIsDebtFormOpen(false);
  }, []);

  const handleSelectDebt = useCallback(
    async (debt: Debt) => {
      await selectDebt(debt.id);
    },
    [selectDebt],
  );

  const closeDetail = useCallback(() => {
    void selectDebt(null);
  }, [selectDebt]);

  const handleEditDebt = useCallback(
    (debt: Debt) => {
      setEditingDebt(debt);
      setIsDebtFormOpen(true);
      void selectDebt(null);
    },
    [selectDebt],
  );

  async function handleCreateDebt(input: NewDebt) {
    await addDebt(input);
  }

  async function handleUpdateDebt(debt: Debt) {
    await updateDebt(debt);
  }

  async function handleDeleteDebt(debtId: string) {
    await deleteDebt(debtId);
    await selectDebt(null);
  }

  async function handleAddSettlement(input: DebtSettlementInput) {
    if (!selectedDebt) return;
    await addSettlement(selectedDebt.id, input);
  }

  return (
    <div className="flex h-full flex-col pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Link
            to={to("/dashboard")}
            className="rounded-lg p-2 transition-colors hover:bg-(--color-bg-light)"
          >
            <ArrowLeft className="h-5 w-5 text-secondary-foreground" />
          </Link>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">
              Debts
            </h1>
            <p className="text-sm text-muted-foreground">
              {debtCount} {activeTab} debts
              {isLoading ? " • Refreshing..." : ""}
            </p>
          </div>
        </div>

        <Button onClick={openCreateDialog} disabled={accounts.length === 0}>
          <Plus className="h-4 w-4" />
          Add Debt
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="px-4 pb-4">
          <Alert variant="warning">
            <AlertDescription>
              Create an account before adding debts or settlements.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {error ? (
        <div className="px-4 pb-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto px-4 pb-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "payable" | "receivable")}
        >
          <div className="sticky top-0 z-10 border-b bg-card pt-2">
            <TabsList className="mb-2 grid w-full grid-cols-2">
              <TabsTrigger value="payable">Payable</TabsTrigger>
              <TabsTrigger value="receivable">Receivable</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="payable" className="mt-4">
            <DebtList
              sections={payableSections}
              valuesHidden={valuesHidden}
              onSelectDebt={handleSelectDebt}
            />
          </TabsContent>

          <TabsContent value="receivable" className="mt-4">
            <DebtList
              sections={receivableSections}
              valuesHidden={valuesHidden}
              onSelectDebt={handleSelectDebt}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={isDebtFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDebtForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] sm:max-w-[520px] p-0">
          {editingDebt ? (
            <DebtForm
              mode="edit"
              debt={editingDebt}
              accounts={accounts}
              onSubmit={handleUpdateDebt}
              onDelete={handleDeleteDebt}
              onCancel={closeDebtForm}
            />
          ) : (
            <DebtForm
              mode="add"
              accounts={accounts}
              onSubmit={handleCreateDebt}
              onCancel={closeDebtForm}
            />
          )}
        </DialogContent>
      </Dialog>

      <DebtDetailDialog
        debt={selectedDebt}
        settlements={selectedDebtSettlements}
        accounts={accounts}
        valuesHidden={valuesHidden}
        isOpen={selectedDebt !== null}
        onClose={closeDetail}
        onEdit={handleEditDebt}
        onAddSettlement={handleAddSettlement}
        onDeleteSettlement={deleteSettlement}
      />
    </div>
  );
}
