import type {
  Debt,
  DebtSettlement,
  DebtSettlementInput,
  NewDebt,
} from "@money-insight/ui/types";

export interface IDebtService {
  getDebts(): Promise<Debt[]>;
  getDebt(id: string): Promise<Debt | undefined>;
  createDebt(input: NewDebt): Promise<Debt>;
  updateDebt(debt: Debt): Promise<Debt>;
  deleteDebt(id: string): Promise<void>;
  getSettlements(debtId: string): Promise<DebtSettlement[]>;
  addSettlement(debtId: string, input: DebtSettlementInput): Promise<DebtSettlement>;
  deleteSettlement(id: string): Promise<void>;
  reconcileDebtByTransactionId(transactionId: string): Promise<void>;
}
