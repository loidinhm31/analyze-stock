import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, CreditCard, Pencil, Trash2, UserRound } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@money-insight/ui/components/atoms";
import type { Account, Debt, DebtSettlement, DebtSettlementInput } from "@money-insight/ui/types";
import { cn } from "@money-insight/ui/lib";
import { formatDebtMoney, maskValue } from "./debt-form-helpers";
import { DebtSettlementForm } from "./DebtSettlementForm";

export interface DebtDetailDialogProps {
  debt: Debt | null;
  settlements: DebtSettlement[];
  accounts: Account[];
  valuesHidden?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (debt: Debt) => void;
  onDeleteSettlement: (settlementId: string) => Promise<void>;
  onAddSettlement: (input: DebtSettlementInput) => Promise<void>;
}

export function DebtDetailDialog({
  debt,
  settlements,
  accounts,
  valuesHidden = false,
  isOpen,
  onClose,
  onEdit,
  onDeleteSettlement,
  onAddSettlement,
}: DebtDetailDialogProps) {
  const [confirmingSettlementId, setConfirmingSettlementId] = useState<
    string | null
  >(null);
  const [deletingSettlementId, setDeletingSettlementId] = useState<
    string | null
  >(null);
  const [isSettlementDialogOpen, setIsSettlementDialogOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmingSettlementId(null);
      setDeletingSettlementId(null);
      setIsSettlementDialogOpen(false);
    }
  }, [isOpen]);

  const accountNames = useMemo(
    () =>
      new Map(accounts.map((account) => [account.name, account.name] as const)),
    [accounts],
  );

  if (!debt) return null;

  const isCompleted = debt.remainingAmount <= 0;
  const displayAmount = (amount: number) => {
    const formatted = formatDebtMoney(amount, debt.currency);
    return valuesHidden ? maskValue(formatted) : formatted;
  };

  async function handleDeleteSettlement(settlementId: string) {
    if (confirmingSettlementId !== settlementId) {
      setConfirmingSettlementId(settlementId);
      return;
    }

    setDeletingSettlementId(settlementId);
    try {
      await onDeleteSettlement(settlementId);
      setConfirmingSettlementId(null);
    } finally {
      setDeletingSettlementId(null);
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl flex flex-col overflow-hidden p-0">
          <DialogHeader className="flex-shrink-0 border-b px-6 pt-6 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className={cn(isCompleted && "line-through")}>
                  {debt.name}
                </DialogTitle>
                <DialogDescription>
                  {debt.debtType === "payable" ? "Payable" : "Receivable"} with{" "}
                  {debt.counterpartyName}
                </DialogDescription>
              </div>
              <Badge variant={isCompleted ? "success" : "warning"}>
                {isCompleted ? "Complete" : "Incomplete"}
              </Badge>
            </div>
          </DialogHeader>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <DebtSummaryCard label="Principal" value={displayAmount(debt.principalAmount)} />
                <DebtSummaryCard label="Settled" value={displayAmount(debt.settledAmount)} />
                <DebtSummaryCard label="Remaining" value={displayAmount(Math.max(debt.remainingAmount, 0))} />
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Debt Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <DetailRow icon={<UserRound className="h-4 w-4" />} label="Counterparty" value={debt.counterpartyName} />
                  <DetailRow icon={<CreditCard className="h-4 w-4" />} label="Account" value={debt.accountId} />
                  <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Origin date" value={format(new Date(debt.originatedAt), "MMM dd, yyyy")} />
                  <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Due date" value={debt.dueDate ? format(new Date(debt.dueDate), "MMM dd, yyyy") : "Not set"} />
                  {debt.description ? (
                    <div className="rounded-lg bg-muted/50 p-3 text-muted-foreground">
                      {debt.description}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">Settlement History</CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsSettlementDialogOpen(true)}
                      disabled={isCompleted || accounts.length === 0}
                    >
                      Add Settlement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settlements.length > 0 ? (
                    settlements.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {displayAmount(settlement.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {accountNames.get(settlement.accountId) ?? settlement.accountId}
                            {" • "}
                            {format(new Date(settlement.settledAt), "MMM dd, yyyy")}
                          </p>
                          {settlement.note ? (
                            <p className="text-sm text-muted-foreground">
                              {settlement.note}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            confirmingSettlementId === settlement.id
                              ? "destructive"
                              : "outline"
                          }
                          disabled={deletingSettlementId === settlement.id}
                          onClick={() => handleDeleteSettlement(settlement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingSettlementId === settlement.id
                            ? "Deleting..."
                            : confirmingSettlementId === settlement.id
                              ? "Confirm Delete"
                              : "Delete"}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      No settlements recorded yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => onEdit(debt)}>
              <Pencil className="h-4 w-4" />
              Edit Debt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSettlementDialogOpen}
        onOpenChange={setIsSettlementDialogOpen}
      >
        <DialogContent className="max-h-[90vh] sm:max-w-[460px] p-0">
          <DebtSettlementForm
            accounts={accounts}
            currency={debt.currency}
            remainingAmount={Math.max(debt.remainingAmount, 0)}
            onSubmit={async (input) => {
              await onAddSettlement(input);
            }}
            onCancel={() => setIsSettlementDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DebtSummaryCardProps {
  label: string;
  value: string;
}

function DebtSummaryCard({ label, value }: DebtSummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="font-medium text-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
