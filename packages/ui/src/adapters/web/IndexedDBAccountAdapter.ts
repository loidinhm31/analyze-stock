import type { IAccountService } from "@/adapters/interfaces";
import type { Account } from "@/types";
import { db } from "./database";

export class IndexedDBAccountAdapter implements IAccountService {
  async getAccounts(): Promise<Account[]> {
    // Derive accounts from existing transactions
    const transactions = await db.transactions.toArray();
    const accountSet = new Set<string>();

    for (const tx of transactions) {
      accountSet.add(tx.account);
    }

    // Also include any manually created accounts
    const storedAccounts = await db.accounts.toArray();
    for (const acc of storedAccounts) {
      accountSet.add(acc.name);
    }

    return Array.from(accountSet).map((name, index) => ({
      id: index + 1,
      name,
    }));
  }
}
