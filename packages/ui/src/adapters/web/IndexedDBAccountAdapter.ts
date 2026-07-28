import type { IAccountService } from "@money-insight/ui/adapters/factory/interfaces";
import type { Account, NewAccount } from "@money-insight/ui/types";
import { getDb, generateId } from "./database";
import { trackDelete } from "./indexedDbHelpers";
import { renameTransferAccountInNote } from "../../services/transferService";

export class IndexedDBAccountAdapter implements IAccountService {
  async getAccounts(): Promise<Account[]> {
    return getDb().accounts.toArray();
  }

  async addAccount(account: NewAccount): Promise<Account> {
    const now = new Date().toISOString();
    const newAccount: Account = {
      id: generateId(),
      ...account,
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
      syncedAt: null,
    };
    await getDb().accounts.add(newAccount);
    return newAccount;
  }

  async updateAccount(account: Account): Promise<Account> {
    const db = getDb();

    return db.transaction(
      "rw",
      [db.accounts, db.transactions, db.debts, db.debtSettlements, db.budgets],
      async () => {
        const existing = await db.accounts.get(account.id);
        if (!existing) {
          throw new Error("Account not found");
        }

        const name = account.name.trim();
        if (!name) {
          throw new Error("Account name is required");
        }

        const normalizedName = name.toLocaleLowerCase();
        const accounts = await db.accounts.toArray();
        const duplicate = accounts.find(
          (candidate) =>
            candidate.id !== account.id &&
            candidate.name.trim().toLocaleLowerCase() === normalizedName,
        );
        if (duplicate) {
          throw new Error(
            `An account named "${duplicate.name}" already exists`,
          );
        }

        const now = new Date().toISOString();
        const updated: Account = {
          ...account,
          name,
          createdAt: existing.createdAt,
          updatedAt: now,
          syncVersion: (existing.syncVersion || 0) + 1,
          syncedAt: null,
        };

        if (existing.name !== name) {
          const matchingTransactions = await db.transactions
            .where("account")
            .equals(existing.name)
            .toArray();
          const transferTransactions = await db.transactions
            .where("source")
            .equals("transfer")
            .toArray();
          const transactionsToUpdate = new Map(
            matchingTransactions.map((transaction) => [
              transaction.id,
              transaction,
            ]),
          );

          for (const transaction of transferTransactions) {
            const note = renameTransferAccountInNote(
              transaction.note,
              existing.name,
              name,
            );
            if (note !== transaction.note) {
              transactionsToUpdate.set(transaction.id, transaction);
            }
          }

          const updatedTransactions = Array.from(
            transactionsToUpdate.values(),
          ).map((transaction) => ({
            ...transaction,
            account:
              transaction.account === existing.name
                ? name
                : transaction.account,
            note:
              transaction.source === "transfer"
                ? renameTransferAccountInNote(
                    transaction.note,
                    existing.name,
                    name,
                  )
                : transaction.note,
            updatedAt: now,
            syncVersion: (transaction.syncVersion || 0) + 1,
            syncedAt: null,
          }));

          if (updatedTransactions.length > 0) {
            await db.transactions.bulkPut(updatedTransactions);
          }

          const [debts, debtSettlements, budgets] = await Promise.all([
            db.debts.where("accountId").equals(existing.name).toArray(),
            db.debtSettlements
              .where("accountId")
              .equals(existing.name)
              .toArray(),
            db.budgets.toArray(),
          ]);
          const updatedDebts = debts.map((debt) => ({
            ...debt,
            accountId: name,
            updatedAt: now,
            syncVersion: (debt.syncVersion || 0) + 1,
            syncedAt: null,
          }));
          const updatedDebtSettlements = debtSettlements.map((settlement) => ({
            ...settlement,
            accountId: name,
            updatedAt: now,
            syncVersion: (settlement.syncVersion || 0) + 1,
            syncedAt: null,
          }));
          const updatedBudgets = budgets
            .filter((budget) => budget.accountNames.includes(existing.name))
            .map((budget) => ({
              ...budget,
              accountNames: budget.accountNames.map((accountName) =>
                accountName === existing.name ? name : accountName,
              ),
              updatedAt: now,
              syncVersion: (budget.syncVersion || 0) + 1,
              syncedAt: null,
            }));

          if (updatedDebts.length > 0) {
            await db.debts.bulkPut(updatedDebts);
          }
          if (updatedDebtSettlements.length > 0) {
            await db.debtSettlements.bulkPut(updatedDebtSettlements);
          }
          if (updatedBudgets.length > 0) {
            await db.budgets.bulkPut(updatedBudgets);
          }
        }

        await db.accounts.put(updated);
        return updated;
      },
    );
  }

  async deleteAccount(id: string): Promise<void> {
    const existing = await getDb().accounts.get(id);
    if (existing) {
      await trackDelete("accounts", id, existing.syncVersion || 0);
    }
    await getDb().accounts.delete(id);
  }
}
