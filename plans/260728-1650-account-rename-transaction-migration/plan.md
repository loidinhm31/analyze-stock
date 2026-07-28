---
title: Account rename transaction migration
description: Atomically rename accounts and migrate linked history and sync metadata.
status: completed
priority: high
effort: 1 phase
branch: main
tags: [accounts, transactions, sync, migration]
created: 2026-07-28
---

# Account rename transaction migration

Status: completed · 2026-07-28 · one implementation phase

## Goal

Rename an account from Transactions > Accounts while rewriting all linked historical
transactions to the new label, keeping balances, filters, transfers, and sync coherent.

## Preflight contract

- Output: atomic IndexedDB account-rename operation, UI error feedback, focused tests.
- Acceptance: a unique trimmed new name updates account + all matching transaction names;
  transfer JSON account metadata follows; unrelated notes do not change; duplicate names
  reject without partial writes; rewritten rows are sync-dirty and sent/accepted by sync.
- Scope: web IndexedDB account form/store/adapter, transaction/transfer rewrite, dependent
  debt/settlement and budget name references, sync tests.
- Non-goals: account aliases, account merges, data-schema change, API/protocol changes,
  history preserving the old visible label, unrelated account deletion behaviour.
- Risks/contracts: `Transaction.account` is a name relation; each modified row must have
  a new sync version and cleared `syncedAt`. Preserve normal notes and transfer structure.
- Affected systems: AccountForm, TransactionPage/spendingStore, IAccountService,
  IndexedDB account/transaction tables, transfer helpers, IndexedDB sync storage/tests.
- Testing: adapter transaction atomicity, form/store feedback, transfer metadata, sync
  outbound + inbound application, focused Vitest and TypeScript type-check.
- Open questions: none — past records show the new label; duplicate names are rejected.

## Side-effect review

- Auth/permissions: no change; local authenticated sync payload only.
- Compatibility: existing account/transaction payload shapes unchanged.
- Data integrity: single IndexedDB read-write transaction; no partial rename.
- Security/privacy: no secrets or additional logging; defensive JSON parsing.
- Performance/concurrency: batch only matching indexed transactions; await before state refresh.
- Docs/config/deployment: no config or migration required; update docs only if public behavior is documented.

## Phases

1. [Account rename and sync validation](phase-01-account-rename-and-sync-validation.md) — completed (2026-07-28)

## Validated outcome

Atomic account-name migration now covers transactions, transfer metadata, debt and
settlement references, budget scopes, and sync dirty/version handling. Validation passed
156 focused tests plus direct UI TypeScript checking; final review scored 9.5/10.
