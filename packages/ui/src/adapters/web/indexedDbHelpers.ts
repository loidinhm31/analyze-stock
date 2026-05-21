import type { Debt, DebtSettlement } from "@money-insight/ui/types";
import { getDb, generateId, getCurrentTimestamp } from "./database";

interface SyncTracked {
  id?: string;
  syncVersion?: number;
}

export function withSyncTracking<T extends SyncTracked>(
  entity: T,
  existing?: T,
): T {
  return {
    ...entity,
    id: entity.id || generateId(),
    syncVersion: (existing?.syncVersion || 0) + 1,
  };
}

export async function trackDelete(
  tableName: string,
  id: string,
  syncVersion: number,
): Promise<void> {
  await getDb()._pendingChanges.add({
    tableName,
    rowId: id,
    operation: "delete",
    data: {},
    version: (syncVersion || 0) + 1,
    createdAt: getCurrentTimestamp(),
  });
}

export function recomputeDebt(
  debt: Debt,
  settlements: DebtSettlement[],
): Pick<Debt, "settledAmount" | "remainingAmount" | "isCompleted" | "completedAt"> {
  const activeSettlements = settlements.filter((settlement) => settlement.amount > 0);
  const settledAmount = activeSettlements.reduce(
    (total, settlement) => total + settlement.amount,
    0,
  );
  const remainingAmount = Math.max(debt.principalAmount - settledAmount, 0);
  const isCompleted = remainingAmount <= 0;
  const completedAt = isCompleted
    ? activeSettlements
        .map((settlement) => settlement.settledAt)
        .sort((left, right) => right.localeCompare(left))[0]
    : undefined;

  return {
    settledAmount,
    remainingAmount,
    isCompleted,
    completedAt,
  };
}

export async function deleteTransactionWithTracking(transactionId: string): Promise<void> {
  const existing = await getDb().transactions.get(transactionId);
  if (!existing) return;

  await trackDelete("transactions", transactionId, existing.syncVersion || 0);
  await getDb().transactions.delete(transactionId);
}

export async function deleteSettlementWithTracking(settlement: DebtSettlement): Promise<void> {
  await trackDelete("debtSettlements", settlement.id, settlement.syncVersion || 0);
  await getDb().debtSettlements.delete(settlement.id);
}

export async function deleteSettlementAndTransaction(
  settlement: DebtSettlement,
): Promise<void> {
  await deleteSettlementWithTracking(settlement);
  await deleteTransactionWithTracking(settlement.transactionId);
}

export async function deleteDebtSettlementByTransactionId(
  transactionId: string,
): Promise<string | undefined> {
  const settlement = await getDb().debtSettlements.where("transactionId").equals(transactionId).first();
  if (!settlement) return undefined;

  await deleteSettlementWithTracking(settlement);
  await reconcileDebtFromSettlements(settlement.debtId);
  return settlement.debtId;
}

export async function deleteDebtSettlementById(id: string): Promise<DebtSettlement | undefined> {
  const settlement = await getDb().debtSettlements.get(id);
  if (!settlement) return undefined;

  await deleteSettlementAndTransaction(settlement);
  await reconcileDebtFromSettlements(settlement.debtId);
  return settlement;
}

export async function deleteDebtWithSettlements(id: string): Promise<void> {
  const debt = await getDb().debts.get(id);
  if (!debt) return;

  const settlements = await getDb().debtSettlements.where("debtId").equals(id).toArray();
  for (const settlement of settlements) {
    await deleteSettlementAndTransaction(settlement);
  }

  await trackDelete("debts", debt.id, debt.syncVersion || 0);
  await getDb().debts.delete(id);
}

export async function deleteRemoteSettlementAndLinkedTransaction(
  settlementId: string,
): Promise<string | undefined> {
  const settlement = await getDb().debtSettlements.get(settlementId);
  if (!settlement) return undefined;

  await getDb().debtSettlements.delete(settlementId);
  await getDb().transactions.delete(settlement.transactionId);
  return settlement.debtId;
}

export function assertDebtType(value: string): asserts value is Debt["debtType"] {
  if (value !== "payable" && value !== "receivable") {
    throw new Error("Invalid debt type");
  }
}

export function assertPositiveAmount(amount: number, fieldName = "amount"): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} must be positive`);
  }
}

export function buildDebtSettlementTransactionNote(
  debt: Debt,
  note?: string,
): string {
  const prefix = `${debt.debtType === "payable" ? "Debt payment" : "Debt collection"}: ${debt.name}`;
  return note?.trim() ? `${prefix} — ${note.trim()}` : prefix;
}

export function buildDebtSettlementTransactionAmount(
  debtType: Debt["debtType"],
  amount: number,
): number {
  assertPositiveAmount(amount);
  return debtType === "payable" ? -Math.abs(amount) : Math.abs(amount);
}

export function getDebtSettlementCategory(debtType: Debt["debtType"]): string {
  return debtType === "payable" ? "Debt Payment" : "Debt Collection";
}

export async function reconcileDebtFromSettlements(debtId: string): Promise<void> {
  const debt = await getDb().debts.get(debtId);
  if (!debt) return;

  const settlements = await getDb().debtSettlements.where("debtId").equals(debtId).toArray();
  const aggregate = recomputeDebt(debt, settlements);
  await getDb().debts.update(debtId, {
    ...aggregate,
    updatedAt: new Date().toISOString(),
    syncVersion: (debt.syncVersion || 0) + 1,
    syncedAt: null,
  });
}

export async function reconcileDebtByTransactionId(transactionId: string): Promise<void> {
  await deleteDebtSettlementByTransactionId(transactionId);
}
