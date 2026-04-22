# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Money Insight is a personal finance tracking app with offline-first sync. Turborepo monorepo running as web app or Tauri desktop app.

## Build & Development Commands

```bash
pnpm dev:web          # Web dev server (port 25096)
pnpm dev:tauri        # Tauri desktop app with hot reload
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm test             # Run tests in watch mode (vitest)
pnpm test:run         # Run tests once
pnpm format           # Format code with Prettier
pnpm type-check       # TypeScript type checking
```

### Tauri/Rust Development

```bash
cd apps/native/src-tauri
cargo build           # Build Rust backend
cargo test            # Run Rust tests
```

## Architecture

### Monorepo Structure

```
apps/
  web/              # Standalone web app (Vite + React)
  native/           # Tauri desktop app
    src-tauri/      # Rust backend (auth, sync, web server)
packages/
  ui/               # Shared UI (components, adapters, hooks, stores)
  shared/           # Types, constants, utilities
```

### Service Architecture

Services are injected via `ServiceFactory` (`packages/ui/src/adapters/factory/ServiceFactory.ts`) using setter functions:

```typescript
setTransactionService(new IndexedDBTransactionAdapter());
setAuthService(isTauri() ? new TauriAuthAdapter() : new QmServerAuthAdapter());
```

**Data Services** - All platforms use IndexedDB via Dexie (`packages/ui/src/adapters/web/`):

- `IndexedDBTransactionAdapter`, `IndexedDBCategoryAdapter`, `IndexedDBAccountAdapter`
- Database schema in `packages/ui/src/adapters/web/database.ts`

**Auth Services** - Platform-specific:

- `TauriAuthAdapter` - Uses Tauri IPC commands to Rust backend
- `QmServerAuthAdapter` - HTTP calls to glean-oak-server

**Platform Context** - Services provided to React tree via `PlatformProvider` (`packages/ui/src/platform/`)

### Component Architecture

Atomic design in `packages/ui/src/components/`:

- `atoms/` - Primitives (Button, Input, Card, **CategoryIcon**)
- `molecules/` - Composed (DatePicker, TransactionItem, **IconPicker**)
- `organisms/` - Features (TransactionList, Charts)
- `pages/` - Full pages (DashboardPage, TransactionPage)
- `templates/` - Layouts (AppShell)

#### Performance & Memoization

Phase-03 optimizations use **single-pass useMemo** to avoid repeated iterations and allocations:

- **`ReportsSection.tsx`** — `useMemo` partitions transactions into spending/income/totals in one loop; ISO string date comparison in sort (no Date object allocations)
- **`CategoryPieChart.tsx`** — `chartData` wrapped in `useMemo([data])` to prevent re-renders of chart library
- **`TransactionDetailModal.tsx`** — `sortedTransactions` memoized once via copy-sort (avoids mutating prop); reused in both desktop table and mobile card views

**Convention**: When data flowing from props requires transformation (partition, sort, deduplicate), memoize in the consuming component using `useMemo` with minimal dependency array. Pass memoized result to child views to ensure stable object identity across renders.

### Category Icon System

Categories and category groups support an optional `icon?: string` field (stored in IndexedDB, synced to server).

**`<CategoryIcon name={string} size={number} />`** (`atoms/CategoryIcon.tsx`)

- Renders one of 35 inline SVG icons with hardcoded colors — all colorful, flat minimal style
- Falls back to the `wallet` icon if name is not found
- `CATEGORY_ICONS` registry: `Record<string, { label: string; icon: ComponentFn }>` — 35 keys covering common finance categories

**Icon Pack (v2 — mint-teal + amber outlined style)**

All 35 icons redesigned to match the flat two-tone outlined style:
- **Teal group** (transport, housing, health, entertainment, education, travel, finance): `#92E0C0` fill · `#5FA77E` depth
- **Amber group** (food & drink, shopping, personal): `#FFC850` fill · `#FF9052` depth
- Outline stroke `#474D54` (1.5px) on all main shapes
- White `#FFFFFF` fills for interior details (windows, screens, paper)

**Design Schema** (`CategoryIcon.tsx` header)

- Two-tone outlined style: 24x24 viewBox, flat solid fills + dark stroke outlines
- Main shape: fill + `stroke="#474D54"` `strokeWidth="1.5"` `strokeLinecap="round"` `strokeLinejoin="round"`
- Depth: darker tint fills (`#5FA77E` or `#FF9052`) for secondary/shadow areas (no separate outline)
- Interior: `#FFFFFF` for windows, screens, text areas

**Helper Functions**

- `svg(children, props)` — SVG wrapper forwarding all props; each icon controls its own fill/stroke colors

**`<IconPicker value={string} onChange={fn} />`** (`molecules/IconPicker.tsx`)

- Popover trigger button showing the current icon (or `?` placeholder)
- Searchable 6-column grid of all 35 icons
- Used in `CategorySetupPage` for both parent groups and standalone categories

**`useCategoryIcon()`** (`hooks/useCategoryIcon.ts`)

- Returns `{ getIcon(categoryName) => string | undefined }`
- Resolution order: parent group name → sub-category mapping → parent group icon → `undefined`
- Used in TransactionItem, GroupedTransactionList, CategoryPieChart, SubCategoryBreakdownModal, TransactionListModal, TopSpendingSection, ReportsSection, BottleneckAlerts

**Persistence**: Icons are saved via `categoryGroupService.updateCategoryGroup()` (for groups) and `categoryService.updateCategory()` (for standalone categories). The `icon` field is already declared on both `CategoryGroup` and `Category` types in `@money-insight/shared`.

### Sync Architecture

Uses glean-oak-sync-client for offline-first sync with glean-oak-server:

- **Checkpoint-based pagination** — client maintains `_syncMeta` table with last-synced timestamps per table
- **Client-generated UUIDs** — enables offline record creation; soft-deleted records retained for 60-day TTL
- **Concurrency lock** — `IndexedDBSyncAdapter._syncInFlight` prevents overlapping syncs (e.g. double-click + auto-sync). Progress callbacks fan-out to all concurrent callers
- **Dual auth** — `X-API-Key` + `X-App-Id` for app identity, `Authorization: Bearer` for user authentication
- Sync metadata tracked in `_syncMeta` and `_pendingChanges` IndexedDB tables

## State Management (Zustand)

All state lives in `packages/ui/src/stores/`:

- **`spendingStore.ts`** — Transactions, accounts, analysis (statistics, monthly/yearly reports, bottlenecks). Transfer actions (createTransfer, updateTransfer, deleteTransfer) use `set((state) => {...})` callback pattern to preserve state reactivity and avoid race conditions when multiple legs are updated atomically.
- **`categoryGroupStore.ts`** — Category groups, category mappings, lookup map for parent resolution. `triggerAnalysisRefresh()` debounces (50ms, factory-closure scoped) dynamic import to avoid circular dependency with spendingStore and coalesce rapid updates.

## Key Conventions

- Path alias `@/` → `packages/ui/src/` in apps
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- shadcn/ui components (configured in `components.json`)

## Embedding

The `MoneyInsightApp` component (`packages/ui/src/embed/`) can be embedded:

```tsx
<MoneyInsightApp
  authTokens={{ accessToken, refreshToken, userId }}
  embedded={true}
  basePath="/money"
  useRouter={false} // Use parent's BrowserRouter
/>
```

## Dependencies on Parent Project

Part of glean-oak-sync ecosystem:

- Uses `@glean-oak/sync-client-types` for TypeScript types
- Uses `glean-oak-sync-client` Rust crate for sync (Tauri only)
- Designed to embed in `glean-oak-app` admin panel
