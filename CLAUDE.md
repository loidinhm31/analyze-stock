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
- `QmServerAuthAdapter` - HTTP calls to qm-hub-server

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

**Icon Batches (Completed Phase 1–2)**

- **Batch 1 (colorful)**: food, coffee, grocery, transport, car, bus, home, electricity, wifi, water, shopping, clothing, health, pill, gym, entertainment, movie, music — flat filled SVG with hardcoded palette colors per category group (Food & Drink: `#FF6B35`, Transport: `#4A90D9`, Housing: `#D4A017`, Shopping: `#E91E8C`, Health: `#2ECC71`, Entertainment: `#9B59B6`, Travel: `#1ABC9C`, Finance: `#27AE60`, Other: `#95A5A6`)
- **Batch 2**: game, education, book, travel, plane, hotel, gift, pet, baby, salary, investment, savings, insurance, tax, donation, repair, wallet — colorful filled SVG matching batch 1 design schema. Savings snout fixed with rounded stroke endpoints (strokeLinecap: round) for visibility

**Design Schema** (`CategoryIcon.tsx` header)

- Flat minimal style: 24x24 viewBox, solid fills, no gradients/shadows
- Primary color for main shape, ~20% darker shade for details (max 3 colors/icon)
- All icons visible on light (#f8f9fa) and dark (#0f172a) backgrounds

**Helper Functions**

- `svg(children, props)` — flat filled SVG wrapper (no fill/stroke defaults; each icon controls its own colors)

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

Uses qm-sync-client for offline-first sync with qm-hub-server:

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

Part of qm-sync ecosystem:

- Uses `@qm-hub/sync-client-types` for TypeScript types
- Uses `qm-sync-client` Rust crate for sync (Tauri only)
- Designed to embed in `qm-hub-app` admin panel
