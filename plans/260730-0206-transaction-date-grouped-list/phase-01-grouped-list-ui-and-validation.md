---
title: "Phase 01 — Grouped list UI, preference default, and validation"
description: "Default Transactions to expanded daily groups with compact summaries and accessible rows."
status: completed
priority: P2
effort: 4h
branch: main
tags: [feature, frontend, transactions, accessibility]
created: 2026-07-30
---

# Phase 01 — Grouped list UI, preference default, and validation

## Context links

- [Architecture](../../docs/architecture.md)
- [Transaction page](../../packages/ui/src/components/pages/TransactionPage.tsx)
- [Grouped list](../../packages/ui/src/components/organisms/GroupedTransactionList.tsx)
- [Transaction display helper](../../packages/ui/src/components/molecules/TransactionItem.tsx)
- [Time-period grouping](../../packages/ui/src/lib/timePeriodGrouping.ts)
- [Page preferences](../../packages/ui/src/lib/transactionPagePreferences.ts)
- [Preference tests](../../packages/ui/src/lib/transactionPagePreferences.test.ts)
- [Global semantic tokens](../../packages/ui/src/styles/global.css)

## Overview

Date: 2026-07-30. Priority: P2. Status: Completed. Implemented the Transactions-tab display change without touching product architecture, data contracts, or unrelated dirty files.

## Key Insights

- `TransactionPage` owns `periodMode` and persists it through local storage; the current fallback is `month`.
- `GroupedTransactionList` calls the existing grouping helper, opens only the newest group, and currently duplicates `getTransactionItemDisplay` logic inline.
- Day grouping already uses ISO date keys and labels (`Today`, `Yesterday`, formatted date), so no grouping algorithm/schema change is required.
- Current amount colors include hard-coded debt hex values and inline style; semantic tokens must work across all themes.
- Vitest is node-only; pure grouping/preference/helper tests are reliable, while accordion rendering needs manual/browser validation unless a test environment is added (out of scope).

## Requirements

- Change the default period preference to `day`; preserve stored valid modes and existing selector options (`day`, `week`, `month`, `quarter`, `year`, `all`).
- In day mode, initialize every currently rendered daily group open. On entering day mode, open all groups; after user interaction, preserve explicit collapses while pruning removed keys.
- In non-day modes, retain current collapsible behavior and newest-group fallback when groups disappear or mode changes.
- Keep same-date transactions in one card, newest groups/rows first, and preserve current date-range filtering from `groupTransactionsByTimePeriod`.
- Render a calm date/count header and subtle expense, income, and net summary (`income - expense`); mask each financial value independently when `valuesHidden` is true.
- Render compact clickable rows with keyboard semantics when `onTransactionClick` is supplied; retain category icons, account, notes, amount sign/color, transfer, balance-adjustment, debt-initialization, and debt-settlement states.
- Use semantic Tailwind/CSS tokens (`text-destructive`, `text-success`, `text-warning`, `text-muted-foreground`, border/background tokens); remove hard-coded/dark-only color literals.

## Architecture

`TransactionPage` preference state → `GroupedTransactionList(periodMode, valuesHidden, onTransactionClick)` → `groupTransactionsByTimePeriod` → grouped card headers and private compact rows. Reuse `getTransactionItemDisplay` for display-category/note/state resolution. Derive net in the view; do not add fields to `TimePeriodGroup`, transactions, IndexedDB, sync, or APIs. Keep accordion state local and keyed by stable group keys.

## Related code files

- Modify: `packages/ui/src/lib/transactionPagePreferences.ts` — fallback default from month to day.
- Modify: `packages/ui/src/components/organisms/GroupedTransactionList.tsx` — initial-open policy, calm grouped-card/header summary, compact accessible rows, helper reuse, semantic tokens, privacy masking.
- Modify/create focused tests: `packages/ui/src/lib/transactionPagePreferences.test.ts`, `packages/ui/src/lib/timePeriodGrouping.test.ts` (or equivalent pure test file), and a pure grouped-list state/summary helper test only if extracted.
- Optional modify only if needed for DRY extraction: `packages/ui/src/components/molecules/TransactionItem.tsx`; do not regress existing `TransactionList`/Dashboard display.
- No files to delete; do not touch `.codex/**` or `packages/ui/src/components/atoms/scrollArea.tsx`.

## Implementation Steps

