# Money Insight project roadmap

Last updated: 2026-07-30

## Completed milestones

- **Account rename transaction migration — 100% (2026-07-28)**
  - Atomic rename propagates account labels across transactions, transfer metadata,
    debt/settlement references, and budget scopes.
  - Sync dirty/version handling validated for outbound and inbound records.
  - Quality gates: 156 tests, direct UI TypeScript check, final review 9.5/10.

See [the implementation plan](../plans/260728-1650-account-rename-transaction-migration/plan.md)
for acceptance criteria and validation details.

- **Transaction and account search — 100% (2026-07-29)**
  - Added local, debounced search to Transactions and Accounts while preserving account
    totals, grouping, persisted filters, and existing row actions.
  - Quality gates: 25 UI test files / 156 tests, production web build, browser visual/ARIA
    smoke checks, and final review 9.5/10 with no critical findings or warnings.

See [the implementation plan](../plans/260729-2214-transaction-account-search/plan.md)
for acceptance criteria and validation details.

- **Budget cycle history — 100% (2026-07-30)**
  - Added bounded previous/current month browsing for budget usage, including first-cycle and future-month guards.
  - Historical usage is recalculated from current transactions and budget definitions; no snapshots or sync/schema changes.
  - Quality gates: full suite 159/159, focused cycle tests 10/10, direct UI/web TypeScript checks, and production web build (existing Vite chunking warnings only).

See [the implementation plan](../plans/260730-0119-budget-cycle-history/plan.md)
for acceptance criteria and validation details.
