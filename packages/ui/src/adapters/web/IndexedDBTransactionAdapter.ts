import type { ITransactionService } from "@money-insight/ui/adapters/factory/interfaces";
import type {
  Transaction,
  NewTransaction,
  TransactionFilter,
  ImportResult,
  Account,
  TransferParams,
} from "@money-insight/ui/types";
import { getDb, generateId } from "./database";
import { trackDelete } from "./indexedDbHelpers";
import { createTransferTransactions } from "../../services/transferService";
export class IndexedDBTransactionAdapter implements ITransactionService {
  async getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    let collection = getDb().transactions.toCollection();

    if (filter?.categories?.length) {
      collection = getDb().transactions.where("category").anyOf(filter.categories);
    }

    let results = await collection.toArray();

    if (filter?.accounts?.length) {
      results = results.filter((t) => filter.accounts!.includes(t.account));
    }
    if (filter?.startDate) {
      results = results.filter((t) => t.date >= filter.startDate!);
    }
    if (filter?.endDate) {
      results = results.filter((t) => t.date <= filter.endDate!);
    }
    if (filter?.minAmount !== undefined) {
      results = results.filter((t) => t.amount >= filter.minAmount!);
    }
    if (filter?.maxAmount !== undefined) {
      results = results.filter((t) => t.amount <= filter.maxAmount!);
    }
    if (filter?.source) {
      results = results.filter((t) => t.source === filter.source);
    }
    if (filter?.search?.trim()) {
      const term = filter.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.note?.toLowerCase().includes(term) ||
          t.category?.toLowerCase().includes(term) ||
          t.account?.toLowerCase().includes(term) ||
          t.event?.toLowerCase().includes(term) ||
          String(t.amount).includes(term),
      );
    }

    return results.sort((a, b) => b.date.localeCompare(a.date));
  }

  async addTransaction(tx: NewTransaction): Promise<Transaction> {
    const now = new Date().toISOString();
    const date = tx.date;
    const parsedDate = new Date(date);
    const amount = tx.amount;

    // Ensure account exists (for manual entry with new account names)
    if (tx.account?.trim()) {
      await this.ensureAccountsExist([tx]);
    }

    const transaction: Transaction = {
      id: generateId(),
      source: tx.source || "manual",
      importBatchId: tx.importBatchId,
      transferId: tx.transferId,
      note: tx.note,
      amount,
      category: tx.category,
      account: tx.account,
      currency: tx.currency,
      date,
      event: tx.event,
      excludeReport: tx.excludeReport,
      expense: amount < 0 ? Math.abs(amount) : 0,
      income: amount > 0 ? amount : 0,
      yearMonth: `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`,
      year: parsedDate.getFullYear(),
      month: parsedDate.getMonth() + 1,
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
      syncedAt: null,
    };

    await getDb().transactions.add(transaction);
    return transaction;
  }

  async updateTransaction(tx: Transaction): Promise<Transaction> {
    const existing = await getDb().transactions.get(tx.id);

    // Dev-only guard: warn if a transfer leg is updated without its counterpart.
    // Type cast is intentional: packages/ui tsconfig uses react-library (no vite/client types).
    // import.meta.env.DEV resolves to false in production builds and is tree-shaken by Vite.
    const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV;
    if (
      isDev &&
      (tx.source === "transfer" || existing?.source === "transfer") &&
      (tx.transferId || existing?.transferId)
    ) {
      const transferId = tx.transferId ?? existing?.transferId;
      if (transferId) {
        const pairCount = await getDb().transactions
          .where("transferId")
          .equals(transferId)
          .count();
        if (pairCount < 2) {
          console.warn(
            `[money-insight] updateTransaction on transfer leg (id=${tx.id}, transferId=${transferId}) ` +
              `but only ${pairCount} leg(s) in DB. Use updateTransfer() to keep both legs consistent.`,
          );
        }
      }
    }

    const updated = {
      ...tx,
      updatedAt: new Date().toISOString(),
      syncVersion: (existing?.syncVersion || 0) + 1,
      syncedAt: null,
    };
    await getDb().transactions.put(updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    const existing = await getDb().transactions.get(id);
    if (existing) {
      await trackDelete("transactions", id, existing.syncVersion || 0);
    }
    await getDb().transactions.delete(id);
  }

  async importTransactions(
    transactions: NewTransaction[],
    filename: string,
  ): Promise<ImportResult> {
    const batchId = Date.now();
    let importedCount = 0;
    let skippedCount = 0;

    await getDb().transaction(
      "rw",
      getDb().transactions,
      getDb().importBatches,
      getDb().accounts,
      async () => {
        // Auto-create missing accounts from imported transactions
        await this.ensureAccountsExist(transactions);

        for (const tx of transactions) {
          try {
            const newTx: NewTransaction = {
              ...tx,
              source: "csv_import",
              importBatchId: batchId,
            };
            await this.addTransaction(newTx);
            importedCount++;
          } catch {
            skippedCount++;
          }
        }

        await getDb().importBatches.add({
          id: batchId,
          filename,
          recordCount: importedCount,
          importedAt: new Date().toISOString(),
        });
      },
    );

    return {
      batchId: batchId,
      importedCount: importedCount,
      skippedCount: skippedCount,
    };
  }

  /**
   * Ensure all account names from transactions exist in the accounts table.
   * Creates missing accounts automatically with default values.
   */
  private async ensureAccountsExist(
    transactions: NewTransaction[],
  ): Promise<void> {
    // Extract unique account names from transactions
    const accountNames = new Set<string>();
    for (const tx of transactions) {
      if (tx.account?.trim()) {
        accountNames.add(tx.account.trim());
      }
    }

    // Get existing accounts
    const existingAccounts = await getDb().accounts.toArray();
    const existingNames = new Set(existingAccounts.map((a) => a.name));

    // Create missing accounts
    const now = new Date().toISOString();
    for (const accountName of accountNames) {
      if (!existingNames.has(accountName)) {
        // Determine account type and icon based on name
        const { accountType, icon } = this.inferAccountType(accountName);

        const newAccount: Account = {
          id: generateId(),
          name: accountName,
          accountType,
          icon,
          initialBalance: 0, // Default to 0, user can update later
          currency: "VND", // Default currency
          createdAt: now,
          updatedAt: now,
          syncVersion: 1,
          syncedAt: null,
        };

        await getDb().accounts.add(newAccount);
      }
    }
  }

  async createTransfer(
    params: TransferParams,
  ): Promise<{ outgoing: Transaction; incoming: Transaction }> {
    const transferId = generateId();
    const { outgoing: outTx, incoming: inTx } = createTransferTransactions({
      ...params,
      transferId,
    });

    return getDb().transaction("rw", getDb().transactions, getDb().accounts, async () => {
      await this.ensureAccountsExist([outTx, inTx]);
      const outgoing = await this.addTransaction(outTx);
      const incoming = await this.addTransaction(inTx);
      return { outgoing, incoming };
    });
  }

  async updateTransfer(
    transferId: string,
    params: TransferParams,
  ): Promise<{ outgoing: Transaction; incoming: Transaction }> {
    const { outgoing: newOutTx, incoming: newInTx } =
      createTransferTransactions({ ...params, transferId });

    return getDb().transaction("rw", getDb().transactions, getDb().accounts, async () => {
      const pair = await getDb().transactions
        .where("transferId")
        .equals(transferId)
        .toArray();

      const outgoing = pair.find((t) => t.amount < 0);
      const incoming = pair.find((t) => t.amount > 0);

      if (!outgoing || !incoming) {
        throw new Error(
          `Transfer pair incomplete for transferId: ${transferId}`,
        );
      }

      await this.ensureAccountsExist([newOutTx, newInTx]);

      // Recalculate derived fields that NewTransaction omits but Transaction requires.
      // Without this, expense/income and date-bucketing fields stay stale after edits.
      const parsedDate = new Date(params.date);
      const yearMonth = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`;
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth() + 1;

      const updatedOut = await this.updateTransaction({
        ...outgoing,
        ...newOutTx,
        id: outgoing.id,
        expense: Math.abs(params.amount),
        income: 0,
        yearMonth,
        year,
        month,
      });
      const updatedIn = await this.updateTransaction({
        ...incoming,
        ...newInTx,
        id: incoming.id,
        expense: 0,
        income: params.amount,
        yearMonth,
        year,
        month,
      });
      return { outgoing: updatedOut, incoming: updatedIn };
    });
  }

  async deleteTransfer(transferId: string): Promise<void> {
    await getDb().transaction(
      "rw",
      getDb().transactions,
      getDb()._pendingChanges,
      async () => {
        const pair = await getDb().transactions
          .where("transferId")
          .equals(transferId)
          .toArray();

        if (pair.length === 0) return;
        if (pair.length !== 2) {
          console.warn(
            `deleteTransfer: expected 2 legs, found ${pair.length} for transferId ${transferId}`,
          );
        }

        for (const tx of pair) {
          await trackDelete("transactions", tx.id, tx.syncVersion || 0);
          await getDb().transactions.delete(tx.id);
        }
      },
    );
  }

  async getTransferPair(transferId: string): Promise<Transaction[]> {
    return getDb().transactions.where("transferId").equals(transferId).toArray();
  }

  /**
   * Infer account type and icon from account name
   */
  private inferAccountType(name: string): {
    accountType: string;
    icon: string;
  } {
    const lowerName = name.toLowerCase();

    if (
      lowerName.includes("credit") ||
      lowerName.includes("card") ||
      lowerName.includes("visa") ||
      lowerName.includes("mastercard")
    ) {
      return { accountType: "Credit Card", icon: "💳" };
    } else if (
      lowerName.includes("bank") ||
      lowerName.includes("checking") ||
      lowerName.includes("savings")
    ) {
      return { accountType: "Bank Account", icon: "🏦" };
    } else if (
      lowerName.includes("invest") ||
      lowerName.includes("stock") ||
      lowerName.includes("portfolio")
    ) {
      return { accountType: "Investment", icon: "📊" };
    } else if (lowerName.includes("save")) {
      return { accountType: "Savings", icon: "💎" };
    } else if (lowerName.includes("cash") || lowerName.includes("wallet")) {
      return { accountType: "Cash", icon: "💰" };
    }

    // Default to Cash
    return { accountType: "Cash", icon: "💰" };
  }
}
