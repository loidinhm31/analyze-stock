# Phase 02 — Shared Balance History

## Context Links

- [Plan overview](./plan.md)
- [Phase 01](./phase-01-sync-contract-and-preferences.md)
- `packages/ui/src/services/balanceAdjustmentService.ts`
- `packages/ui/src/components/pages/TransactionPage.tsx`
- `packages/ui/src/stores/spendingStore.ts`

## Overview

- **Date:** 2026-08-08
- **Priority:** P2
- **Status:** completed — 2026-08-08 15:45:49 ICT
- Extract a pure balance projection so dashboard and transactions share semantics.

## Key Insights

- Current balance is opening balance plus each signed transaction; transfers and adjustments are already represented by transaction legs.
- Existing dashboard balances lose `accountType`; the transaction page duplicates balance calculation.
- Flow analytics cannot stand in for historical balances.

## Requirements

- Preserve current balance semantics including opening balances, transfers, adjustments, same-day ordering, and deleted-row exclusion as established by source data.
- Group only selected accounts; group results by currency with no cross-currency sums.
- Return current totals plus exactly the latest 12 completed calendar month-end points per currency.
- A month/currency is unknown (`null`), not zero, when no selected account existed by that month-end.

## Architecture

Create a pure helper module beside balance services. It accepts accounts, transactions, selection, and an injected/reference date; it returns immutable per-currency series. Account type normalization maps only the five canonical labels directly; blanks/custom labels map to `__other__`. `getBalanceAtDate` remains the canonical account-level primitive or is refactored into the helper without behavior change.

## Related Code Files

- Modify: `/mnt/data/ws/sharing/glean-oak/embed-app/money-insight/packages/ui/src/services/balanceAdjustmentService.ts` — extract/reuse shared primitives only if needed.
- Create: `/mnt/data/ws/sharing/glean-oak/embed-app/money-insight/packages/ui/src/services/account-type-value-history.ts` and test.
- Modify: `packages/ui/src/components/pages/TransactionPage.tsx` — replace duplicated current-balance logic.
- Modify: `packages/ui/src/services/balanceAdjustmentService.test.ts` and `packages/ui/src/stores/spendingStore.test.ts` only as regression coverage requires.

## Implementation Steps

1. Characterize existing `getBalanceAtDate` and TransactionPage calculations with tests before extraction.
2. Implement type bucketing and selected-account filtering without mutating input arrays.
3. Produce current balance per selected account, then sum only accounts sharing a currency.
4. Generate the 12 completed calendar month ends ending with the previous calendar month. For each account, include it only when `createdAt` is on/before the end date; then use the shared balance primitive.
5. Store missing currency-month values as `null`; never fabricate zero points.
6. For each currency, average its latest up-to-three non-null completed month-end values. If there are none, expose current-calendar-month net signed transaction change and label it `Net change` rather than an average.
7. Replace TransactionPage duplication and add focused deterministic date, order, currency, new-account, adjustment, transfer, and fallback tests.

## Todo List

- [x] Existing behavior characterized.
- [x] Pure projection has no React/IndexedDB dependency.
- [x] Duplicate TransactionPage calculation removed.
- [x] Boundary and multi-currency tests pass.

## Success Criteria

- Identical inputs yield stable, date-boundary-safe output.
- A new account does not create false pre-creation history.
- No helper path sums USD with VND (or any different currencies).

## Risk Assessment

- Date parsing/time-zone drift can alter closing balances. Use existing ISO/date-only conventions and injected date in tests.
- Refactoring can regress adjustments; retain all existing adjustment tests.

## Security Considerations

- This helper is derived, in-memory math only; it persists no financial snapshots or analytics.
- Callers must still apply `valuesHidden` at every UI rendering point.

## Next Steps

Phase 03 consumes the projection and synced selection after Phase 01's contract gate.

## Final Review Resolution

- **Encoded-ISO calendar-date convention:** account `createdAt` uses the `YYYY-MM-DD`
  calendar date encoded at the start of the ISO value. Offset and `Z` suffixes are
  not converted to runtime timezone; this keeps synced projections deterministic and
  includes an account created at local midnight on that encoded date.
- **Transaction-map reuse:** compatible selected-account transactions are filtered and
  grouped once, then reused for current balances, month-end history, and net-change
  fallback.
- **Boundary/order assertions:** focused tests cover January as the prior completed
  month at a February boundary, same-day transaction ordering by `createdAt`, and an
  offset timestamp at local midnight.

## Validation and Review Evidence

- `pnpm exec vitest run packages/ui/src/services/account-type-value-history.test.ts` —
  9/9 tests passed.
- `pnpm type-check` — 4/4 package checks passed (shared, UI, web, Tauri).
- Final review approved by user on 2026-08-08; Phase 02 closed at
  2026-08-08 15:45:49 ICT.
