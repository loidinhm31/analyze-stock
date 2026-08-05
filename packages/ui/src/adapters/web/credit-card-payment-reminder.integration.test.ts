import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  advancePaymentCycleStartDate,
  deriveCreditCardStatementDates,
  getLocalIsoDate,
} from "../../lib/credit-card-payment-reminder";
import {
  reconcileCreditCardPaymentReminder,
  reconcileCreditCardPaymentRemindersByAccountNames,
  removeCreditCardPaymentReminderEvents,
} from "./credit-card-payment-reminder-repository";
import { IndexedDBAccountAdapter } from "./IndexedDBAccountAdapter";
import { IndexedDBTransactionAdapter } from "./IndexedDBTransactionAdapter";
import { deleteCurrentDb, getDb, initDb } from "./database";

const accountAdapter = new IndexedDBAccountAdapter();
const transactionAdapter = new IndexedDBTransactionAdapter();
const cycleStartDate = "2026-06-15";
const issueDate = "2026-07-14";
const postIssueDate = "2026-07-15";
const paymentDate = getLocalIsoDate();
const interestFreeDays = 55;
const expectedDueDate = deriveCreditCardStatementDates(
  cycleStartDate,
  interestFreeDays,
).payment_due_date;
const followingCycleStartDate = advancePaymentCycleStartDate(
  cycleStartDate,
  15,
);
const followingDueDate = deriveCreditCardStatementDates(
  followingCycleStartDate,
  interestFreeDays,
).payment_due_date;

async function addCreditCard(name: string, initialBalance = 0) {
  return accountAdapter.addAccount({
    name,
    accountType: "Credit Card",
    initialBalance,
    currency: "VND",
    paymentCycleStartDate: cycleStartDate,
    paymentCycleStartDay: 15,
    interestFreeDays,
    paymentReminderEnabled: true,
  });
}

