import { describe, expect, it } from "vitest";
import type { Account } from "@money-insight/ui/types";
import {
  advancePaymentCycleStartDate,
  advancePaymentDueDate,
  buildCreditCardPaymentReminderEvent,
  calculateAccountBalance,
  calculateCreditCardStatement,
  deriveCreditCardStatementDates,
  deriveNextPaymentDueDate,
  getPaymentReminderTriggerAt,
  isCreditCardPaymentReminderComplete,
  normalizeCreditCardPaymentReminder,
  parseIsoDate,
} from "./credit-card-payment-reminder";

const creditCard: Account = {
  id: "card-1",
  name: "Daily card",
  accountType: "Credit Card",
  initialBalance: -500,
  currency: "VND",
  paymentCycleStartDate: "2026-01-31",
  paymentCycleStartDay: 31,
  interestFreeDays: 29,
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

  it("advances the statement cycle by fixed anchor day across clamped months", () => {
    expect(advancePaymentCycleStartDate("2026-01-31", 31)).toBe("2026-02-28");
    expect(advancePaymentCycleStartDate("2026-02-28", 31)).toBe("2026-03-31");
    expect(advancePaymentCycleStartDate("2024-01-31", 31)).toBe("2024-02-29");
  });

  it("schedules D-3 at browser-local 09:00", () => {
    expect(getPaymentReminderTriggerAt("2026-03-02")).toBe(
      new Date(2026, 1, 27, 9, 0, 0, 0).toISOString(),
    );
  });
});

describe("credit card statement calculation", () => {
  it("derives the representative issue and due dates with signed totals", () => {
    expect(
      calculateCreditCardStatement("15/06/2026", 55, [
        { date: "2026-06-15", amount: -500 },
        { date: "14/07/2026", amount: 100 },
        { date: "2026-07-15", amount: -900 },
      ]),
    ).toEqual({
      payment_issue_date: "2026-07-14",
      payment_due_date: "2026-08-08",
      total_alert_amount: -400,
    });
  });

  it("includes both statement boundaries and excludes dates outside them", () => {
    expect(
      calculateCreditCardStatement("2026-06-15", 1, [
        { date: "2026-06-14", amount: 10 },
        { date: "2026-06-15", amount: -100 },
        { date: "2026-07-14", amount: 25 },
        { date: "2026-07-15", amount: 50 },
      ]),
    ).toMatchObject({ total_alert_amount: -75 });
  });

  it("normalizes ISO, DD/MM/YYYY, and local Date inputs", () => {
    const localStart = new Date(2026, 5, 15, 23, 45, 0, 0);
    const localEnd = new Date(2026, 6, 14, 1, 15, 0, 0);

    expect(
      calculateCreditCardStatement(localStart, 55, [
        { date: "15/06/2026", amount: -200 },
        { date: localEnd, amount: 50 },
      ]),
    ).toEqual({
      payment_issue_date: "2026-07-14",
      payment_due_date: "2026-08-08",
      total_alert_amount: -150,
    });
  });

  it("clamps month ends and leap years deterministically", () => {
    expect(calculateCreditCardStatement("2026-01-31", 1, [])).toMatchObject({
      payment_issue_date: "2026-02-27",
      payment_due_date: "2026-01-31",
    });
    expect(calculateCreditCardStatement("2024-01-31", 1, [])).toMatchObject({
      payment_issue_date: "2024-02-28",
    });
    expect(calculateCreditCardStatement("2026-12-31", 32, [])).toMatchObject({
      payment_issue_date: "2027-01-30",
      payment_due_date: "2027-01-31",
    });
  });

  it("preserves signed values and returns zero when they cancel", () => {
    expect(
      calculateCreditCardStatement("2026-06-01", 10, [
        { date: "2026-06-01", amount: -500 },
        { date: "2026-06-05", amount: 100 },
        { date: "2026-06-10", amount: 400 },
      ]).total_alert_amount,
    ).toBe(0);
  });

  it("rejects invalid dates, grace periods, amounts, and arithmetic", () => {
    expect(() => calculateCreditCardStatement("2026-02-30", 1, [])).toThrow();
    expect(() => calculateCreditCardStatement("2026-06-01", 0, [])).toThrow(
      "positive safe integer",
    );
    expect(() => calculateCreditCardStatement("2026-06-01", 1.5, [])).toThrow(
      "positive safe integer",
    );
    expect(() =>
      calculateCreditCardStatement("2026-06-01", 1, [
        { date: new Date(Number.NaN), amount: 1 },
      ]),
    ).toThrow("valid Date");
    expect(() =>
      calculateCreditCardStatement("2026-06-01", 1, [
        { date: "2026-06-01", amount: Number.NaN },
      ]),
    ).toThrow("finite");
    expect(() =>
      calculateCreditCardStatement("2026-06-01", 1, [
        { date: "2026-06-01", amount: Number.MAX_VALUE },
        { date: "2026-06-01", amount: Number.MAX_VALUE },
      ]),
    ).toThrow("overflow");
  });
});

