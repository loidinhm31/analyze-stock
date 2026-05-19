import type {
  Transaction,
  NewTransaction,
  TransferNote,
  TransferParams,
} from "@money-insight/ui/types";
import {
  INCOMING_TRANSFER_CATEGORY,
  OUTGOING_TRANSFER_CATEGORY,
} from "@money-insight/shared";

export function isTransferTransaction(tx: Transaction): boolean {
  return tx.source === "transfer" && !!tx.transferId;
}

export function parseTransferNote(note: string): TransferNote | null {
  try {
    const parsed = JSON.parse(note);
    if (typeof parsed.userNote === "string") {
      return parsed as TransferNote;
    }
    return null;
  } catch {
    return null;
  }
}

export function createOutgoingTransferNote(
  _userNote: string,
  toAccount: string,
): string {
  const note: TransferNote = {
    userNote: `Send to ${toAccount}`,
    toAccount,
  };
  return JSON.stringify(note);
}

export function createIncomingTransferNote(
  _userNote: string,
  fromAccount: string,
): string {
  const note: TransferNote = {
    userNote: `Receive from ${fromAccount}`,
    fromAccount,
  };
  return JSON.stringify(note);
}

export function createTransferTransactions(
  params: TransferParams & { transferId: string },
): { outgoing: NewTransaction; incoming: NewTransaction } {
  const {
    fromAccount,
    toAccount,
    amount,
    date,
    note,
    currency,
    transferId,
    excludeReport = true,
  } = params;

  if (amount <= 0) {
    throw new Error("Transfer amount must be positive");
  }

  const outgoing: NewTransaction = {
    note: createOutgoingTransferNote(note, toAccount),
    amount: -Math.abs(amount),
    category: OUTGOING_TRANSFER_CATEGORY,
    account: fromAccount,
    currency,
    date,
    excludeReport,
    source: "transfer",
    transferId,
  };

  const incoming: NewTransaction = {
    note: createIncomingTransferNote(note, fromAccount),
    amount: Math.abs(amount),
    category: INCOMING_TRANSFER_CATEGORY,
    account: toAccount,
    currency,
    date,
    excludeReport,
    source: "transfer",
    transferId,
  };

  return { outgoing, incoming };
}

/**
 * Rebuild TransferParams from a stored transfer pair plus the updated fields on
 * one leg. The caller passes the updated leg's data as `tx`; both stored legs
 * (identified by `transferId`) must be present in `pair`.
 *
 * Returns null when the pair is incomplete (sync corruption edge case).
 */
export function reconstructTransferParams(
  tx: Transaction,
  pair: Transaction[],
): TransferParams | null {
  const outgoing = pair.find((t) => t.amount < 0);
  const incoming = pair.find((t) => t.amount > 0);
  if (!outgoing || !incoming) return null;

  const isEditingOutgoing = tx.id === outgoing.id;
  const editedLeg = isEditingOutgoing ? outgoing : incoming;
  const counterpart = isEditingOutgoing ? incoming : outgoing;
  const merged = { ...editedLeg, ...tx };

  // amount === 0 is invalid for a transfer; treat as incomplete pair rather than
  // letting it propagate to createTransferTransactions which would throw.
  if (merged.amount === 0) return null;

  const parsedNote = parseTransferNote(merged.note);
  const userNote = parsedNote?.userNote ?? merged.note;

  // counterpart.account is authoritative: for the incoming leg it IS the toAccount,
  // for the outgoing leg it IS the fromAccount.
  if (isEditingOutgoing) {
    return {
      fromAccount: merged.account,
      toAccount: counterpart.account,
      amount: Math.abs(merged.amount),
      date: merged.date,
      note: userNote,
      currency: merged.currency,
      excludeReport: merged.excludeReport,
    };
  } else {
    return {
      fromAccount: counterpart.account,
      toAccount: merged.account,
      amount: Math.abs(merged.amount),
      date: merged.date,
      note: userNote,
      currency: merged.currency,
      excludeReport: merged.excludeReport,
    };
  }
}

/**
 * Returns a human-readable label for a transfer transaction in a list.
 * Uses the encoded note JSON to avoid async DB lookups per render.
 */
export function getTransferDisplayNote(tx: Transaction): string {
  const parsed = parseTransferNote(tx.note);
  if (!parsed) return "Transfer";

  if (parsed.userNote.trim()) return parsed.userNote;
  if (parsed.toAccount) return `Send to ${parsed.toAccount}`;
  if (parsed.fromAccount) return `Receive from ${parsed.fromAccount}`;
  return "Transfer";
}
