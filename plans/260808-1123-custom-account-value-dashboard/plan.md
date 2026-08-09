---
title: "Custom account type value dashboard"
description: "Add one synced dashboard widget that shows selected account-type balances by currency."
status: completed
priority: P2
effort: 14h
branch: main
tags: [feature, frontend, database, api]
created: 2026-08-08
---

# Custom Account Type Value Dashboard

## Overview

Deliver one inline, cross-device-configured `/dashboard` widget. Users select account types; it shows separate currency totals, 12 completed month-end balances, and a trailing metric.

## Preflight Contract

- **Output:** synced account-type value widget; multi-select config; per-currency current values/history; privacy masking.
- **Acceptance:** config persists/syncs; balances honor opening balance, transfers, adjustments; never sum currencies; safe empty states; tests and typecheck pass.
- **Scope:** one inline widget. **Non-goals:** drag/drop layouts, FX conversion, account-level selection, custom ranges, snapshots, price feeds.
- **Risk/public contracts:** new sync table/server contract; server-wins edits; old-client compatibility; financial derivation; uncontrolled type strings; private values.
- **Affected systems:** shared types; Dexie/sync storage; service DI/platform setup; dashboard UI; external `glean-oak-server` contract.
- **Testing:** strict TypeScript; focused Vitest unit/DB/sync/component tests; manual two-session sync, privacy, theme, responsive checks.
- **Open questions:** active server `_schemas` rollout and authenticated two-session sync proof remain release gates.

## Approaches

| Option | Trade-off |
|---|---|
| LocalStorage preference | Smallest change, but violates cross-device requirement. Reject. |
| Synced singleton `dashboardPreferences` row | Small schema/service cost; matches offline sync and only supports the MVP widget. **Recommend.** |
| Generic dashboard layout/widget registry | Enables future widgets, but adds needless schema, migrations, and UX complexity. Reject. |

## Phases

| # | Phase | Status | Effort | Link |
|---|---|---|---:|---|
| 1 | Sync contract and preferences foundation | approved — implementation complete; release gates open | 4h | [phase 01](./phase-01-sync-contract-and-preferences.md) |
| 2 | Shared account-value derivation | completed — 2026-08-08 15:45:49 ICT | 3h | [phase 02](./phase-02-shared-balance-history.md) |
| 3 | Configurable dashboard widget | completed — 2026-08-09 23:30:55 ICT; final review approved (8/10, zero criticals) | 4h | [phase 03](./phase-03-dashboard-widget-and-ux.md) |
| 4 | Validation and architecture reconciliation | completed — 2026-08-10 00:33:39 ICT; user-approved server/release-gate bypass | 3h | [phase 04](./phase-04-validation-and-reconciliation.md) |

## Side-effect Review

- [ ] Auth/user scoping and server-wins conflict handling are explicit.
- [ ] Client/server table name, row shape, sync routes, allowlists, tombstones, ack and pull merge are compatible.
- [ ] Dexie migration is additive; old clients ignore the table safely.
- [ ] No account/transaction mutation or currency conversion is introduced.
- [ ] `valuesHidden`, accessibility, malformed data, no transactions/accounts/selection/history are safe.
- [ ] Calculation avoids repeated expensive transforms; UI uses memoized derived input.
- [ ] No secrets/logging changes; docs and release/rollback notes are covered.

## Handoff

Run `/code plans/260808-1123-custom-account-value-dashboard`. The active-plan script is absent (`.codex/scripts/set-active-plan.cjs`), so no local substitute was created. Frontend execution must engage `ui-ux-designer` and follow `docs/architecture.md` plus `docs/code-standards.md`.

## Unresolved Questions

- **Release gates:** the active `glean-oak-server` `_schemas` configuration must include `dashboardPreferences`, and an authenticated two-session delta-sync/stale-conflict check must pass before release.
- **Approved warnings (2026-08-08 12:13 ICT):** same-device preference delete/save is not yet transactional; live server integration proof remains outstanding.
- **Phase 02 final review (2026-08-08 15:45:49 ICT):** approved and completed. Encoded ISO calendar dates are compared as date-only values (offsets and `Z` suffixes are not converted to runtime timezone); compatible transactions are grouped once and reused for current/history calculations; January-boundary, local-midnight account creation, and same-day `createdAt` ordering assertions pass.
- **Phase 03 final review (2026-08-09 23:30:55 ICT):** approved (8/10, zero criticals). Validation: 40 UI test files / 242 tests; type-check, lint, and build passed. Root `pnpm test:run` was unavailable because the host returned `/tmp` error `-122` (disk quota).
- **Waived follow-up (2026-08-10 00:33:39 ICT):** User explicitly approved bypassing the external server `_schemas` deployment and authenticated two-session release gate. These remain unverified follow-ups, not blockers for this approved phase completion.
