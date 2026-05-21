import { describe, expect, it } from "vitest";
import {
  buildDebtInput,
  buildDebtSettlementInput,
  buildUpdatedDebt,
  formatDebtMoney,
  maskValue,
} from "./debt-form-helpers";
import type { Debt } from "@money-insight/ui/types";

function makeDebt(): Debt {
  return {
    id: "debt-1",
    name: "Family loan",
    debtType: "payable",
    counterpartyName: "Aunt",
    description: "Original note",
    accountId: "Cash",
    currency: "VND",
    principalAmount: 1_000_000,
    settledAmount: 250_000,
    remainingAmount: 750_000,
    isCompleted: false,
    originatedAt: "2024-01-01",
    dueDate: "2024-02-01",
    completedAt: undefined,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    syncVersion: 1,
    syncedAt: null,
  };
}

describe("debt-form-helpers", () => {
  it("builds trimmed debt input values", () => {
    expect(
      buildDebtInput({
        name: "  Rent advance  ",
        debtType: "receivable",
        counterpartyName: "  Bob  ",
        description: "  Late invoice  ",
        accountId: "Cash",
        currency: "USD",
        principalAmount: "120.5",
        originatedAt: new Date("2024-03-10T00:00:00Z"),
        dueDate: new Date("2024-03-15T00:00:00Z"),
      }),
    ).toEqual({
      name: "Rent advance",
      debtType: "receivable",
      counterpartyName: "Bob",
      description: "Late invoice",
      accountId: "Cash",
      currency: "USD",
      principalAmount: 120.5,
      originatedAt: "2024-03-10",
      dueDate: "2024-03-15",
    });
  });

  it("preserves derived fields when building an updated debt", () => {
    const debt = buildUpdatedDebt(makeDebt(), {
      name: "Updated loan",
      debtType: "payable",
      counterpartyName: "Aunt",
      description: "",
      accountId: "Wallet",
      currency: "VND",
      principalAmount: "2000000",
      originatedAt: new Date("2024-01-02T00:00:00Z"),
      dueDate: undefined,
    });

    expect(debt.settledAmount).toBe(250_000);
    expect(debt.remainingAmount).toBe(750_000);
    expect(debt.accountId).toBe("Wallet");
    expect(debt.description).toBeUndefined();
    expect(debt.originatedAt).toBe("2024-01-02");
  });

  it("rejects settlement amounts above the remaining balance", () => {
    expect(() =>
      buildDebtSettlementInput(
        {
          accountId: "Cash",
          amount: "900000",
          settledAt: new Date("2024-01-10T00:00:00Z"),
          note: "",
        },
        750_000,
      ),
    ).toThrow("Settlement amount cannot exceed the remaining amount.");
  });

  it("formats and masks money for display", () => {
    expect(formatDebtMoney(1_250_000, "VND")).toContain("₫");
    expect(formatDebtMoney(1250.5, "USD")).toBe("USD 1,250.5");
    expect(maskValue("12345")).toBe("*****");
  });
});
