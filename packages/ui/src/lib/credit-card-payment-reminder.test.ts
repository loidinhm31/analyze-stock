import { describe, expect, it } from "vitest";
import type { Account, Transaction } from "@money-insight/ui/types";
import {
  advancePaymentDueDate,
  buildCreditCardPaymentReminderEvent,
  calculateAccountBalance,
  deriveNextPaymentDueDate,
  getPaymentReminderTriggerAt,
  normalizeCreditCardPaymentReminder,
  parseIsoDate,
} from "./credit-card-payment-reminder";

const creditCard: Account = {
  id: "card-1",
  name: "Daily card",
  accountType: "Credit Card",
  initialBalance: -500,
  currency: "VND",
  paymentDueDay: 31,
  paymentReminderEnabled: true,
  nextPaymentDueDate: "2026-02-28",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  syncVersion: 7,
  syncedAt: null,
};

describe("credit card payment reminder dates", () => {
  it("strictly rejects malformed and impossible ISO dates", () => {
    expect(() => parseIsoDate("2026-2-01")).toThrow("YYYY-MM-DD");
    expect(() => parseIsoDate("2026-02-30")).toThrow("valid calendar");
  });

  it("selects this or next due month from the recurring day", () => {
    expect(deriveNextPaymentDueDate(15, "2026-08-10")).toBe("2026-08-15");
    expect(deriveNextPaymentDueDate(15, "2026-08-16")).toBe("2026-09-15");
  });

  it("clamps February and restores the 31st in March", () => {
    expect(advancePaymentDueDate("2026-01-31", 31)).toBe("2026-02-28");
    expect(advancePaymentDueDate("2026-02-28", 31)).toBe("2026-03-31");
    expect(advancePaymentDueDate("2024-01-31", 31)).toBe("2024-02-29");
  });

  it("schedules D-3 at browser-local 09:00", () => {
    expect(getPaymentReminderTriggerAt("2026-03-02")).toBe(
      new Date(2026, 1, 27, 9, 0, 0, 0).toISOString(),
    );
  });
});

describe("credit card payment reminder lifecycle helpers", () => {
  it("preserves a clamped active cycle when the due-day anchor is unchanged", () => {
    expect(
      normalizeCreditCardPaymentReminder(
        { ...creditCard, name: "Renamed card" },
        creditCard,
        "2026-02-10",
      ),
    ).toMatchObject({
      paymentDueDay: 31,
      paymentReminderEnabled: true,
      nextPaymentDueDate: "2026-02-28",
    });
  });

  it("clears reminder metadata for non-credit accounts", () => {
    expect(
      normalizeCreditCardPaymentReminder(
        { ...creditCard, accountType: "Cash" },
        creditCard,
        "2026-02-10",
      ),
    ).toEqual({
      paymentDueDay: undefined,
      paymentReminderEnabled: false,
      nextPaymentDueDate: undefined,
      lastPaymentConfirmedDueDate: undefined,
      lastPaymentConfirmedAt: undefined,
    });
  });

  it("calculates balance from signed transactions", () => {
    const transactions = [
      { account: "Daily card", amount: -200 },
      { account: "Daily card", amount: 300 },
      { account: "Cash", amount: 999 },
    ] as Transaction[];
    expect(calculateAccountBalance(creditCard, transactions)).toBe(-400);
  });

  it("builds the recurring source-bound event without balance details", () => {
    const event = buildCreditCardPaymentReminderEvent(creditCard);
    expect(event).toMatchObject({
      eventType: "credit_card_payment_due",
      deliveryMode: "daily_until_source_change",
      sourceTable: "accounts",
      sourceRowId: "card-1",
      sourceVersion: 7,
      dedupeKey: "money-insight:credit_card_payment_due:card-1:2026-02-28",
      payload: { accountId: "card-1", paymentDueDate: "2026-02-28" },
    });
    expect(event.body).toBe(
      "Your credit card payment is due on 2026-02-28. Confirm payment in Money Insight.",
    );
  });
});
