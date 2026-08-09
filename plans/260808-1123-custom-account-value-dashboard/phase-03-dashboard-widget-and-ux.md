# Phase 03 — Dashboard Widget and UX

## Context Links

- [Plan overview](./plan.md)
- [Phase 01](./phase-01-sync-contract-and-preferences.md)
- [Phase 02](./phase-02-shared-balance-history.md)
- `packages/ui/src/components/pages/DashboardPage.tsx`
- `packages/ui/src/components/templates/Dashboard.tsx`
- `packages/ui/src/components/organisms/MonthlyTrendChart.tsx`

## Overview

- **Date:** 2026-08-08
- **Priority:** P2
- **Status:** completed — 2026-08-09 23:30:55 ICT; final review approved (8/10, zero criticals)
- Add one responsive, accessible account-type value widget and its configuration.

## Key Insights

- The existing no-transactions branch hides DashboardPage entirely; a configured widget must remain reachable with accounts but no transactions.
- Existing `MonthlyTrendChart` uses income/expense flow, so reuse its visual primitives only—not its data contract.
- Value masking currently follows a parent `valuesHidden` control and must cover totals, summary, axes/labels where numeric, and tooltips.

## Requirements

- Let users open an accessible config control and select one or more canonical account-type buckets; clearing every type deletes the singleton preference and returns the widget to its unconfigured state.
- Render one card per currency, current value, 12-month chart, and trailing metric/fallback label.
- Gracefully handle loading, no selection, no matching accounts, no transactions/history, malformed remote selection, and sync error/retry state.
- Preserve existing dashboard filters: widget always uses the full account/transaction state, not report filters.

## Architecture

`DashboardPage` selects accounts, transactions, `valuesHidden`, and preference service data. A memoized selector/helper projection is passed to an `AccountTypeValueWidget` organism. The widget owns only dialog/popover interaction; persisted selection lives in the synced service. Prefer a dedicated chart component/data contract over overloading flow analytics.

## Related Code Files

- Modify: `/mnt/data/ws/sharing/glean-oak/embed-app/money-insight/packages/ui/src/components/pages/DashboardPage.tsx` — load preference, prevent upload-only dead end, pass data.
- Modify: `/mnt/data/ws/sharing/glean-oak/embed-app/money-insight/packages/ui/src/components/templates/Dashboard.tsx` — stable placement/props.
- Create: `packages/ui/src/components/organisms/AccountTypeValueWidget.tsx` and focused tests.
- Create if separation keeps files focused: `AccountTypeValueChart.tsx` and/or `AccountTypeValueWidgetConfig.tsx`.
- Modify: `packages/ui/src/components/organisms/index.ts` — exports.

## Implementation Steps

1. During `/code`, engage `ui-ux-designer` before UI edits; follow architecture and code standards because no `docs/design-guidelines.md` exists.
2. Design the card hierarchy: title/configure action, selection summary, per-currency cards, chart legend/tooltip, and clear empty/error states. Use semantic theme variables and mobile-first layout.
3. Use Checkbox/Popover/Dialog primitives with labelled controls, keyboard navigation, clear save/cancel semantics, and an explicit `Other / unclassified` option.
4. Load/save preferences through the injected service, show a non-destructive error with retry, and avoid optimistic state diverging from server-wins sync.
5. Pass full unfiltered store accounts/transactions to the memoized projection. Do not add financial data to `walletBalances` or reuse `monthlyAnalysis`.
6. Replace upload-only dashboard rendering with a layout that can show the widget plus first-transaction guidance. Retain CSV/manual-entry flows.
7. Mask every value in cards and tooltip; ensure no raw numeric value leaks via aria-label/title when hidden. Keep chart geometry non-sensitive or hide the value-bearing chart when masking is enabled.

## Todo List

- [x] UI/UX design review complete.
- [x] Config persists through synced service.
- [x] Per-currency widget and all empty states render.
- [x] Privacy, keyboard, theme, and small-screen behavior covered.

## Success Criteria

- A user can select types, sync, and observe the same config in another session.
- A mixed-currency selection renders distinct cards/series only.
- Dashboard remains useful with accounts but zero transactions; no console errors or hidden-value leaks.

## Risk Assessment

- A chart library tooltip can bypass normal text masking. Test its rendered portal/DOM explicitly.
- Uncontrolled type values can disappear after edits; retain saved keys and map unexpected accounts to Other.

## Security Considerations

- Preference writes require the authenticated user's configured sync context.
- `valuesHidden` is a display privacy control, not access control; no values may be exposed in visible or accessible text while active.

## Next Steps

Validation evidence: 40 UI test files / 242 tests; type-check, lint, and build passed. Root `pnpm test:run` was unavailable because the host returned `/tmp` error `-122` (disk quota). Phase 01 server `_schemas` and authenticated two-session release gates remain outstanding; proceed with Phase 04 validation and architecture reconciliation.
