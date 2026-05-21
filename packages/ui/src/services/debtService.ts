import { getDebtService } from "@money-insight/ui/adapters";
import type {
  Debt,
  DebtSettlement,
  DebtSettlementInput,
  NewDebt,
  Transaction,
} from "@money-insight/ui/types";

export function isDebtSettlementTransaction(
  tx: Pick<Transaction, "source"> | { source?: Transaction["source"] },
): boolean {
  return tx.source === "debt_settlement";
}

export async function getDebts(): Promise<Debt[]> {
  return getDebtService().getDebts();
}

export async function getDebt(id: string): Promise<Debt | undefined> {
  return getDebtService().getDebt(id);
}

export async function createDebt(input: NewDebt): Promise<Debt> {
  return getDebtService().createDebt(input);
}

export async function updateDebt(debt: Debt): Promise<Debt> {
  return getDebtService().updateDebt(debt);
}

export async function deleteDebt(id: string): Promise<void> {
  return getDebtService().deleteDebt(id);
}

export async function getSettlements(
  debtId: string,
): Promise<DebtSettlement[]> {
  return getDebtService().getSettlements(debtId);
}

export async function addSettlement(
  debtId: string,
  input: DebtSettlementInput,
): Promise<DebtSettlement> {
  return getDebtService().addSettlement(debtId, input);
}

export async function deleteSettlement(id: string): Promise<void> {
  return getDebtService().deleteSettlement(id);
}

export async function reconcileDebtByTransactionId(
  transactionId: string,
): Promise<void> {
  return getDebtService().reconcileDebtByTransactionId(transactionId);
}
