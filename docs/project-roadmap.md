# Money Insight project roadmap

Last updated: 2026-07-29

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
