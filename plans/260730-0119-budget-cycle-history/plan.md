---
title: "Budget cycle history"
description: "Browse prior budget cycles using recalculated spending."
status: completed
priority: P2
effort: 3h
branch: main
tags: [feature, frontend]
created: 2026-07-30
---

# Budget cycle history

## Overview

Let people browse prior budget cycles without creating stored snapshots. Each view recalculates historical transactions against the budget's current definition.

## Preflight contract

- **Output:** accessible previous/next month controls and selected-period budget usage.
- **Acceptance:** defaults to today; previous works; next/future is disabled; no selection before a budget's first cycle; cards show correct historical spend and their actual date ranges.
- **In scope:** page-local selection, existing usage calculation, unit tests.
- **Out of scope:** snapshots, schema/API/sync changes, independent per-budget selectors.
- **Risk/contracts:** current configuration retroactively affects history by design; no auth, permissions, storage, or public API change.
- **Files:** `BudgetPage.tsx`, optional date helper, budget/store tests, `docs/architecture.md`.
- **Testing:** focused Vitest tests, type-check, lint/build as available; keyboard and narrow-screen manual check.
- **Open questions:** none.

## Side-effect review

- Auth/session/permissions: unaffected.
- API/client compatibility, DB, migrations, sync: unaffected.
- Business logic: explicitly recalculated history, bounded by today and start dates.
- Security/privacy/logging: no new data exposure.
- Performance: reuse loaded transactions; calculate only visible budget usage.
- Docs/config/deployment: architecture invariant updated; no configuration.

## Phases

| # | Phase | Status | Effort | Link |
|---|---|---|---:|---|
| 1 | Cycle browsing UI and validation | Completed | 3h | [phase-01](./phase-01-cycle-browsing-ui-and-validation.md) |

## Dependencies

- Existing `budgetStore.refreshUsage(..., asOfDate)` and budget cycle calculations.
- Existing responsive shadcn/Tailwind component conventions.

## Completion

- **Completed:** 2026-07-30
- **Validation:** Full test suite 159/159 before final change; focused budget-cycle tests 10/10 after final change; direct UI/web TypeScript checks passed; web production build passed (existing Vite chunking warnings only).
- **Result:** Historical cycle browsing, bounded month navigation, and recalculated usage are implemented without persistence, schema, API, auth, or sync changes.