async function addCardTransaction(
  account: { name: string },
  amount: number,
  date = cycleStartDate,
) {
  return transactionAdapter.addTransaction({
    note: amount < 0 ? "Card purchase" : "Manual card payment",
    amount,
    category: amount < 0 ? "Shopping" : "Payment",
    account: account.name,
    currency: "VND",
    date,
    excludeReport: amount > 0,
    source: "manual",
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
    const second = await addCreditCard("Second card");
    expect(first.nextPaymentDueDate).toBe(expectedDueDate);
    expect(await getDb().notificationEvents.count()).toBe(0);
    await addCardTransaction(first, -500);
    await addCardTransaction(second, -200);
    expect(await getDb().notificationEvents.count()).toBe(2);

    await addCardTransaction(first, 500, issueDate);
    const afterClear = await getDb().notificationEvents.toArray();
    expect(afterClear).toHaveLength(1);
    expect(afterClear[0].sourceRowId).toBe(second.id);

    await addCardTransaction(first, -100, issueDate);
    const afterPurchase = await getDb().notificationEvents.toArray();
    expect(afterPurchase).toHaveLength(2);
    expect(
      afterPurchase.filter((event) => event.sourceRowId === first.id),
    ).toHaveLength(1);
  });

  it("reconciles retryable reminder rows without duplicating or preserving stale events", async () => {
    const card = await addCreditCard("Retryable card");
    await addCardTransaction(card, -500);
    const original = (await getDb().notificationEvents.toArray()).find(
      (event) => event.sourceRowId === card.id,
    );
    expect(original).toBeDefined();

    await getDb().notificationEvents.update(original!.id, { status: "failed" });
    const matched = await reconcileCreditCardPaymentReminder(card);
    expect(matched?.id).toBe(original!.id);
    expect(await getDb().notificationEvents.count()).toBe(1);

    await getDb().notificationEvents.update(original!.id, {
      status: "processing",
    });
    await addCardTransaction(card, 500, issueDate);

    expect(await getDb().notificationEvents.count()).toBe(0);
  });

  it("reuses current sent rows and replaces superseded or stale-source rows", async () => {
    const card = await addCreditCard("Lifecycle card");
    await addCardTransaction(card, -500);
    const original = (await getDb().notificationEvents.toArray()).find(
      (event) => event.sourceRowId === card.id,
    );
    expect(original).toBeDefined();

    await getDb().notificationEvents.update(original!.id, { status: "sent" });
    const sent = await reconcileCreditCardPaymentReminder(card);
    expect(sent?.id).toBe(original!.id);
    expect(await getDb().notificationEvents.count()).toBe(1);

    await getDb().notificationEvents.update(original!.id, {
      status: "failed",
      terminal: true,
    });
    const terminalReplacement = await reconcileCreditCardPaymentReminder(card);
    expect(terminalReplacement?.id).not.toBe(original!.id);
    expect(await getDb().notificationEvents.count()).toBe(1);

    await getDb().notificationEvents.update(terminalReplacement!.id, {
      status: "superseded",
      terminal: false,
    });
    const replacement = await reconcileCreditCardPaymentReminder(card);
    expect(replacement?.id).not.toBe(terminalReplacement!.id);
    expect(await getDb().notificationEvents.count()).toBe(1);

    await getDb().notificationEvents.update(replacement!.id, {
      sourceVersion: card.syncVersion - 1,
    });
    const staleReplacement = await reconcileCreditCardPaymentReminder(card);
    expect(staleReplacement?.id).not.toBe(replacement!.id);
    expect(await getDb().notificationEvents.count()).toBe(1);
  });

  it("removes a reminder when a remote account stops being a credit card", async () => {
    const card = await addCreditCard("Converted card");
    await addCardTransaction(card, -500);
    await getDb().accounts.put({
      ...card,
      accountType: "Cash",
      paymentReminderEnabled: false,
      syncVersion: card.syncVersion + 1,
    });

    await reconcileCreditCardPaymentRemindersByAccountNames([card.name]);

    expect(await getDb().notificationEvents.count()).toBe(0);
  });

  it("scopes reminder cleanup to account source rows", async () => {
    const card = await addCreditCard("Cleanup card");
    await addCardTransaction(card, -500);
    const reminder = (await getDb().notificationEvents.toArray()).find(
      (event) => event.sourceRowId === card.id,
    );
    expect(reminder).toBeDefined();

    await getDb().notificationEvents.bulkPut([
      {
        ...reminder!,
        id: "wrong-table-event",
        sourceTable: "transactions",
        syncedAt: null,
      },
      {
        ...reminder!,
        id: "wrong-type-event",
        eventType: "other_event",
        syncedAt: null,
      },
    ]);

    await removeCreditCardPaymentReminderEvents(card.id);

    const remaining = await getDb().notificationEvents.toArray();
    expect(remaining.map((event) => event.id)).toEqual(
      expect.arrayContaining(["wrong-table-event", "wrong-type-event"]),
    );
    expect(remaining).toHaveLength(2);
  });

  it("confirms with a paired transfer and does not advance twice", async () => {
    const funding = await accountAdapter.addAccount({
      name: "Cash",
      accountType: "Cash",
      initialBalance: 1000,
      currency: "VND",
    });
    const card = await addCreditCard("Daily card");
    await addCardTransaction(card, -500);
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
        paymentCycleStartDate: followingCycleStartDate,
        nextPaymentDueDate: followingDueDate,
        lastPaymentConfirmedDueDate: expectedDueDate,
        syncVersion: 2,
      },
    });
    expect(await getDb().transactions.count()).toBe(3);
    expect(await getDb().notificationEvents.count()).toBe(0);

    const repeated = await accountAdapter.confirmCreditCardPayment(input);
    expect(repeated).toMatchObject({
      alreadyConfirmed: true,
      account: { nextPaymentDueDate: followingDueDate },
    });
    expect(await getDb().transactions.count()).toBe(3);
  });

  it("rejects a partial payment without changing the cycle", async () => {
    const funding = await accountAdapter.addAccount({
      name: "Cash",
      initialBalance: 1000,
      currency: "VND",
    });
    const card = await addCreditCard("Daily card");
    await addCardTransaction(card, -500);

    await expect(
      accountAdapter.confirmCreditCardPayment({
        accountId: card.id,
        expectedDueDate,
        fundingAccountId: funding.id,
        amount: 499,
        paymentDate,
      }),
    ).rejects.toThrow("must clear");
    expect(await getDb().transactions.count()).toBe(1);
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
    await addCardTransaction(card, -500);
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
    expect(await getDb().transactions.count()).toBe(1);
    expect(await getDb().notificationEvents.count()).toBe(1);
    expect(await getDb().accounts.get(card.id)).toMatchObject({
      nextPaymentDueDate: expectedDueDate,
      syncVersion: 1,
    });
  });

  it("suppresses legacy active cards and post-issue-only spending", async () => {
    const legacy = await accountAdapter.addAccount({
      name: "Legacy disabled seed",
      accountType: "Cash",
      initialBalance: 0,
      currency: "VND",
    });
    await getDb().accounts.put({
      ...legacy,
      accountType: "Credit Card",
      paymentReminderEnabled: true,
      paymentDueDay: 31,
      syncVersion: 2,
    });
    await reconcileCreditCardPaymentReminder({
      ...legacy,
      accountType: "Credit Card",
      paymentReminderEnabled: true,
      paymentDueDay: 31,
      syncVersion: 2,
    });
    expect(await getDb().notificationEvents.count()).toBe(0);

    const card = await addCreditCard("Post issue card");
    await addCardTransaction(card, -500, postIssueDate);
    expect(await getDb().notificationEvents.count()).toBe(0);
  });

  it("does not let post-issue payments suppress the current statement", async () => {
    const card = await addCreditCard("Post issue payment card");
    await addCardTransaction(card, -500, cycleStartDate);
    expect(await getDb().notificationEvents.count()).toBe(1);

    await addCardTransaction(card, 500, postIssueDate);
    const events = await getDb().notificationEvents.toArray();
    expect(events).toHaveLength(1);
    expect(events[0].sourceRowId).toBe(card.id);
  });
});
