import type { IDebtService } from "@money-insight/ui/adapters/factory/interfaces";
import type {
  Debt,
  DebtSettlement,
  DebtSettlementInput,
  NewDebt,
  NewTransaction,
} from "@money-insight/ui/types";
import { getDb, generateId } from "./database";
import {
  assertDebtType,
  assertPositiveAmount,
  buildDebtSettlementTransactionAmount,
  buildDebtSettlementTransactionNote,
  deleteDebtSettlementById,
  deleteDebtWithSettlements,
  getDebtSettlementCategory,
  reconcileDebtByTransactionId,
  reconcileDebtFromSettlements,
  recomputeDebt,
} from "./indexedDbHelpers";
import { IndexedDBTransactionAdapter } from "./IndexedDBTransactionAdapter";

export class IndexedDBDebtAdapter implements IDebtService {
  private readonly transactionAdapter = new IndexedDBTransactionAdapter();

  async getDebts(): Promise<Debt[]> {
    const debts = await getDb().debts.toArray();
    return debts.sort((left, right) => right.originatedAt.localeCompare(left.originatedAt));
  }

  async getDebt(id: string): Promise<Debt | undefined> {
    return getDb().debts.get(id);
  }

  async createDebt(input: NewDebt): Promise<Debt> {
    assertDebtType(input.debtType);
    assertPositiveAmount(input.principalAmount, "principalAmount");

    const now = new Date().toISOString();
    const debt: Debt = {
      ...input,
      id: generateId(),
      principalAmount: Math.abs(input.principalAmount),
      settledAmount: 0,
      remainingAmount: Math.abs(input.principalAmount),
      isCompleted: false,
      completedAt: undefined,
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
      syncedAt: null,
    };

    await getDb().debts.add(debt);
    return debt;
  }

  async updateDebt(debt: Debt): Promise<Debt> {
    assertDebtType(debt.debtType);
    assertPositiveAmount(debt.principalAmount, "principalAmount");

    const existing = await getDb().debts.get(debt.id);
    if (!existing) {
      throw new Error("Debt not found");
    }

    const settlements = await this.getSettlements(debt.id);
    const aggregate = recomputeDebt(
      {
        ...debt,
        principalAmount: Math.abs(debt.principalAmount),
      },
      settlements,
    );

    const updated: Debt = {
      ...debt,
      principalAmount: Math.abs(debt.principalAmount),
      ...aggregate,
      updatedAt: new Date().toISOString(),
      syncVersion: (existing.syncVersion || 0) + 1,
      syncedAt: null,
    };

    await getDb().debts.put(updated);
    return updated;
  }

  async deleteDebt(id: string): Promise<void> {
    await getDb().transaction(
      "rw",
      getDb().debts,
      getDb().debtSettlements,
      getDb().transactions,
      getDb()._pendingChanges,
      async () => {
        await deleteDebtWithSettlements(id);
      },
    );
  }

  async getSettlements(debtId: string): Promise<DebtSettlement[]> {
    const settlements = await getDb().debtSettlements.where("debtId").equals(debtId).toArray();
    return settlements.sort((left, right) => right.settledAt.localeCompare(left.settledAt));
  }

  async addSettlement(debtId: string, input: DebtSettlementInput): Promise<DebtSettlement> {
    assertPositiveAmount(input.amount);

    return getDb().transaction(
      "rw",
      getDb().debts,
      getDb().debtSettlements,
      getDb().transactions,
      getDb().accounts,
      async () => {
        const debt = await getDb().debts.get(debtId);
        if (!debt) {
          throw new Error("Debt not found");
        }

        assertDebtType(debt.debtType);

        const settlementAmount = Math.abs(input.amount);
        const transactionInput: NewTransaction = {
          note: buildDebtSettlementTransactionNote(debt, input.note),
          amount: buildDebtSettlementTransactionAmount(debt.debtType, settlementAmount),
          category: getDebtSettlementCategory(debt.debtType),
          account: input.accountId,
          currency: debt.currency,
          date: input.settledAt,
          excludeReport: false,
          source: "debt_settlement",
        };

        const transaction = await this.transactionAdapter.addTransaction(transactionInput);
        const duplicate = await getDb().debtSettlements
          .where("transactionId")
          .equals(transaction.id)
          .first();
        if (duplicate) {
          throw new Error("Settlement transaction already linked");
        }

        const now = new Date().toISOString();
        const settlement: DebtSettlement = {
          id: generateId(),
          debtId,
          transactionId: transaction.id,
          accountId: input.accountId,
          amount: settlementAmount,
          settledAt: input.settledAt,
          note: input.note,
          createdAt: now,
          updatedAt: now,
          syncVersion: 1,
          syncedAt: null,
        };

        await getDb().debtSettlements.add(settlement);
        await reconcileDebtFromSettlements(debtId);
        return settlement;
      },
    );
  }

  async deleteSettlement(id: string): Promise<void> {
    await getDb().transaction(
      "rw",
      getDb().debts,
      getDb().debtSettlements,
      getDb().transactions,
      getDb()._pendingChanges,
      async () => {
        await deleteDebtSettlementById(id);
      },
    );
  }

  async reconcileDebtByTransactionId(transactionId: string): Promise<void> {
    await getDb().transaction(
      "rw",
      getDb().debts,
      getDb().debtSettlements,
      getDb()._pendingChanges,
      async () => {
        await reconcileDebtByTransactionId(transactionId);
      },
    );
  }
}
