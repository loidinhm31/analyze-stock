import { describe, it, expect } from "vitest";
import type { Transaction } from "@money-insight/ui/types";
import {
  parseTransferNote,
  reconstructTransferParams,
  createOutgoingTransferNote,
  createIncomingTransferNote,
  createTransferTransactions,
} from "./transferService";
import {
  INCOMING_TRANSFER_CATEGORY,
  OUTGOING_TRANSFER_CATEGORY,
} from "@money-insight/shared";

function makeTransferPair(
  transferId: string,
  fromAccount: string,
  toAccount: string,
  amount: number,
  date: string,
  userNote: string,
  currency = "VND",
): { outgoing: Transaction; incoming: Transaction } {
  const base: Omit<Transaction, "id" | "amount" | "account" | "note"> = {
    source: "transfer",
    category: "__transfer__",
    currency,
    date,
    excludeReport: true,
    expense: 0,
    income: 0,
    yearMonth: date.slice(0, 7),
    year: parseInt(date.slice(0, 4)),
    month: parseInt(date.slice(5, 7)),
    transferId,
    syncVersion: 1,
    syncedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
  return {
    outgoing: {
      ...base,
      id: `${transferId}-out`,
      amount: -Math.abs(amount),
      account: fromAccount,
      note: createOutgoingTransferNote(userNote, toAccount),
    },
    incoming: {
      ...base,
      id: `${transferId}-in`,
      amount: Math.abs(amount),
      account: toAccount,
      note: createIncomingTransferNote(userNote, fromAccount),
    },
  };
}

describe("parseTransferNote", () => {
  it("parses valid JSON note", () => {
    const result = parseTransferNote(
      JSON.stringify({ userNote: "hello", toAccount: "Savings" }),
    );
    expect(result).toEqual({ userNote: "hello", toAccount: "Savings" });
  });

  it("returns null for non-JSON strings", () => {
    expect(parseTransferNote("plain text")).toBeNull();
  });

  it("returns null for JSON without userNote string", () => {
    expect(parseTransferNote(JSON.stringify({ foo: "bar" }))).toBeNull();
  });
});

describe("transfer note helpers", () => {
  it("defaults outgoing and incoming notes to clear account labels", () => {
    expect(parseTransferNote(createOutgoingTransferNote("", "Savings"))).toEqual(
      { userNote: "Send to Savings", toAccount: "Savings" },
    );
    expect(parseTransferNote(createIncomingTransferNote("", "Cash"))).toEqual({
      userNote: "Receive from Cash",
      fromAccount: "Cash",
    });
  });

  it("uses account labels even when an explicit note is provided", () => {
    expect(
      parseTransferNote(createOutgoingTransferNote("Monthly savings", "Savings")),
    ).toEqual({ userNote: "Send to Savings", toAccount: "Savings" });
  });
});

describe("createTransferTransactions", () => {
  it("creates paired visible transfer categories excluded by default", () => {
    const pair = createTransferTransactions({
      transferId: "tid-002",
      fromAccount: "Cash",
      toAccount: "Savings",
      amount: 100_000,
      date: "2024-04-01",
      note: "Move savings",
      currency: "VND",
    });

    expect(pair.outgoing.category).toBe(OUTGOING_TRANSFER_CATEGORY);
    expect(pair.incoming.category).toBe(INCOMING_TRANSFER_CATEGORY);
    expect(pair.outgoing.amount).toBe(-100_000);
    expect(pair.incoming.amount).toBe(100_000);
    expect(pair.outgoing.excludeReport).toBe(true);
    expect(pair.incoming.excludeReport).toBe(true);
    expect(parseTransferNote(pair.outgoing.note)?.userNote).toBe(
      "Send to Savings",
    );
    expect(parseTransferNote(pair.incoming.note)?.userNote).toBe(
      "Receive from Cash",
    );
    expect(pair.outgoing.transferId).toBe("tid-002");
    expect(pair.incoming.transferId).toBe("tid-002");
  });

  it("uses clear sender and receiver notes when no custom note is provided", () => {
    const pair = createTransferTransactions({
      transferId: "tid-004",
      fromAccount: "Cash",
      toAccount: "Savings",
      amount: 100_000,
      date: "2024-04-01",
      note: "",
      currency: "VND",
    });

    expect(parseTransferNote(pair.outgoing.note)?.userNote).toBe(
      "Send to Savings",
    );
    expect(parseTransferNote(pair.incoming.note)?.userNote).toBe(
      "Receive from Cash",
    );
  });

  it("applies excludeReport to both transfer legs", () => {
    const pair = createTransferTransactions({
      transferId: "tid-003",
      fromAccount: "Cash",
      toAccount: "Savings",
      amount: 100_000,
      date: "2024-04-01",
      note: "Move savings",
      currency: "VND",
      excludeReport: false,
    });

    expect(pair.outgoing.excludeReport).toBe(false);
    expect(pair.incoming.excludeReport).toBe(false);
  });
});

describe("reconstructTransferParams", () => {
  const transferId = "tid-001";
  const { outgoing, incoming } = makeTransferPair(
    transferId,
    "Wallet",
    "Savings",
    500_000,
    "2024-03-10",
    "Monthly savings",
  );
  const pair = [outgoing, incoming];

  it("reconstructs params when editing the outgoing leg", () => {
    const editedLeg: Transaction = { ...outgoing, amount: -600_000, date: "2024-03-11" };
    const params = reconstructTransferParams(editedLeg, pair);

    expect(params).not.toBeNull();
    expect(params!.fromAccount).toBe("Wallet");
    expect(params!.toAccount).toBe("Savings");
    expect(params!.amount).toBe(600_000);
    expect(params!.date).toBe("2024-03-11");
    expect(params!.note).toBe("Send to Savings");
    expect(params!.currency).toBe("VND");
  });

  it("reconstructs params when editing the incoming leg", () => {
    const editedLeg: Transaction = { ...incoming, amount: 750_000 };
    const params = reconstructTransferParams(editedLeg, pair);

    expect(params).not.toBeNull();
    expect(params!.fromAccount).toBe("Wallet");
    expect(params!.toAccount).toBe("Savings");
    expect(params!.amount).toBe(750_000);
    expect(params!.note).toBe("Receive from Wallet");
  });

  it("propagates currency change from edited leg", () => {
    const editedLeg: Transaction = { ...outgoing, currency: "USD" };
    const params = reconstructTransferParams(editedLeg, pair);
    expect(params!.currency).toBe("USD");
  });

  it("propagates account change when editing outgoing leg (fromAccount)", () => {
    const editedLeg: Transaction = { ...outgoing, account: "Bank" };
    const params = reconstructTransferParams(editedLeg, pair);
    expect(params!.fromAccount).toBe("Bank");
    expect(params!.toAccount).toBe("Savings");
  });

  it("propagates account change when editing incoming leg (toAccount)", () => {
    const editedLeg: Transaction = { ...incoming, account: "Investment" };
    const params = reconstructTransferParams(editedLeg, pair);
    expect(params!.toAccount).toBe("Investment");
    expect(params!.fromAccount).toBe("Wallet");
  });

  it("uses counterpart.account regardless of note JSON content", () => {
    const corruptedCounterpart: Transaction = { ...incoming, note: "corrupted" };
    const editedLeg: Transaction = { ...outgoing };
    const params = reconstructTransferParams(editedLeg, [outgoing, corruptedCounterpart]);
    // counterpart.account ("Savings") is used directly — note parsing is only for userNote
    expect(params!.toAccount).toBe("Savings");
  });

  it("returns null when merged amount is 0 (invalid transfer)", () => {
    const editedLeg: Transaction = { ...outgoing, amount: 0 };
    expect(reconstructTransferParams(editedLeg, pair)).toBeNull();
  });

  it("returns null when pair is empty", () => {
    expect(reconstructTransferParams(outgoing, [])).toBeNull();
  });

  it("returns null when pair has only one leg", () => {
    expect(reconstructTransferParams(outgoing, [outgoing])).toBeNull();
  });

  it("extracts generated display note from JSON-encoded note", () => {
    const editedLeg: Transaction = {
      ...outgoing,
      note: createOutgoingTransferNote("Trip expenses", "Savings"),
    };
    const params = reconstructTransferParams(editedLeg, pair);
    expect(params!.note).toBe("Send to Savings");
  });

  it("falls back to raw note string if not valid TransferNote JSON", () => {
    const editedLeg: Transaction = { ...outgoing, note: "raw note" };
    const params = reconstructTransferParams(editedLeg, pair);
    expect(params!.note).toBe("raw note");
  });
});
