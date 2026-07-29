import { describe, expect, it } from "vitest";
import {
  formatBudgetReferenceMonth,
  moveBudgetHistoryReferenceDate,
  shiftUtcMonth,
} from "./budget-cycle-history";
import type { Budget } from "@money-insight/ui/types";

const monthEndBudget: Budget = {
  id: "month-end",
  name: "Month end",
  amount: 100,
  currency: "VND",
  categoryNames: ["Food"],
  accountNames: [],
  firstCycleStartDate: "2024-01-31",
  status: "active",
  createdAt: "2024-01-31T00:00:00.000Z",
  updatedAt: "2024-01-31T00:00:00.000Z",
  syncVersion: 1,
  syncedAt: null,
};

describe("budget cycle history", () => {
  it("moves month references in UTC and clamps the day for short months", () => {
    expect(shiftUtcMonth("2024-03-31", -1)).toBe("2024-02-29");
    expect(shiftUtcMonth("2024-01-31", 1)).toBe("2024-02-29");
    expect(shiftUtcMonth("2024-01-31", -1)).toBe("2023-12-31");
  });

  it("formats the selected month independently of the browser timezone", () => {
    expect(formatBudgetReferenceMonth("2024-02-29")).toBe("February 2024");
  });

  it("does not repeat a month-end budget cycle when browsing backward", () => {
    expect(
      moveBudgetHistoryReferenceDate("2024-07-30", -1, [monthEndBudget]),
    ).toBe("2024-06-29");
  });

  it("stays on the current reference when today's cap would repeat a cycle", () => {
    expect(
      moveBudgetHistoryReferenceDate(
        "2024-06-30",
        1,
        [{ ...monthEndBudget, firstCycleStartDate: "2024-06-30" }],
        undefined,
        "2024-07-29",
      ),
    ).toBe("2024-06-30");
  });

  it("does not navigate when no budget history exists", () => {
    expect(moveBudgetHistoryReferenceDate("2024-06-30", -1, [])).toBe("2024-06-30");
    expect(moveBudgetHistoryReferenceDate("2024-06-30", 1, [])).toBe("2024-06-30");
  });
});
