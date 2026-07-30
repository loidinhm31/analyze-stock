import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "@money-insight/ui/types";
import {
  groupTransactionsByDate,
  groupTransactionsByTimePeriod,
} from "./timePeriodGrouping";

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: "transaction-1",
    source: "manual",
    note: "",
    amount: 0,
    category: "Food",
    account: "Cash",
    currency: "VND",
    date: "2026-07-30T09:00:00",
    excludeReport: false,
    expense: 0,
    income: 0,
    yearMonth: "2026-07",
    year: 2026,
    month: 7,
    createdAt: "2026-07-30T09:00:00",
    updatedAt: "2026-07-30T09:00:00",
    syncVersion: 1,
    syncedAt: null,
    ...overrides,
  };
}

describe("groupTransactionsByTimePeriod", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T20:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("groups same-day transactions, totals them, and orders the newest row first", () => {
    const groups = groupTransactionsByTimePeriod(
      [
        transaction({
          id: "older",
          date: "2026-07-30T09:00:00",
          expense: 120_000,
        }),
        transaction({
          id: "newer",
          date: "2026-07-30T18:00:00",
          income: 200_000,
        }),
        transaction({
          id: "previous-day",
          date: "2026-07-29T18:00:00",
          expense: 50_000,
        }),
      ],
      "day",
      new Date("2026-07-30T20:00:00"),
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      key: "2026-07-30",
      totalExpense: 120_000,
      totalIncome: 200_000,
    });
    expect(groups[0].transactions.map(({ id }) => id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("groups date sections without applying the day-view history window", () => {
    const groups = groupTransactionsByDate(
      [
        transaction({ id: "recent", date: "2026-07-30T09:00:00" }),
        transaction({ id: "historical", date: "2025-01-02T09:00:00" }),
      ],
      new Date("2026-07-30T20:00:00"),
    );

    expect(groups.map(({ key }) => key)).toEqual(["2026-07-30", "2025-01-02"]);
  });

  it("keeps current-month groups labelled as This Month even for an upcoming date", () => {
    const groups = groupTransactionsByTimePeriod(
      [transaction({ date: "2026-07-31T09:00:00" })],
      "month",
      new Date("2026-07-30T20:00:00"),
    );

    expect(groups[0].label).toBe("This Month");
  });

  it("gives future date sections their actual date label", () => {
    const groups = groupTransactionsByDate(
      [
        transaction({ id: "tomorrow", date: "2026-07-31T09:00:00" }),
        transaction({ id: "next-month", date: "2026-08-01T09:00:00" }),
      ],
      new Date("2026-07-30T20:00:00"),
    );

    expect(groups.map(({ label }) => label)).toEqual([
      "Future — Aug 1, 2026",
      "Future — Jul 31, 2026",
    ]);
  });
});
