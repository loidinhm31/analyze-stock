# Phase 01 — Sync Contract and Preferences Foundation

## Context Links

- [Plan overview](./plan.md)
- [Architecture](../../docs/architecture.md)
- `packages/ui/src/adapters/web/database.ts`
- `packages/ui/src/adapters/web/sync/IndexedDBSyncStorage.ts`

## Overview

- **Date:** 2026-08-08
- **Priority:** P2
- **Status:** approved — implementation complete; release gates open
- **Approved:** 2026-08-08 12:13 ICT
- Establish a user-owned, synced singleton preference before building UI.

## Key Insights

- `transactionPagePreferences` is local-only and cannot meet cross-device persistence.
- Sync is generic but table coverage is explicit in storage and server code.
- Server-wins/version semantics are the existing conflict policy; do not add a custom merge.

## Requirements

- Persist unique canonical selected account-type keys in one `dashboardPreferences` row, ID `account-type-value-widget`.
- Support known types plus `__other__` for blank/unrecognised account types; reject malformed/duplicate values.
- Make created/updated/deleted rows participate in pull, push, ack, tombstone, and checkpoint flows.
- Coordinate server support first; do not release a client that emits an unsupported table.

## Architecture

`IDashboardPreferencesService` is injected by `ServiceFactory` and exposed by `PlatformContext`. Its IndexedDB adapter writes the singleton row and an outbox entry. `IndexedDBSyncStorage` serializes and merges it under existing server-wins rules. The external server validates user ownership and treats the record as an additive per-app table.

## Related Code Files

- Modify: `/mnt/data/ws/sharing/glean-oak/embed-app/money-insight/packages/shared/src/types/*` — preference type/export.
- Modify: `/mnt/data/ws/sharing/glean-oak/embed-app/money-insight/packages/ui/src/adapters/web/database.ts` — additive Dexie version/table.
- Create: `/mnt/data/ws/sharing/glean-oak/embed-app/money-insight/packages/ui/src/adapters/factory/interfaces/IDashboardPreferencesService.ts`.
- Create: `/mnt/data/ws/sharing/glean-oak/embed-app/money-insight/packages/ui/src/adapters/web/IndexedDBDashboardPreferencesAdapter.ts`.
- Modify: `ServiceFactory.ts`, facade exports, `MoneyInsightApp.tsx`, and `PlatformContext.tsx` — DI wiring.
- Modify: `IndexedDBSyncStorage.ts` and relevant sync tests — table serialization, remote upsert/delete, ack marking.
- Coordinate/modify outside this repo: `glean-oak-server` sync schema/table allowlists, validation, delta pull/push, acknowledgement, soft-delete TTL tests.

## Implementation Steps

1. Obtain server-contract owner confirmation: table name `dashboardPreferences`, per-user scope, fields, version rules, tombstone behavior, old-client behavior, and deployment order.
2. Add shared types: `DashboardPreferences` with sync fields and a narrow input type; centralize canonical type keys and a defensive normalizer.
3. Add Dexie version 5 (or next available version), table declaration, and accessor; do not alter existing table schemas.
4. Implement singleton read/upsert/delete adapter. Create row uses fixed ID; writes increment version, timestamps, and outbox entry atomically.
5. Wire interface, factory, facade, app initialization, and platform context following established debt/budget patterns.
6. Extend every client sync path: unsynced scan, record data, remote create/update/delete, ack/synced marking, pending-delete reconciliation, and table-specific tests.
7. Implement the matching server migration/contract and validate old clients ignore the added table safely.

## Todo List

- [ ] Active server `_schemas` rollout includes `dashboardPreferences` and is available in a compatible environment.
- [x] Shared type, DB migration, adapter, DI, and sync wiring complete.
- [x] Outbox, pull, ack, conflict, and deletion paths covered by focused validation.
- [ ] Authenticated real two-session delta-sync and stale-conflict validation passes against the active server.

## Success Criteria

- Offline edits enqueue one valid row and sync cross-device after a normal delta.
- Concurrent edits resolve exactly as the server's existing version policy specifies.
- Invalid data cannot reach storage or server; no existing sync table regresses.

## Risk Assessment

- Server absent or allowlist incomplete can silently strand the preference. Gate UI release on end-to-end server test.
- Fixed IDs require per-user server scope. Verify it explicitly.
- Approved warning: same-device preference delete/save is not transactional and can race in a narrow concurrent action window.

## Security Considerations

- Derive ownership from authenticated server context, never from client row data.
- Do not log preference payloads with auth tokens or user identifiers.

## Next Steps

Do not release Phase 01 until the active `_schemas` rollout and authenticated real two-session delta-sync/stale-conflict validation pass. Phase 02 may proceed because the contract shape is implemented, but live integration proof remains required.