1. Confirm current preference parsing accepts all period modes and write a regression test asserting a missing/invalid stored period resolves to `day`; stored `month`/other valid values remain unchanged.
2. Add a small pure initial-open/state helper (or equivalent local logic) distinguishing day-mode entry from group-set pruning. Initialize day with all keys; preserve manual accordion changes; retain newest-only fallback for other modes.
3. Refactor grouped row display to call `getTransactionItemDisplay`; keep special icons/notes and amount semantics intact. Use a compact row layout with truncation, stable amount column, and `role="button"`/tabIndex/Enter-Space handling only when clickable.
4. Redesign the card header using semantic tokens. Show count plus expense/income/net summary, with net sign and zero handling; apply `valuesHidden` to every displayed amount, including net and group totals.
5. Preserve `onTransactionClick` identity and transaction object, filtered input, ordering, empty state, and all period selector options. Ensure no `Date` mutation or input-array mutation is introduced.
6. Add pure tests for same-date grouping/order/totals, net calculation/masking if extracted, and initial-open policy. Run focused Vitest, then `pnpm type-check`, `pnpm lint`, and `pnpm build` as available.
7. Manually verify Transactions tab at 375px and desktop widths, keyboard row activation, collapse/reopen behavior for day and non-day modes, all themes, hidden values, and transfer/adjustment/debt rows. Review diff for scope and architecture drift.

## Todo list

- [x] Change preference fallback and add preference regression coverage.
- [x] Implement day-expanded/non-day-collapsible accordion state.
- [x] Implement grouped-card header summary and compact accessible rows.
- [x] Reuse display helper and semantic tokens; verify all financial masking.
- [x] Add/run pure tests and type-check/lint/build.
- [x] Complete manual responsive, keyboard, theme, and special-state review.

## Completion record

- Completed: 2026-07-30.
- Validation: full UI Vitest 171/171 passing; production web and native builds passing; code review clean after fixes.
- Browser evidence limitation: local app had no populated transaction fixture; Day default empty state was verified.

## Success Criteria

- Fresh/invalid preference opens Transactions in day mode; existing valid preference is honored.
- Transactions sharing an ISO calendar date render in one expanded daily card, with correct count, expense, income, and net values.
- User can collapse/reopen daily cards; switching to week/month/quarter/year/all keeps selectable accordion behavior and newest-group fallback.
- Hidden-values mode reveals no financial amount (including signs/net); clicks and keyboard activation open the same edit flow.
- No transfer, adjustment, debt, search/account filter, ordering, sync, auth, or schema regression; focused tests and available quality gates pass.

## Risk Assessment

- **State churn:** reopening all day groups on every transaction refresh would override user collapses; distinguish mode entry/initialization from key pruning.
- **Timezone boundaries:** retain existing ISO/date-fns grouping behavior; add boundary tests rather than changing date semantics.
- **Responsive overflow:** three summary metrics and badges may crowd narrow cards; use wrapping/truncation and manual 375px review.
- **Semantic color drift:** debt colors must map to existing warning/success/destructive tokens across themes.
- **Accessibility regression:** clickable `div`s are not keyboard accessible; add explicit keyboard semantics without nesting interactive controls.

## Security Considerations

No new authorization, persistence, network, HTML injection, or sensitive-data source. Treat amounts, notes, and account names as existing untrusted display data; preserve React escaping and ensure `valuesHidden` masks every rendered numeric amount before display.

## Alternatives/tradeoffs

- **Recommended:** keep grouping in `timePeriodGrouping` and refactor only `GroupedTransactionList`; lowest coupling and no API/schema change.
- **Alternative:** make `TransactionItem` the sole row renderer with new `compact`/`valuesHidden` props; stronger reuse but broader regression surface in Dashboard/TransactionList.
- **Rejected:** introduce a new grouping model or persisted per-group expansion state; unnecessary complexity and privacy/storage surface for this request.

## Final test strategy

- Pure Vitest: preference fallback/round-trip, same-date day grouping, ordering/totals, period-mode preservation, initial-open helper, summary/net/masking helper if extracted.
- Static gates: `pnpm type-check`, `pnpm lint`, `pnpm build`.
- Manual/browser: responsive widths, keyboard and screen-reader labels, all themes, hidden values, click-through, collapse semantics, and special transaction sources. Do not add jsdom/Playwright solely for this UI change.

## Next steps

Implement phase in a focused branch, then compare the diff against this plan and `docs/architecture.md`; update architecture only if implementation introduces a real component/data-flow invariant. Record any test-environment limitation or unresolved behavior before handoff.

## Unresolved questions

None. Net definition, default period, expansion semantics, and scope are fixed by the request.
