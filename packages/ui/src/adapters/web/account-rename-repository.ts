import type { Account } from "@money-insight/ui/types";
import { renameTransferAccountInNote } from "../../services/transferService";
import { getDb } from "./database";

export async function assertUniqueAccountName(
  accountId: string,
  name: string,
): Promise<void> {
  const normalizedName = name.toLocaleLowerCase();
  const duplicate = (await getDb().accounts.toArray()).find(
    (candidate) =>
      candidate.id !== accountId &&
      candidate.name.trim().toLocaleLowerCase() === normalizedName,
  );
  if (duplicate) {
    throw new Error(`An account named "${duplicate.name}" already exists`);
  }
}

export async function renameAccountReferences(
  existing: Account,
  name: string,
  now: string,
): Promise<void> {
  if (existing.name === name) return;
  const db = getDb();
  const matchingTransactions = await db.transactions
    .where("account")
    .equals(existing.name)
    .toArray();
  const transferTransactions = await db.transactions
    .where("source")
    .equals("transfer")
    .toArray();
  const transactionsToUpdate = new Map(
    matchingTransactions.map((transaction) => [transaction.id, transaction]),
  );

  for (const transaction of transferTransactions) {
    const renamedNote = renameTransferAccountInNote(
      transaction.note,
      existing.name,
      name,
    );
    if (renamedNote !== transaction.note) {
      transactionsToUpdate.set(transaction.id, transaction);
    }
  }

  const updatedTransactions = Array.from(transactionsToUpdate.values()).map(
    (transaction) => ({
      ...transaction,
      account:
        transaction.account === existing.name ? name : transaction.account,
      note:
        transaction.source === "transfer"
          ? renameTransferAccountInNote(transaction.note, existing.name, name)
          : transaction.note,
      updatedAt: now,
      syncVersion: (transaction.syncVersion || 0) + 1,
      syncedAt: null,
    }),
  );
  if (updatedTransactions.length > 0) {
    await db.transactions.bulkPut(updatedTransactions);
  }

  const [debts, debtSettlements, budgets] = await Promise.all([
    db.debts.where("accountId").equals(existing.name).toArray(),
    db.debtSettlements.where("accountId").equals(existing.name).toArray(),
    db.budgets.toArray(),
  ]);
  const updatedDebts = debts.map((debt) => ({
    ...debt,
    accountId: name,
    updatedAt: now,
    syncVersion: (debt.syncVersion || 0) + 1,
    syncedAt: null,
  }));
  const updatedSettlements = debtSettlements.map((settlement) => ({
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

  if (updatedDebts.length > 0) await db.debts.bulkPut(updatedDebts);
  if (updatedSettlements.length > 0) {
    await db.debtSettlements.bulkPut(updatedSettlements);
  }
  if (updatedBudgets.length > 0) await db.budgets.bulkPut(updatedBudgets);
}
