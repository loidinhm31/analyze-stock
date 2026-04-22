# Codebase Summary

## Repository Statistics

- **Total files**: 205
- **Total tokens**: ~171k (50-60 MB uncompressed JavaScript + CSS)
- **Primary language**: TypeScript (React) + Rust (Tauri backend)
- **Largest files**: CategoryIcon.tsx (10k tokens), CategorySetupPage.tsx (8k), spendingStore.ts (5k)

## Monorepo Structure

```
money-insight/
├── apps/
│   ├── web/               # Standalone web app (Vite 7, React 19)
│   │   ├── src/
│   │   │   ├── App.tsx              # Entry point
│   │   │   └── main.tsx             # Bootstrap
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   └── native/            # Tauri v2 desktop app
│       ├── src/           # JavaScript/React frontend
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── src-tauri/     # Rust backend
│       │   ├── src/
│       │   │   ├── auth.rs           # JWT validation, token refresh (417L)
│       │   │   ├── session.rs        # ChaCha20Poly1305 encryption (Argon2 key)
│       │   │   ├── web_server.rs     # Embedded Axum :25096 (240L)
│       │   │   ├── lib.rs            # Plugin registration
│       │   │   └── main.rs           # Tauri setup
│       │   ├── Cargo.toml
│       │   └── capabilities/
│       │       └── default.json      # Tauri permissions
│       └── tauri.conf.json
├── packages/
│   ├── ui/                # Shared React components
│   │   ├── src/
│   │   │   ├── adapters/              # Service layer
│   │   │   │   ├── factory/           # DI registry (7 services)
│   │   │   │   ├── web/               # IndexedDB implementations
│   │   │   │   ├── shared/            # QmServerAuthAdapter (HTTP)
│   │   │   │   ├── tauri/             # TauriAuthAdapter (IPC)
│   │   │   │   └── http/              # Fallback HTTP adapters
│   │   │   ├── components/            # Atomic design
│   │   │   │   ├── atoms/             # 11 atoms (Button, Input, CategoryIcon)
│   │   │   │   ├── molecules/         # 11 molecules (DatePicker, TransactionItem)
│   │   │   │   ├── organisms/         # 16 organisms (TransactionForm, Charts)
│   │   │   │   ├── pages/             # 8 lazy-loaded pages
│   │   │   │   └── templates/         # AppShell, Dashboard layout
│   │   │   ├── hooks/                 # useAuth, useCategoryIcon, useNav, useServerConnection
│   │   │   ├── stores/                # Zustand stores
│   │   │   │   ├── spendingStore.ts   # Transactions, accounts, analysis (789L)
│   │   │   │   └── categoryGroupStore.ts # Groups, mappings, lookup (279L)
│   │   │   ├── services/              # Service facade layer
│   │   │   │   ├── transactionService.ts
│   │   │   │   ├── categoryService.ts
│   │   │   │   ├── categoryGroupService.ts
│   │   │   │   ├── accountService.ts
│   │   │   │   ├── authService.ts
│   │   │   │   ├── syncService.ts
│   │   │   │   └── balanceAdjustmentService.ts
│   │   │   ├── lib/
│   │   │   │   ├── MoneyInsightAnalyzer.ts  # Analytics engine
│   │   │   │   ├── dataProcessing.ts        # CSV parsing
│   │   │   │   └── timePeriodGrouping.ts    # Date aggregation
│   │   │   ├── styles/
│   │   │   │   ├── global.css             # 3 themes (light, dark, cyber)
│   │   │   │   └── index.css
│   │   │   ├── embed/
│   │   │   │   ├── MoneyInsightApp.tsx     # Root embed component (186L)
│   │   │   │   └── index.ts
│   │   │   ├── platform/
│   │   │   │   ├── PlatformContext.tsx
│   │   │   │   ├── PlatformProvider.tsx
│   │   │   │   └── ServiceFactory init
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/            # Types, constants, utils (no React)
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── auth.ts           # AuthResponse, AuthStatus, SyncConfig
│   │   │   │   ├── sync.ts           # SyncStatus, SyncResult, SyncProgress
│   │   │   │   └── index.ts          # Transaction, Category, Account, etc.
│   │   │   ├── constants/
│   │   │   │   ├── auth.ts           # AUTH_STORAGE_KEYS (glean-oak-*)
│   │   │   │   └── index.ts          # BALANCE_ADJUSTMENT_CATEGORY, SUPPORTED_CURRENCIES
│   │   │   ├── utils/
│   │   │   │   ├── env.ts            # EnvironmentManager singleton
│   │   │   │   ├── logger.ts         # Logger with redaction
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── eslint-config/     # Shared ESLint rules
│   │   ├── base.js
│   │   ├── react-internal.js
│   │   └── package.json
│   └── tsconfig/          # Shared TypeScript configs
│       ├── base.json
│       ├── vite.json
│       └── react-library.json
├── docs/                  # Documentation
│   ├── architecture.md    # System C4, ER, component diagrams
│   ├── project-overview-pdr.md (NEW)
│   ├── codebase-summary.md (NEW)
│   ├── code-standards.md (NEW)
│   └── system-architecture.md (NEW)
├── CLAUDE.md              # Development guide
├── README.md              # Quick start (updating)
├── money-insight-app-schema.json  # Sync schema definition
├── components.json        # shadcn/ui config
├── turbo.json             # Turborepo pipeline
├── pnpm-workspace.yaml    # Workspace definition
├── pnpm-lock.yaml         # Locked dependencies
├── package.json           # Root package scripts
└── repomix-output.xml     # Codebase compaction (generated)
```

