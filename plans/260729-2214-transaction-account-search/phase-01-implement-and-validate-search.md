# Phase 01 — Implement and validate both searches

## Context links

- Parent: [plan.md](plan.md)
- Architecture: [docs/architecture.md](../../docs/architecture.md)
- Standards: [docs/code-standards.md](../../docs/code-standards.md)
- Primary page: [TransactionPage.tsx](../../packages/ui/src/components/pages/TransactionPage.tsx)
- Existing primitives: [SearchInput.tsx](../../packages/ui/src/components/organisms/SearchInput.tsx),
  [utils.ts](../../packages/ui/src/lib/utils.ts)

## Overview

- Date: 2026-07-29
- Priority: P2
- Planning status: complete
- Implementation status: complete (2026-07-29)
- Effort: 1.5h
- Deliverable: transaction and account text search within existing tab layouts.

## Key insights

- `TransactionPage` already owns tab state, account filtering, grouping, and list props.
- `SearchInput` supplies debounced input and clear behavior; reuse it twice.
- `matchesSearch` already covers transaction note, category, account, event, amount, and date.
- Account search only needs normalized `account.name.includes(query)` matching.
- `AccountStats` and `accountBalances` describe the full portfolio and must stay unfiltered.
- Node-based Vitest has no browser component harness; avoid adding one for this feature.

## Requirements

- Render transaction search inside the sticky Transactions controls, alongside the existing
  action, group-by, and account-filter controls without removing or persisting any control.
- Maintain separate local `transactionSearch` and `accountSearch` state.
- Derive `displayTransactions` with `useMemo`: first/within one pass enforce selected account
  and `matchesSearch(transaction, transactionSearch)`; pass result to header/list.
- Render account search in Accounts above list content; derive `filteredAccounts` with
  trimmed, case-insensitive name matching and pass only that array to `AccountList`.
- Continue passing full `accounts` and full `accountBalances` to `AccountStats`.
- Blank/whitespace query and clear action restore eligible items. No-results UI uses each
  existing list's empty state; all entity action callbacks continue to work.
- Keep tab searches ephemeral: no localStorage, Zustand, URL, service, or sync changes.

## Architecture

```text
transactions + selectedAccount + transactionSearch
  -> memoized combined filter -> GroupedTransactionList

accounts + accountSearch -> memoized name filter -> AccountList
accounts + accountBalances -----------------------> AccountStats
```

This extends existing page-local presentation state only. No new component, store action,
service call, database operation, API contract, or architecture diagram required.

## Related code files

- Modify: `packages/ui/src/components/pages/TransactionPage.tsx` — import `SearchInput` and
  `matchesSearch`; add local state, memoized derived arrays, and both controls.
- Reference only: `packages/ui/src/components/organisms/SearchInput.tsx` — debounce/clear API.
- Reference only: `packages/ui/src/lib/utils.ts` — existing transaction match semantics.
- Reference only: `packages/ui/src/components/organisms/AccountList.tsx` — filtered-list prop
  and existing empty/count behavior.
- Reference only: `packages/ui/src/components/molecules/AccountStats.tsx` — full-data invariant.
- Optional test modification only if pure behavior needs added coverage:
  `packages/ui/src/lib/utils.test.ts`. Do not introduce a browser harness.
- Do not touch user-owned untracked
  `packages/ui/src/components/atoms/scrollArea.tsx`.
- Create/delete: none expected.

## Implementation steps

1. Invoke `/code plans/260729-2214-transaction-account-search/plan.md`; execution must first
   call `ui-ux-designer` to validate responsive placement and accessibility against existing
   UI patterns because `docs/design-guidelines.md` is absent.
2. In `TransactionPage`, import existing `SearchInput` and `matchesSearch`; add two local
   query states. Do not add preferences or store fields.
3. Replace the current account-only `displayTransactions` expression with a memoized combined
   filter. Preserve selected-account entity lookup and persisted account/group-by behavior.
4. Add memoized `filteredAccounts` using normalized name matching. Keep account balances and
   AccountStats derived from/pass the full `accounts` array.
5. Place transaction search in the sticky filter block and account search above the accounts
   list. Use clear placeholders and preserve keyboard focus, labels, and mobile layout.
6. Add/adjust focused pure tests only where they add behavior coverage without new tooling.
   Manually verify both tabs, clear/blank/no-result cases, account+text intersection, grouping,
   stats invariance, callbacks, mobile width, and tab switching.
7. Run `pnpm --filter @money-insight/ui test:run`, then `pnpm type-check`. Call `tester` to
   independently run/report validation; use `debugger` for failures and retest fixes.
8. Call `code-reviewer` for security, performance, architecture, accessibility, and
   YAGNI/KISS/DRY review. Fix critical findings and repeat affected checks.

## Todo list

- [x] UI/UX designer validates control placement and accessibility
- [x] Add separate local search states and reuse existing search primitives
- [x] Compose transaction account + text filtering and keep grouping intact
- [x] Filter AccountList by name while keeping AccountStats unfiltered
- [x] Validate empty, clear, no-result, action, and responsive behavior
- [x] Run tests and type-check through tester; investigate/retest failures
- [x] Complete code review; fix critical findings and retest

## Validation results

- UI test suite: 25 files / 156 tests passed.
- `pnpm --filter @money-insight/web build`: passed.
- Browser transaction-tab search visual and ARIA smoke checks: passed.
- Code review: 9.5/10; no critical findings or warnings.

## Success criteria

- Transaction text search matches the established `matchesSearch` fields and intersects with
  selected account; GroupedTransactionList still groups the resulting rows by chosen period.
- Account search is case-insensitive and name-only; AccountList count/items reflect matches,
  while AccountStats totals/currencies/balance still reflect every account.
- Both clear controls restore results after debounce; blank input behaves like no filter.
- Existing account/group-by preference behavior and all edit/delete/transfer actions work.
- UI package tests and root type-check pass; tester and code reviewer report no critical issue.

## Risk assessment

- Filter-order drift could ignore account selection. Mitigation: one derived expression and
  explicit combined-filter validation.
- Filtering stats could misstate portfolio totals. Mitigation: full arrays remain on stats path.
- Recomputing each render could be wasteful. Mitigation: `useMemo` with minimal dependencies.
- Sticky controls may crowd small screens. Mitigation: UI/UX review and responsive browser check.

## Security considerations

Search input is display-only local state. No HTML injection, logging, persistence, network,
auth, permission, or sensitive-data surface added. Render existing model values via React.

## Next steps

After implementation and all quality gates pass, update plan/phase status and record validation
results. No docs, config, deployment, database, API, auth, or onboarding follow-up expected.

## Unresolved questions

None.
