# Phase 01 — Cycle browsing UI and validation

## Context links

- [Architecture](../../docs/architecture.md)
- [Budget page](../../packages/ui/src/components/pages/BudgetPage.tsx)
- [Usage calculator](../../packages/ui/src/lib/budget-calculations.ts)
- [Store tests](../../packages/ui/src/stores/budgetStore.test.ts)

## Overview

Priority: P2. Status: Completed. Date: 2026-07-30. Added a shared monthly reference date for the page; each card still renders its own anchored cycle range.

## Key insights

- The store can calculate usage for any ISO reference date, using all locally loaded transactions.
- `getBudgetCycleForDate()` clamps dates before `firstCycleStartDate`; the UI must prevent those selections.
- Budgets are recurring definitions, so history is intentionally recalculated from current settings.

## Requirements

- Default to the existing current-date behavior.
- Provide labelled, keyboard-accessible previous/next controls and a clear selected-month label.
- Disable next at the current month and previous when it would produce no available budget cycle.
- Recalculate the selected cycle when budgets or transactions refresh; do not add persisted history.

## Architecture

`BudgetPage` owns the ephemeral reference date → supplies it to existing store usage calculation → `BudgetProgressList` renders the existing `BudgetUsage` map. No service, Dexie, sync, or route contract changes.

## Related code files

- Modify: `packages/ui/src/components/pages/BudgetPage.tsx` — selected reference date, navigation, refresh coordination.
- Modify only if needed: `packages/ui/src/lib/budget-calculations.ts` — pure month-boundary helper.
- Modify: `packages/ui/src/lib/budget-calculations.test.ts`, `packages/ui/src/stores/budgetStore.test.ts` — historic and boundary tests.
- Modify: `docs/architecture.md` — completed design invariant.
- Create only if justified: a focused pure date-navigation helper and matching test.

## Implementation steps

1. Inspect `BudgetPage` and its existing primitive/icon conventions; have the UI/UX review preserve the page’s visual system and mobile spacing.
2. Define UTC-safe monthly reference-date transitions and the earliest selectable month across active/paused budgets; preserve today as the upper bound.
3. Render the period toolbar, including descriptive `aria-label`s, disabled states, and a concise recalculated-history explanation if it fits existing copy conventions.
4. Refresh usage with the chosen ISO date after selection and after store/data changes without stale current-cycle overwrites.
5. Add tests for historical filtering, future blocking, first-cycle blocking, and correct store usage; run focused Vitest, then type-check/lint/build as feasible.
6. Review the final diff against the architecture invariant and verify keyboard + 375px layout manually.

## Todo list

- [x] Implement selection/navigation and refresh behavior.
- [x] Add focused tests.
- [x] Run validation and review.

## Success criteria

- A user can browse valid previous month references and return to the current month.
- No controls select future or pre-budget cycles.
- Historical spending excludes adjacent cycles and reflects the existing filters.
- Existing current-cycle and mutation behavior remains correct.

## Risk assessment

- Multiple budget start days mean a shared month reference maps to different card ranges; retain each card’s range label.
- UTC is the current system convention; use it consistently to avoid local-midnight drift.
- Current definition changes history; label/document this behavior, not a snapshot claim.

## Security considerations

No new data, permissions, network requests, user input, or rendered HTML surface.

## Next steps

Phase completed 2026-07-30. Audit-grade snapshots remain out of scope.

## Final validation

- Full test suite: 159/159 passed before the final plan-only change.
- Focused budget-cycle tests: 10/10 passed after the final implementation change.
- Direct UI/web TypeScript checks: passed.
- Web production build: passed; existing Vite chunking warnings only.