## Key Files Reference

### State Management
| File | LOC | Purpose |
|------|-----|---------|
| `packages/ui/src/stores/spendingStore.ts` | 789 | Transactions, accounts, analysis, filters, UI state. Actions: addTransaction, createTransfer, updateTransfer, deleteTransfer, importFromCSV, refreshAnalysis, adjustBalance. |
| `packages/ui/src/stores/categoryGroupStore.ts` | 279 | Categories, groups, mappings, lookup map. Debounced 50ms triggerAnalysisRefresh(). |

### Core Components
| File | LOC | Purpose |
|------|-----|---------|
| `packages/ui/src/components/atoms/CategoryIcon.tsx` | 500+ | 35 inline SVGs (two-tone outlined style), fallback wallet icon |
| `packages/ui/src/components/organisms/TransactionForm.tsx` | 427 | Manual transaction entry (amount, category, account, date, note) |
| `packages/ui/src/components/organisms/TransferForm.tsx` | 349 | Paired transfer creation (from/to accounts) |
| `packages/ui/src/components/organisms/GroupedTransactionList.tsx` | 242 | Transaction list grouped by date, with item actions |
| `packages/ui/src/components/pages/CategorySetupPage.tsx` | 1149 | Category groups + mappings UI, icon picker |
| `packages/ui/src/components/pages/DashboardPage.tsx` | - | Pie chart, trend line, bottleneck alerts |
| `packages/ui/src/components/organisms/ReportsSection.tsx` | 262 | Monthly reports with single-pass useMemo partition |

### Analytics Engine
| File | Purpose |
|------|---------|
| `packages/ui/src/lib/MoneyInsightAnalyzer.ts` | Core analytics: filterTransactions, getStatistics, analyzeCategorySpending/Grouped, analyzeMonthly/Yearly, detectBottlenecks, getMonthlyReport |
| `packages/ui/src/lib/dataProcessing.ts` | CSV parsing: parseCSV, parseCSVForImport |
| `packages/ui/src/lib/timePeriodGrouping.ts` | Date aggregation helpers |

### Service Layer
| File | Purpose |
|------|---------|
| `packages/ui/src/adapters/factory/ServiceFactory.ts` | DI registry: setTransactionService, getTransactionService, etc. (7 services) |
| `packages/ui/src/adapters/web/database.ts` | Dexie.js schema: transactions, accounts, categories, categoryGroups, categoryMappings, importBatches, _syncMeta, _pendingChanges |
| `packages/ui/src/adapters/web/IndexedDBTransactionAdapter.ts` | CRUD + transfer pair management |
| `packages/ui/src/adapters/web/IndexedDBSyncAdapter.ts` | Checkpoint-based sync orchestration, concurrency lock, progress callbacks |
| `packages/ui/src/adapters/shared/QmServerAuthAdapter.ts` | HTTP auth (login, register, logout, token refresh) |
| `packages/ui/src/adapters/tauri/TauriAuthAdapter.ts` | IPC-based auth for Tauri desktop |

### Tauri Rust Backend
| File | LOC | Purpose |
|------|-----|---------|
| `apps/native/src-tauri/src/auth.rs` | 417 | JWT validation, token refresh, ChaCha20Poly1305 decryption, Argon2 key derivation |
| `apps/native/src-tauri/src/session.rs` | - | SessionManager, encrypted token storage |
| `apps/native/src-tauri/src/web_server.rs` | 240 | Embedded Axum :25096, rust-embed assets, CORS |
| `apps/native/src-tauri/src/main.rs` | - | Tauri setup, IPC registration |

