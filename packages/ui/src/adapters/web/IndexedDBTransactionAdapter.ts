import type { ITransactionService } from "@/adapters/interfaces";
import type {
  Transaction,
  NewTransaction,
  TransactionFilter,
  ImportResult,
} from "@/types";
import { db, generateId } from "./database";
import type { Collection } from "dexie";

export class IndexedDBTransactionAdapter implements ITransactionService {
  async getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    let collection: Collection<Transaction, string> =
      db.transactions.toCollection();

    if (filter?.categories?.length) {
      collection = db.transactions
        .where("category")
        .anyOf(filter.categories);
    }

    let results = await collection.toArray();

    if (filter?.accounts?.length) {
      results = results.filter((t) => filter.accounts!.includes(t.account));
    }
    if (filter?.start_date) {
      results = results.filter((t) => t.date >= filter.start_date!);
    }
    if (filter?.end_date) {
      results = results.filter((t) => t.date <= filter.end_date!);
    }
    if (filter?.min_amount !== undefined) {
      results = results.filter((t) => t.amount >= filter.min_amount!);
    }
    if (filter?.max_amount !== undefined) {
      results = results.filter((t) => t.amount <= filter.max_amount!);
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

    const transaction: Transaction = {
      id: generateId(),
      source: tx.source || "manual",
      import_batch_id: tx.import_batch_id,
      note: tx.note,
      amount,
      category: tx.category,
      account: tx.account,
      currency: tx.currency,
      date,
      event: tx.event,
      exclude_report: tx.exclude_report,
      expense: amount < 0 ? Math.abs(amount) : 0,
      income: amount > 0 ? amount : 0,
      year_month: `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`,
      year: parsedDate.getFullYear(),
      month: parsedDate.getMonth() + 1,
      created_at: now,
      updated_at: now,
    };

    await db.transactions.add(transaction);
    return transaction;
  }

  async updateTransaction(tx: Transaction): Promise<Transaction> {
    const updated = {
      ...tx,
      updated_at: new Date().toISOString(),
    };
    await db.transactions.put(updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.transactions.delete(id);
  }

  async importTransactions(
    transactions: NewTransaction[],
    filename: string,
  ): Promise<ImportResult> {
    const batchId = Date.now();
    let importedCount = 0;
    let skippedCount = 0;

    await db.transaction("rw", db.transactions, db.importBatches, async () => {
      for (const tx of transactions) {
        try {
          const newTx: NewTransaction = {
            ...tx,
            source: "csv_import",
            import_batch_id: batchId,
          };
          await this.addTransaction(newTx);
          importedCount++;
        } catch {
          skippedCount++;
        }
      }

      await db.importBatches.add({
        id: batchId,
        filename,
        record_count: importedCount,
        imported_at: new Date().toISOString(),
      });
    });

    return {
      batch_id: batchId,
      imported_count: importedCount,
      skipped_count: skippedCount,
    };
  }
}
