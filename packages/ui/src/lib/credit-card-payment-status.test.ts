import { describe, expect, it } from "vitest";
import {
  getCreditCardPaymentDueStatus,
  getCreditCardPaymentDueStatusLabel,
} from "./credit-card-payment-status";

describe("credit card payment status", () => {
  it("compares ISO date-only values for upcoming and overdue cycles", () => {
    expect(
      getCreditCardPaymentDueStatus({
        nextPaymentDueDate: "2026-08-15",
        todayIso: "2026-08-14",
      }),
    ).toBe("upcoming");
    expect(
      getCreditCardPaymentDueStatus({
        nextPaymentDueDate: "2026-08-15",
        todayIso: "2026-08-16",
      }),
    ).toBe("overdue");
  });

  it("identifies a confirmed cycle before falling back to date status", () => {
    const status = getCreditCardPaymentDueStatus({
      nextPaymentDueDate: "2026-08-15",
      lastPaymentConfirmedDueDate: "2026-08-15",
      todayIso: "2026-08-16",
    });

    expect(status).toBe("confirmed");
    expect(getCreditCardPaymentDueStatusLabel(status)).toBe("Confirmed");
  });

  it("returns not configured when no due cycle exists", () => {
    expect(getCreditCardPaymentDueStatus({ todayIso: "2026-08-01" })).toBe(
      "not-configured",
    );
  });
});