### Tests
| File | Tests | Purpose |
|------|-------|---------|
| `packages/ui/src/stores/spendingStore.test.ts` | initFromDatabase, updateTransfer | Zustand state mutations |
| `packages/ui/src/services/transferService.test.ts` | parseTransferNote, reconstructTransferParams | Transfer pair logic |
| `packages/ui/src/services/balanceAdjustmentService.test.ts` | isAdjustmentTransaction, parseAdjustmentNote, getBalanceAtDate, createAdjustment, recalculateAdjustments | Balance adjustment logic |
| `packages/ui/src/adapters/web/*.test.ts` | (if any) | Adapter tests |

Total: 46 tests, Vitest (node environment), `pnpm test:run` single run

## Dependency Overview

### Runtime Dependencies (Key)
- **React 19**: UI framework
- **React Router 7**: Client-side routing
- **Zustand**: State management (spendingStore, categoryGroupStore)
- **Dexie.js**: IndexedDB wrapper
- **@glean-oak/sync-client-types**: Sync protocol types (from parent)
- **Tauri v2**: Desktop app framework (native)
- **shadcn/ui**: Radix UI + Tailwind components
- **Tailwind CSS v4**: Styling via @tailwindcss/vite plugin
- **lettre** (optional): Email notifications (Tauri only)

### Dev Dependencies (Key)
- **TypeScript 5.x**: Strict mode
- **Vite 7**: Build tool
- **Vitest**: Test runner
- **Prettier**: Code formatter (tab width 4, print width 120)
- **ESLint**: Linting (shared config)
- **Turborepo**: Monorepo orchestration
- **pnpm 9.1.0**: Package manager

### Excluded from codebase
- `node_modules/` — installed via pnpm install
- `dist/`, `.turbo/` — build artifacts
- `.env.development`, `.env.production` — secrets (not in repo)
- Binary files (icons, images) — tracked but not in repomix-output.xml

## Component Count by Type

| Type | Count | Examples |
|------|-------|----------|
| Atoms | 11 | Button, Input, Card, Dialog, CategoryIcon, AccountIcon |
| Molecules | 11 | DatePicker, TransactionItem, StatCard, AccountItem, IconPicker |
| Organisms | 16 | TransactionForm, TransferForm, GroupedTransactionList, Charts, SyncSettings |
| Pages | 8 | DashboardPage, TransactionPage, ReportsPage, SettingsPage, CategorySetupPage, AddTransactionPage, LoginPage, InitialSetupPage |
| Templates | 2 | AppShell, Dashboard |
| Custom Hooks | 4 | useAuth, useCategoryIcon, useNav, useLastFormValues, useServerConnection |

## Package Scripts (pnpm)

| Command | Purpose |
|---------|---------|
| `pnpm dev:web` | Start web dev server (port 25096) |
| `pnpm dev:tauri` | Launch Tauri desktop with hot reload |
| `pnpm build` | Build all packages (tsc + vite) |
| `pnpm lint` | ESLint all packages |
| `pnpm test` | Vitest watch mode |
| `pnpm test:run` | Single test run (CI) |
| `pnpm format` | Prettier format |
| `pnpm type-check` | TypeScript check |
| `pnpm clean` | Remove build artifacts |

## Architecture Patterns

1. **ServiceFactory DI**: Manual setter/getter pattern for loose coupling
2. **Platform adapter**: `isTauri()` detection; different auth adapters per platform
3. **Zustand state**: Reactive state with action callbacks; debounced analysis refresh
4. **Atomic design**: Atoms → Molecules → Organisms → Pages → Templates
5. **Dexie.js DB**: Per-user IndexedDB with sync metadata tables
6. **Checkpoint sync**: Client-managed pull/push via glean-oak-sync-client
7. **Single-pass analytics**: MoneyInsightAnalyzer with useMemo caching

## Known Technical Debt

- **CategorySetupPage** is 1149 lines (exceeds target); candidates for extraction: icon picker, mapping UI, group CRUD
- **CategoryIcon** SVG definitions could be extracted to separate files (35 icons in 1 file)
- **spendingStore** and **categoryGroupStore** have tight coupling via `triggerAnalysisRefresh()`; consider event emitter

---

**Last updated**: 2026-03-13
**Generated from**: repomix-output.xml (170k tokens)
**Scope**: Full monorepo (apps/web, apps/native, packages/*)
