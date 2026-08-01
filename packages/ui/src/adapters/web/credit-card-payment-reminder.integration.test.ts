import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  advancePaymentDueDate,
  deriveNextPaymentDueDate,
  getLocalIsoDate,
} from "../../lib/credit-card-payment-reminder";
import { IndexedDBAccountAdapter } from "./IndexedDBAccountAdapter";
import { IndexedDBTransactionAdapter } from "./IndexedDBTransactionAdapter";
import { deleteCurrentDb, getDb, initDb } from "./database";

const accountAdapter = new IndexedDBAccountAdapter();
const transactionAdapter = new IndexedDBTransactionAdapter();
const paymentDate = getLocalIsoDate();
const expectedDueDate = deriveNextPaymentDueDate(31, paymentDate);
const followingDueDate = advancePaymentDueDate(expectedDueDate, 31);

async function addCreditCard(name: string, initialBalance = -500) {
  return accountAdapter.addAccount({
    name,
    accountType: "Credit Card",
    initialBalance,
    currency: "VND",
    paymentDueDay: 31,
    paymentReminderEnabled: true,
  });
}

describe("credit card payment reminder persistence", () => {
  beforeEach(async () => {
    await initDb();
  });

  afterEach(async () => {
    await deleteCurrentDb();
  });

  it("creates, suppresses, and recreates one Account reminder from balance", async () => {
    const first = await addCreditCard("First card");
    const second = await addCreditCard("Second card", -200);
    expect(first.nextPaymentDueDate).toBe(expectedDueDate);
    expect(await getDb().notificationEvents.count()).toBe(2);

    await transactionAdapter.addTransaction({
      note: "Manual card payment",
      amount: 500,
      category: "Payment",
      account: first.name,
      currency: "VND",
      date: paymentDate,
      excludeReport: true,
      source: "manual",
    });
    const afterClear = await getDb().notificationEvents.toArray();
    expect(afterClear).toHaveLength(1);
    expect(afterClear[0].sourceRowId).toBe(second.id);

    await transactionAdapter.addTransaction({
      note: "New purchase",
      amount: -100,
      category: "Shopping",
      account: first.name,
      currency: "VND",
      date: paymentDate,
      excludeReport: false,
      source: "manual",
    });
    const afterPurchase = await getDb().notificationEvents.toArray();
    expect(afterPurchase).toHaveLength(2);
    expect(
      afterPurchase.filter((event) => event.sourceRowId === first.id),
    ).toHaveLength(1);
  });

  it("confirms with a paired transfer and does not advance twice", async () => {
    const funding = await accountAdapter.addAccount({
      name: "Cash",
      accountType: "Cash",
      initialBalance: 1000,
      currency: "VND",
    });
    const card = await addCreditCard("Daily card");
    const input = {
      accountId: card.id,
      expectedDueDate,
      fundingAccountId: funding.id,
      amount: 500,
      paymentDate,
    };

    const first = await accountAdapter.confirmCreditCardPayment(input);
    expect(first).toMatchObject({
      alreadyConfirmed: false,
      account: {
        nextPaymentDueDate: followingDueDate,
        lastPaymentConfirmedDueDate: expectedDueDate,
        syncVersion: 2,
      },
    });
    expect(await getDb().transactions.count()).toBe(2);
    expect(await getDb().notificationEvents.count()).toBe(0);

    const repeated = await accountAdapter.confirmCreditCardPayment(input);
    expect(repeated).toMatchObject({
      alreadyConfirmed: true,
      account: { nextPaymentDueDate: followingDueDate },
    });
    expect(await getDb().transactions.count()).toBe(2);
  });

  it("rejects a partial payment without changing the cycle", async () => {
    const funding = await accountAdapter.addAccount({
      name: "Cash",
      initialBalance: 1000,
      currency: "VND",
    });
    const card = await addCreditCard("Daily card");

    await expect(
      accountAdapter.confirmCreditCardPayment({
        accountId: card.id,
        expectedDueDate,
        fundingAccountId: funding.id,
        amount: 499,
        paymentDate,
      }),
    ).rejects.toThrow("must clear");
    expect(await getDb().transactions.count()).toBe(0);
    expect(await getDb().accounts.get(card.id)).toMatchObject({
      nextPaymentDueDate: expectedDueDate,
      syncVersion: 1,
    });
    expect(await getDb().notificationEvents.count()).toBe(1);
  });

  it("rolls back the transfer when the Account cycle write fails", async () => {
    const funding = await accountAdapter.addAccount({
      name: "Cash",
      initialBalance: 1000,
      currency: "VND",
    });
    const card = await addCreditCard("Daily card");
    vi.spyOn(getDb().accounts, "put").mockRejectedValueOnce(
      new Error("account write failed"),
    );

    await expect(
      accountAdapter.confirmCreditCardPayment({
        accountId: card.id,
        expectedDueDate,
        fundingAccountId: funding.id,
        amount: 500,
        paymentDate,
      }),
    ).rejects.toThrow("account write failed");
    expect(await getDb().transactions.count()).toBe(0);
    expect(await getDb().notificationEvents.count()).toBe(1);
    expect(await getDb().accounts.get(card.id)).toMatchObject({
      nextPaymentDueDate: expectedDueDate,
      syncVersion: 1,
    });
  });
});
