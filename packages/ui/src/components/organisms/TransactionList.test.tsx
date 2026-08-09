import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Transaction } from "@money-insight/ui/types";
import { TransactionList } from "./TransactionList";

const transaction: Transaction = {
  id: "transaction-1",
  account: "Wallet",
  amount: -1234.5,
  category: "Food",
  currency: "USD",
  date: "2026-08-09",
  excludeReport: false,
  expense: 1234.5,
  income: 0,
  month: 8,
  note: "Lunch",
  source: "manual",
  createdAt: "2026-08-09T00:00:00.000Z",
  updatedAt: "2026-08-09T00:00:00.000Z",
  syncVersion: 1,
  syncedAt: null,
  year: 2026,
  yearMonth: "2026-08",
};

describe("TransactionList", () => {
  it("does not render transaction amounts when values are hidden", () => {
    const markup = renderToStaticMarkup(
      <TransactionList transactions={[transaction]} valuesHidden />,
    );

    expect(markup).not.toContain("1.235");
    expect(markup).toMatch(/>\*+<\/p>/);
  });
});
