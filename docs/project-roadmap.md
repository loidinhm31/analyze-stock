# Money Insight project roadmap

Last updated: 2026-07-30

## Credit-card due/payment confirmation UX (2026-08-02)

- **Credit-card due/payment confirmation UX — complete**
  - Credit Card-only recurring due-day/reminder settings with derived date-only status (`upcoming`, `overdue`, `confirmed`, `not-configured`).
  - Responsive accessible per-card confirmation dialog; same-currency funding account, clearing amount, date, note, negative-balance gate, duplicate/error handling.
  - Confirmation remains local/atomic: excluded paired transfer, account cycle advance, and targeted store refresh; transfer legs stay out of reports.

See [the implementation plan](../plans/260801-1053-credit-card-payment-due-notifications/phase-04-add-account-payment-confirmation-ux.md).

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

- **Transaction date-grouped list — 100% (2026-07-30)**
  - Transactions now default to expanded daily groups; non-day periods retain bordered date sections so same-date rows remain clear.
  - Compact rows preserve special transaction states, privacy masking, and keyboard activation; current periods keep This Month/Week/etc. labels while future dates use exact dates.
  - No API, schema, sync, or service changes.
  - Quality gates: full UI Vitest 171/171, production web and native builds, and clean code review after fixes. Browser verification was limited by the local app having no populated transaction fixture; the Day default empty state was verified.

See [the implementation plan](../plans/260730-0206-transaction-date-grouped-list/plan.md)
for acceptance criteria and validation details.
