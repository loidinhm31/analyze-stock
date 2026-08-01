import type { IAccountService } from "@money-insight/ui/adapters/factory/interfaces";
import type {
  Account,
  CreditCardPaymentConfirmationInput,
  CreditCardPaymentConfirmationResult,
  NewAccount,
} from "@money-insight/ui/types";
import {
  getLocalIsoDate,
  normalizeCreditCardPaymentReminder,
} from "@money-insight/ui/lib";
import { getDb, generateId } from "./database";
import { trackDelete } from "./indexedDbHelpers";
import {
  assertUniqueAccountName,
  renameAccountReferences,
} from "./account-rename-repository";
import {
  reconcileCreditCardPaymentReminder,
  removeUnsyncedCreditCardPaymentReminderEvents,
} from "./credit-card-payment-reminder-repository";
import { confirmCreditCardPayment } from "./credit-card-payment-confirmation-repository";

export class IndexedDBAccountAdapter implements IAccountService {
  async getAccounts(): Promise<Account[]> {
    return getDb().accounts.toArray();
  }

  async addAccount(account: NewAccount): Promise<Account> {
    const db = getDb();
    return db.transaction(
      "rw",
      [db.accounts, db.transactions, db.notificationEvents, db._pendingChanges],
      async () => {
        const name = account.name.trim();
        if (!name) throw new Error("Account name is required");
        const id = generateId();
        await assertUniqueAccountName(id, name);

        const now = new Date();
        const timestamp = now.toISOString();
        const newAccount: Account = {
          id,
          ...account,
          ...normalizeCreditCardPaymentReminder(
            { ...account, name },
            undefined,
            getLocalIsoDate(now),
          ),
          name,
          createdAt: timestamp,
          updatedAt: timestamp,
          syncVersion: 1,
          syncedAt: null,
        };
        await db.accounts.add(newAccount);
        await reconcileCreditCardPaymentReminder(newAccount);
        return newAccount;
      },
    );
  }

  async updateAccount(account: Account): Promise<Account> {
    const db = getDb();

    return db.transaction(
      "rw",
      [
        db.accounts,
        db.transactions,
        db.debts,
        db.debtSettlements,
        db.budgets,
        db.notificationEvents,
        db._pendingChanges,
      ],
      async () => {
        const existing = await db.accounts.get(account.id);
        if (!existing) {
          throw new Error("Account not found");
        }

        const name = account.name.trim();
        if (!name) {
          throw new Error("Account name is required");
        }

        await assertUniqueAccountName(account.id, name);

        const now = new Date();
        const timestamp = now.toISOString();
        const updated: Account = {
          ...account,
          ...normalizeCreditCardPaymentReminder(
            { ...account, name },
            existing,
            getLocalIsoDate(now),
          ),
          name,
          createdAt: existing.createdAt,
          updatedAt: timestamp,
          syncVersion: (existing.syncVersion || 0) + 1,
          syncedAt: null,
        };

        await renameAccountReferences(existing, name, timestamp);
        await db.accounts.put(updated);
        await reconcileCreditCardPaymentReminder(updated);
        return updated;
      },
    );
  }

  async deleteAccount(id: string): Promise<void> {
    const db = getDb();
    await db.transaction(
      "rw",
      [db.accounts, db.notificationEvents, db._pendingChanges],
      async () => {
        const existing = await db.accounts.get(id);
        if (existing) {
          await trackDelete("accounts", id, existing.syncVersion || 0);
          await removeUnsyncedCreditCardPaymentReminderEvents(id);
        }
        await db.accounts.delete(id);
      },
    );
  }

  async confirmCreditCardPayment(
    input: CreditCardPaymentConfirmationInput,
  ): Promise<CreditCardPaymentConfirmationResult> {
    return confirmCreditCardPayment(input);
  }
}
