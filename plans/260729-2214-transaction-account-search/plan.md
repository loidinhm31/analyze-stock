---
title: "Transaction and account search"
description: "Add local text search to both TransactionPage tabs without changing persisted filters or account totals."
status: completed
priority: P2
effort: 1.5h
branch: main
tags: [feature, frontend, ux]
created: 2026-07-29
---

# Transaction and account search

Planning status: complete. Implementation status: complete (2026-07-29).

## Goal

Add debounced text search to Transactions and Accounts. Transaction search composes with
the existing account filter and grouping control. Account search affects the list only.

## Preflight contract

- Output: two reusable `SearchInput` controls plus local derived filters in TransactionPage.
- Acceptance: transaction queries use existing `matchesSearch`; account + text filters
  intersect; grouping still receives the combined result; account queries match names
  case-insensitively; clearing or blank/whitespace queries restores all eligible rows.
- Scope: TransactionPage UI state, filter composition, responsive placement, focused tests
  and manual validation. Search state remains ephemeral for the mounted page.
- Non-goals: persistence, fuzzy search, new helpers/components, store/service changes,
  AccountStats filtering, server search, pagination, schema/sync/API changes.
- Risks/contracts: preserve existing stored account/group-by preferences and unfiltered
  account balance totals. Keep edit/delete/transfer callbacks bound to original entities.
- Affected systems: `TransactionPage`, existing `SearchInput`, `matchesSearch`,
  `GroupedTransactionList`, `AccountList`, and `AccountStats` inputs.
- Testing: focused Vitest coverage where practical, UI package tests, root type-check,
  responsive browser checks, tester validation, then code review.
- Open questions: none.

## Architecture decision

Use two `useState` strings and memoized derived arrays inside `TransactionPage`. Reuse
`SearchInput` and `matchesSearch`; filter account names inline. No architecture-doc update:
the existing TransactionPage-to-list dataflow and public contracts remain unchanged.

## Side-effect review

- Auth/session/permissions: no change.
- API/client/public contracts: no change; component props remain valid.
- Database/migrations/data integrity: no reads or writes added.
- Business logic: filtering changes visibility only; stats and balances use full data.
- Security/privacy/logging: local in-memory input; no logging, network, or secret exposure.
- Performance/concurrency/resources: linear in-memory filters; memoize by data/query/filter.
- Docs/config/onboarding/deployment: none. `docs/development-rules.md` and
  `docs/design-guidelines.md` are absent; follow existing repository patterns.

## Phase

| # | Phase | Status | Effort | Details |
|---|---|---|---|---|
| 1 | Implement and validate both searches | Complete | 1.5h | [phase 01](phase-01-implement-and-validate-search.md) |

## Handoff

Completed 2026-07-29. UI/UX placement and accessibility smoke validation passed; tester
validation passed (25 UI test files / 156 tests); web production build passed; browser
transaction-tab search visual/ARIA smoke passed; final code review scored 9.5/10 with no
critical findings or warnings.

## Unresolved questions

None.
