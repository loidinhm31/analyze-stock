---
title: Account rename and sync validation
description: Implement and validate atomic account rename propagation across linked records.
status: completed
priority: high
effort: 1 phase
branch: main
tags: [accounts, transactions, sync, validation]
created: 2026-07-28
---

# Phase 01 — Account rename and sync validation

## Context

Parent: [plan.md](plan.md). Date: 2026-07-28. Priority: high. Status: completed.

## Overview

`Account.id` is stable, but `Transaction.account` stores the account name. Current
`updateAccount` changes only the account row, leaving historical records orphaned.

## Key insights

- Dexie already indexes `transactions.account`; no schema delta is needed.
- Transfer account names also occur in structured JSON notes; ordinary notes must survive.
- Sync exports dirty account and transaction rows independently, so every rewritten row
  must receive normal update metadata.

## Requirements

- Trim the requested name, reject empty/duplicate names, and no-op when unchanged.
- Atomically update the account, all transactions with its old label, and matching
  `fromAccount` / `toAccount` values in valid transfer metadata.
- Migrate legacy debt/settlement `accountId` name values and budget `accountNames` scopes.
- Preserve transaction IDs, amounts, dates, categories, unrelated notes and all other fields.
- Refresh Zustand state and analysis only after persistence succeeds; display failure in form.
- Verify account + all rewritten records are exported and correctly restored by sync.

## Architecture

Extend the account service/IndexedDB adapter with a focused rename path (or make its
existing update path detect a name change) so the account and transaction mutation shares
one database transaction. The store delegates through the service facade; AccountForm uses
the existing dialog feedback pattern. Keep sync storage protocol unchanged.

## Related code files

- `packages/ui/src/components/organisms/AccountForm.tsx`
- `packages/ui/src/components/pages/TransactionPage.tsx`
- `packages/ui/src/stores/spendingStore.ts`
- `packages/ui/src/adapters/factory/interfaces/IAccountService.ts`
- `packages/ui/src/adapters/web/IndexedDBAccountAdapter.ts`
- `packages/ui/src/adapters/web/IndexedDBTransactionAdapter.ts`
- `packages/ui/src/services/transferService.ts`
- `packages/ui/src/adapters/web/sync/IndexedDBSyncStorage.ts`
- `packages/ui/src/adapters/web/*test.ts`, `stores/spendingStore.test.ts`,
  `adapters/web/sync/IndexedDBSyncStorage.test.ts`

## Implementation steps

1. Trace the actual update and sync metadata helpers; add the smallest service contract
   and adapter operation that can rename atomically.
2. Validate canonical trimmed names and reject any other active account with that name.
3. In one Dexie read-write transaction, update account and matching transaction records;
   update valid transfer metadata, legacy debt/settlement name references, and budget scopes
   without parsing/changing arbitrary notes. Mark each modified record as locally changed
   using established `syncVersion` / `syncedAt` rules.
4. Route AccountForm/store name changes through the path, surface errors, and reload/replace
   accounts and transactions together before recalculating analysis.
5. Add focused tests for plain transactions, transfer pair/metadata, no-op, trimming,
   conflict rejection, and rollback when a write fails.
6. Add sync-storage integration tests: outbound queue includes account and every affected
   transaction; serialized payloads use the new name/version; inbound apply retains their
   association and does not recreate the old account name.
7. Run scoped tests, `pnpm type-check`, then required reviewer/tester checks.

## Todo list

- [x] Implement persistence and service/store/UI wiring
- [x] Cover rename data integrity, transfer cases, and real IndexedDB rollback
- [x] Cover outbound/inbound sync behavior
- [x] Type-check and run focused tests
- [x] Review and address findings

## Success criteria

The old account label cannot remain on a matching transaction after a successful rename;
both transfer legs remain reconstructable; a duplicate name changes nothing; offline sync
ships exactly the changed rows and another client receives a coherent renamed history.

## Risk assessment

Large accounts cause proportional batch writes and sync traffic; use indexed lookup and
bulk persistence. Concurrent edits resolve through existing sync/version semantics; tests
must demonstrate no local partial state and document that no new conflict policy is added.

## Security considerations

No new permission or secret surface. Treat note JSON as untrusted content: parse defensively
and only rewrite recognized account-name fields.

## Next steps

Completed 2026-07-28. Atomic name migration covers transaction/transfer/debt/settlement/
budget references and sync propagation. Validation: 156 tests, direct UI `tsc`, final review
9.5/10.
