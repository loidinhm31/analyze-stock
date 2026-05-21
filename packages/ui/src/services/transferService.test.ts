import { describe, it, expect } from "vitest";
import type { Transaction } from "@money-insight/ui/types";
import {
  parseTransferNote,
  reconstructTransferParams,
  createOutgoingTransferNote,
  createIncomingTransferNote,
  createTransferTransactions,
  getTransferDisplayNote,
  getTransferUserNote,
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
  it("stores the real user note alongside transfer metadata", () => {
    expect(parseTransferNote(createOutgoingTransferNote("", "Savings"))).toEqual(
      { userNote: "", toAccount: "Savings" },
    );
    expect(parseTransferNote(createIncomingTransferNote("", "Cash"))).toEqual({
      userNote: "",
      fromAccount: "Cash",
    });
  });

  it("preserves an explicit user note", () => {
    expect(
      parseTransferNote(createOutgoingTransferNote("Monthly savings", "Savings")),
    ).toEqual({ userNote: "Monthly savings", toAccount: "Savings" });
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
    expect(parseTransferNote(pair.outgoing.note)?.userNote).toBe("Move savings");
    expect(parseTransferNote(pair.incoming.note)?.userNote).toBe("Move savings");
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

    expect(parseTransferNote(pair.outgoing.note)?.userNote).toBe("");
    expect(parseTransferNote(pair.incoming.note)?.userNote).toBe("");
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
    expect(params!.note).toBe("Monthly savings");
    expect(params!.currency).toBe("VND");
  });

  it("reconstructs params when editing the incoming leg", () => {
    const editedLeg: Transaction = { ...incoming, amount: 750_000 };
    const params = reconstructTransferParams(editedLeg, pair);

    expect(params).not.toBeNull();
    expect(params!.fromAccount).toBe("Wallet");
    expect(params!.toAccount).toBe("Savings");
    expect(params!.amount).toBe(750_000);
    expect(params!.note).toBe("Monthly savings");
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

  it("extracts the real user note from JSON-encoded note", () => {
    const editedLeg: Transaction = {
      ...outgoing,
      note: createOutgoingTransferNote("Trip expenses", "Savings"),
    };
    const params = reconstructTransferParams(editedLeg, pair);
    expect(params!.note).toBe("Trip expenses");
  });

  it("falls back to raw note string if not valid TransferNote JSON", () => {
    const editedLeg: Transaction = { ...outgoing, note: "raw note" };
    const params = reconstructTransferParams(editedLeg, pair);
    expect(params!.note).toBe("raw note");
  });
});

describe("transfer display helpers", () => {
  it("shows combined note and direction when a real note exists", () => {
    const { outgoing, incoming } = makeTransferPair(
      "tid-005",
      "Wallet",
      "Savings",
      250_000,
      "2024-03-12",
      "Trip expenses",
    );

    expect(getTransferDisplayNote(outgoing)).toBe("Trip expenses • Send to Savings");
    expect(getTransferDisplayNote(incoming)).toBe("Trip expenses • Receive from Wallet");
  });

  it("falls back to direction-only text when the user note is empty", () => {
    const { outgoing, incoming } = makeTransferPair(
      "tid-006",
      "Wallet",
      "Savings",
      250_000,
      "2024-03-12",
      "",
    );

    expect(getTransferDisplayNote(outgoing)).toBe("Send to Savings");
    expect(getTransferDisplayNote(incoming)).toBe("Receive from Wallet");
  });

  it("treats legacy generated userNote values as empty user notes", () => {
    const legacyOutgoing = JSON.stringify({
      userNote: "Send to Savings",
      toAccount: "Savings",
    });
    const legacyIncoming = JSON.stringify({
      userNote: "Receive from Wallet",
      fromAccount: "Wallet",
    });

    expect(getTransferUserNote(legacyOutgoing)).toBe("");
    expect(getTransferUserNote(legacyIncoming)).toBe("");
    expect(getTransferDisplayNote({ note: legacyOutgoing })).toBe("Send to Savings");
    expect(getTransferDisplayNote({ note: legacyIncoming })).toBe(
      "Receive from Wallet",
    );
  });
});
