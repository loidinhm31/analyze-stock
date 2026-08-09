import { describe, expect, it } from "vitest";
import {
  formatAccountValue,
  getAccountTypeLabel,
  getAccountTypeSelectionSummary,
  hasKnownHistory,
  MASKED_ACCOUNT_VALUE,
} from "./account-type-value-widget-helpers";

describe("account type value widget helpers", () => {
  it("formats a known currency and uses a fixed privacy mask", () => {
    expect(formatAccountValue(1234.5, "USD")).toBe("$1,234.50");
    expect(formatAccountValue(1234.5, "USD", true)).toBe(MASKED_ACCOUNT_VALUE);
    expect(formatAccountValue(1234.5, "USD", true)).not.toContain("1234");
  });

  it("falls back safely for malformed currency codes", () => {
    expect(formatAccountValue(1234.5, "??")).toBe("?? 1,234.5");
    expect(formatAccountValue(1234.5, "")).toBe("Unknown 1,234.5");
  });

  it("labels canonical and unclassified account types", () => {
    expect(getAccountTypeLabel("bank_account")).toBe("Bank account");
    expect(getAccountTypeLabel("__other__")).toBe("Other / unclassified");
  });

  it("summarizes selection without exposing financial values", () => {
    expect(getAccountTypeSelectionSummary(null)).toBe("Not configured");
    expect(getAccountTypeSelectionSummary(["cash"])).toBe("Cash");
    expect(getAccountTypeSelectionSummary(["cash", "investment"])).toBe(
      "2 account types selected",
    );
  });

  it("detects when a history has no completed month-end value", () => {
    expect(hasKnownHistory([{ value: null }, { value: null }])).toBe(false);
    expect(hasKnownHistory([{ value: null }, { value: 0 }])).toBe(true);
  });
});
