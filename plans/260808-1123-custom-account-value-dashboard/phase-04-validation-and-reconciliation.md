# Phase 04 — Validation and Architecture Reconciliation

## Context Links

- [Plan overview](./plan.md)
- [Phase 01](./phase-01-sync-contract-and-preferences.md)
- [Phase 02](./phase-02-shared-balance-history.md)
- [Phase 03](./phase-03-dashboard-widget-and-ux.md)
- [Architecture](../../docs/architecture.md)

## Overview

- **Date:** 2026-08-08
- **Priority:** P2
- **Status:** completed — 2026-08-10 00:33:39 ICT
- Verify correctness across financial derivation, sync, UI privacy, and final architecture.

## Key Insights

- New table support fails silently if one explicit storage/server path is missed.
- Financial widgets need deterministic time and currency tests, not just a screenshot.
- Architecture Gate 2 is required: reconcile actual code with the design before completion.

## Requirements

- Run typecheck, focused Vitest coverage, and appropriate full suite/build gates.
- Test client DB/sync and external server contract together.
- Manually verify two authenticated sessions, offline/reconnect, concurrent writes, old-client safety, and privacy/theme/responsiveness.

## Architecture

Validation proves this flow: preference adapter/outbox → sync server → remote merge → dashboard projection → masked/unmasked widget. The reconciliation compares that flow and the documented singleton row with the implemented names, fields, sync order, and UI components.

## Related Code Files

- Modify/create tests beside all changed modules from Phases 01–03.
- Modify: `/mnt/data/ws/sharing/glean-oak/embed-app/money-insight/docs/architecture.md` only if implementation intentionally differs from the approved design.
- Modify external `glean-oak-server` contract/integration tests as required by Phase 01.

## Implementation Steps

1. Add Vitest tests for validation, Dexie migration, singleton CRUD, pending/outgoing records, remote upsert/delete, acknowledgement, and server-wins conflicts using fake-indexeddb.
2. Test balance projection with opening balances, same-day ordering, transfers, adjustments, three currencies, empty selection, Other bucket, account creation boundaries, 12-month range, average, and net-change fallback.
3. Add component tests for config accessibility, loading/error/empty states, per-currency separation, `valuesHidden` card/tooltip/accessible-text behavior, and no-transaction dashboard visibility.
4. Run `pnpm type-check`, focused `pnpm test:run`, then repository-required lint/build gates. Use a debugger only to root-cause failures; retest fixes.
5. Manually test authenticated two-session sync: save, offline edit, reconnect, concurrent server-wins edit, selection removal, and old client opening data.
6. Run code review for financial correctness, sync compatibility, privacy, performance, and YAGNI/KISS/DRY; fix critical findings and rerun affected tests.
7. Perform Architecture Gate 2: diff code against the new architecture section/diagram, correct unintended drift in code, document intentional drift, and record final commands/results.

## Todo List

- [x] Unit, DB, sync, and component coverage passes.
- [x] Privacy and UI validation covered by automated component tests; external two-session matrix waived by explicit user approval.
- [x] Typecheck, lint (0 errors; 29 pre-existing warnings), and build gates pass.
- [x] Review and Architecture Gate 2 complete; external server/release validation retained as waived follow-up.

## Success Criteria

- All acceptance criteria in `plan.md` have automated evidence or documented manual evidence.
- No server/client compatibility gap, raw-value privacy leak, or cross-currency total remains.
- Architecture accurately reflects the shipped implementation.

## Risk Assessment

- Browser-only behavior may evade node tests; include a real browser/manual check.
- Server deployment order can block release; deploy support before enabling client emission.

## Security Considerations

- Exercise authorization on pull/push with a second user, not only a second device.
- Keep test fixtures synthetic; do not capture real financial records or tokens.

## Validation Evidence

- UI tests: 244/244 passed (`TMPDIR=/dev/shm`).
- Type-check: passed.
- Lint: passed with 0 errors and 29 pre-existing warnings.
- Build: passed.
- External server `_schemas` deployment and authenticated two-session sync/conflict validation: explicitly waived by the user on 2026-08-10 00:33:39 ICT; retained as follow-up, not a blocker.

## Next Steps

Phase 04 is complete with the approved waiver. External server deployment and authenticated two-session validation remain release follow-ups if production evidence is later required.