describe("credit card payment reminder lifecycle helpers", () => {
  it("detects complete persisted setup without using legacy due day", () => {
    expect(isCreditCardPaymentReminderComplete(creditCard)).toBe(true);
    expect(
      isCreditCardPaymentReminderComplete({
        paymentCycleStartDate: undefined,
        interestFreeDays: undefined,
      }),
    ).toBe(false);
    expect(
      isCreditCardPaymentReminderComplete({
        paymentCycleStartDate: "31/01/2026",
        interestFreeDays: 29,
      }),
    ).toBe(true);
    expect(
      isCreditCardPaymentReminderComplete({
        id: "card-2",
        paymentCycleStartDate: "2026-01-31",
        interestFreeDays: 0,
      }),
    ).toBe(false);
  });

  it("fails closed for corrupt full-account anchors and derived due dates", () => {
    expect(
      isCreditCardPaymentReminderComplete({
        ...creditCard,
        paymentCycleStartDay: 0,
      }),
    ).toBe(false);
    expect(
      isCreditCardPaymentReminderComplete({
        ...creditCard,
        paymentCycleStartDay: 32,
      }),
    ).toBe(false);
    expect(
      isCreditCardPaymentReminderComplete({
        ...creditCard,
        nextPaymentDueDate: "2026-08-09",
      }),
    ).toBe(false);
    expect(
      isCreditCardPaymentReminderComplete({
        paymentCycleStartDate: "2026-01-31",
        interestFreeDays: 29,
        paymentCycleStartDay: 31,
        nextPaymentDueDate: "2026-02-28",
      }),
    ).toBe(true);
    expect(
      isCreditCardPaymentReminderComplete({
        ...creditCard,
        paymentCycleStartDate: "31/01/2026",
      }),
    ).toBe(false);
  });

  it("normalizes active setup to canonical dates and preserves fixed anchor", () => {
    expect(
      normalizeCreditCardPaymentReminder(
        { ...creditCard, name: "Renamed card" },
        creditCard,
        "2026-02-10",
      ),
    ).toMatchObject({
      paymentDueDay: undefined,
      paymentCycleStartDate: "2026-01-31",
      paymentCycleStartDay: 31,
      interestFreeDays: 29,
      paymentReminderEnabled: true,
      nextPaymentDueDate: "2026-02-28",
    });
  });

  it("derives issue and due dates without persisting a statement input", () => {
    expect(deriveCreditCardStatementDates("15/06/2026", 55)).toEqual({
      payment_issue_date: "2026-07-14",
      payment_due_date: "2026-08-08",
    });
  });

  it("rejects active reminder setup with malformed DD/MM or missing fields", () => {
    expect(() =>
      normalizeCreditCardPaymentReminder(
        {
          ...creditCard,
          paymentCycleStartDate: "31/02/2026",
          interestFreeDays: 29,
        },
        undefined,
        "2026-02-10",
      ),
    ).toThrow("valid calendar");
    expect(() =>
      normalizeCreditCardPaymentReminder(
        {
          ...creditCard,
          paymentCycleStartDate: undefined,
          interestFreeDays: undefined,
        },
        undefined,
        "2026-02-10",
      ),
    ).toThrow("required");
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
      paymentCycleStartDate: undefined,
      paymentCycleStartDay: undefined,
      interestFreeDays: undefined,
      paymentReminderEnabled: false,
      nextPaymentDueDate: undefined,
      lastPaymentConfirmedDueDate: undefined,
      lastPaymentConfirmedAt: undefined,
    });
  });

  it("preserves legacy paymentDueDay without using it for new dates", () => {
    const legacy = { ...creditCard, paymentDueDay: 7 };
    expect(
      normalizeCreditCardPaymentReminder(legacy, legacy, "2026-02-10"),
    ).toMatchObject({
      paymentDueDay: 7,
      paymentCycleStartDate: "2026-01-31",
      nextPaymentDueDate: "2026-02-28",
    });
  });

  it("retains the legacy lifetime balance API for existing consumers", () => {
    expect(
      calculateAccountBalance({ name: "Daily card", initialBalance: -500 }, [
        { account: "Daily card", amount: 200 },
        { account: "Cash", amount: 999 },
      ]),
    ).toBe(-300);
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
