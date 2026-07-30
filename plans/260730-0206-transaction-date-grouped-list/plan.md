---
title: "Transaction date-grouped list"
description: "Make the Transactions tab default to expanded daily groups with compact, privacy-safe summaries."
status: completed
priority: P2
effort: 4h
branch: main
tags: [feature, frontend, transactions, accessibility]
created: 2026-07-30
---

# Transaction date-grouped list

## Overview

Improve the Transactions tab scan path by defaulting to day groups, expanding daily cards initially, and showing calm date headers, compact clickable rows, and income/expense/net summaries. Existing week, month, quarter, year, and all modes remain selectable and collapsible.

## Completion record

- Completed: 2026-07-30.
- Delivered: day default, expanded daily groups, compact accessible rows, semantic summaries/tokens, helper reuse, and privacy masking.
- Validation: full UI Vitest 171/171 passing; production web and native builds passing; code review clean after fixes.
- Browser evidence limitation: local app had no populated transaction fixture; Day default empty state was verified.

## Preflight contract

- **Output:** day is the new default; same-date transactions appear in one card; daily cards start expanded; headers and rows remain usable on narrow screens.
- **In scope:** `TransactionPage` preference default, `GroupedTransactionList` presentation/state, semantic tokens, focused pure tests and manual UI checks.
- **Out of scope:** transaction data model, grouping API, routes, persistence beyond the existing local preference, services, sync, auth, and schema.
- **Contracts:** preserve `onTransactionClick`, transfer/adjustment/debt labels and styling states, ordering, filtering, and `valuesHidden` masking.
- **Architecture gate:** `docs/architecture.md` reviewed; no service/data-flow change. It is not edited because this task owns only the plan directory.
- **Open questions:** none; net is `income - expense` and is masked whenever values are hidden.

## Side-effect review checklist

- [x] Auth/session/permissions unchanged.
- [x] API, IndexedDB, migrations, sync, and public exports unchanged.
- [x] No new network calls, logging, or persisted financial data.
- [x] Existing preference storage remains backward-compatible; only its fallback default changes.
- [x] Verify render cost stays one grouping pass plus row rendering; no mutation of input transactions.
- [x] Review keyboard, screen-reader, dark/cyber theme, and narrow-width behavior.

## Phases

| # | Phase | Status | Effort | Link |
|---|---|---|---:|---|
| 1 | Grouped list UI, preference default, and validation | Completed (2026-07-30) | 4h | [phase-01](./phase-01-grouped-list-ui-and-validation.md) |

## Dependencies

- `groupTransactionsByTimePeriod` already emits day keys/labels and expense/income totals.
- `getTransactionItemDisplay` already defines transfer, adjustment, and debt display semantics.
- Existing shadcn/Radix Accordion, Tailwind semantic color tokens, and `valuesHidden` store state.
