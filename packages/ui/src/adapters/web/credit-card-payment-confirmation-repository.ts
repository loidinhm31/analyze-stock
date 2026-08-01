import type {
  Account,
  CreditCardPaymentConfirmationInput,
  CreditCardPaymentConfirmationResult,
} from "@money-insight/ui/types";
import {
  advancePaymentDueDate,
  calculateAccountBalance,
  parseIsoDate,
} from "@money-insight/ui/lib";
import { getDb } from "./database";
import { IndexedDBTransactionAdapter } from "./IndexedDBTransactionAdapter";
import { reconcileCreditCardPaymentReminder } from "./credit-card-payment-reminder-repository";

function assertConfirmableAccount(
  account: Account,
): asserts account is Account & {
  paymentDueDay: number;
  nextPaymentDueDate: string;
} {
  if (
    account.accountType !== "Credit Card" ||
    account.paymentReminderEnabled !== true ||
    account.paymentDueDay === undefined ||
    !account.nextPaymentDueDate
  ) {
    throw new Error("Credit card payment reminder is not active");
  }
}

export async function confirmCreditCardPayment(
  input: CreditCardPaymentConfirmationInput,
): Promise<CreditCardPaymentConfirmationResult> {
  parseIsoDate(input.expectedDueDate);
  parseIsoDate(input.paymentDate);
  const db = getDb();

  return db.transaction(
    "rw",
    [db.accounts, db.transactions, db.notificationEvents, db._pendingChanges],
    async () => {
      const account = await db.accounts.get(input.accountId);
      if (!account) throw new Error("Account not found");
      if (account.lastPaymentConfirmedDueDate === input.expectedDueDate) {
        return { alreadyConfirmed: true, account };
      }
      assertConfirmableAccount(account);
      if (account.nextPaymentDueDate !== input.expectedDueDate) {
        throw new Error("Payment due cycle changed; refresh and try again");
      }

      const fundingAccount = await db.accounts.get(input.fundingAccountId);
      if (!fundingAccount) throw new Error("Funding account not found");
      if (fundingAccount.id === account.id) {
        throw new Error(
          "Funding account must be different from the credit card",
        );
      }
      if (fundingAccount.currency !== account.currency) {
        throw new Error("Funding account currency must match the credit card");
      }
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new Error("Payment amount must be positive");
      }

      const transactions = await db.transactions
        .where("account")
        .equals(account.name)
        .toArray();
      const balance = calculateAccountBalance(account, transactions);
      if (balance >= 0)
        throw new Error("Credit card balance is already cleared");
      if (balance + input.amount < 0) {
        throw new Error("Payment amount must clear the credit card balance");
      }

      const transfer = await new IndexedDBTransactionAdapter().createTransfer({
        fromAccount: fundingAccount.name,
        toAccount: account.name,
        amount: input.amount,
        date: input.paymentDate,
        note: input.note?.trim() || `Credit card payment: ${account.name}`,
        currency: account.currency,
        excludeReport: true,
      });
      const confirmedAt = new Date().toISOString();
      const updated: Account = {
        ...account,
        nextPaymentDueDate: advancePaymentDueDate(
          account.nextPaymentDueDate,
          account.paymentDueDay,
        ),
        lastPaymentConfirmedDueDate: input.expectedDueDate,
        lastPaymentConfirmedAt: confirmedAt,
        updatedAt: confirmedAt,
        syncVersion: (account.syncVersion || 0) + 1,
        syncedAt: null,
      };
      await db.accounts.put(updated);
      await reconcileCreditCardPaymentReminder(updated);

      return {
        alreadyConfirmed: false,
        account: updated,
        ...transfer,
      };
    },
  );
}
