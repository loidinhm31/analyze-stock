# Money Insight

Offline-first personal finance tracker with end-to-end sync, multi-platform deployment, and powerful analytics. Track transactions, manage accounts, analyze spending patterns, and access your financial data across web, desktop (Tauri), and embedded (glean-oak-app) deployments.

## Quick Start

### Prerequisites
- Node.js 20+ (or 25.0.0 recommended)
- pnpm 9.1.0+
- Rust 1.70+ (for Tauri desktop only)

### Web Development
```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:25096)
pnpm dev:web

# Build for production
pnpm build

# Run tests
pnpm test:run

# Format code
pnpm format
```

### Tauri Desktop Development
```bash
# Start Tauri dev (native window with hot reload)
pnpm dev:tauri

# Build native app (macOS/Windows/Linux)
pnpm build

# Run Tauri tests (Rust)
cd apps/native/src-tauri && cargo test
```

### Other Commands
```bash
pnpm lint              # ESLint all packages
pnpm type-check        # TypeScript check
pnpm clean             # Remove build artifacts
```

## Features

- **Transaction Management**: Add, edit, delete transactions with full offline support
- **Multi-Account**: Track checking, savings, credit card, and wallet accounts
- **Hierarchical Categories**: Parent groups → child categories with icons (35-icon library)
- **Powerful Reports**: Monthly/yearly spending analysis, pie charts, trend lines, bottleneck detection
- **CSV Import**: Bulk import transactions from spreadsheets
- **Transfer Pairs**: Link related debit/credit transactions (e.g., moving money between accounts)
- **Balance Adjustments**: Manual corrections without affecting expense tracking
- **Themes**: Light, dark, and cyber themes with CSS variables
- **Offline-First**: Full functionality without internet; automatic sync when available
- **Multi-Platform**: Web, Tauri desktop, or embedded in glean-oak-app
- **Encrypted Storage**: Tauri desktop encrypts tokens with ChaCha20Poly1305

## Architecture Overview

Money Insight is built as a **Turborepo monorepo** with shared UI, adapters, and business logic:

```
apps/
  ├── web/          # Standalone web app (Vite + React 19)
  └── native/       # Tauri v2 desktop (+ Rust backend for auth)
packages/
  ├── ui/           # Shared React components, state, adapters
  ├── shared/       # Types, constants, utilities
  ├── eslint-config/
  └── tsconfig/
```

### Key Technologies
- **Frontend**: React 19 + React Router 7 + Tailwind CSS v4
- **State**: Zustand (spendingStore, categoryGroupStore)
- **Database**: IndexedDB via Dexie.js (offline-first)
- **Sync**: glean-oak-sync-client with checkpoint-based pagination
- **Auth**: JWT + refresh-token rotation
- **Desktop**: Tauri v2 + Axum embedded web server
- **Styling**: CSS variables (3 themes) + shadcn/ui components

### Service Architecture
Services are injected via **ServiceFactory** (manual DI) for loose coupling:
- Data services: IndexedDBTransactionAdapter, IndexedDBAccountAdapter, etc.
- Auth: QmServerAuthAdapter (web) or TauriAuthAdapter (desktop)
- Sync: IndexedDBSyncAdapter (checkpoint-based)

Platform detection (`isTauri()`) determines which adapters to use at startup.

## Documentation

Start here for development:

1. **[CLAUDE.md](./CLAUDE.md)** — Development commands and project overview
2. **[docs/project-overview-pdr.md](./docs/project-overview-pdr.md)** — Product vision, features, requirements
3. **[docs/codebase-summary.md](./docs/codebase-summary.md)** — Repository structure, file guide, LOC breakdown
4. **[docs/code-standards.md](./docs/code-standards.md)** — Naming conventions, patterns, testing, styling rules
5. **[docs/system-architecture.md](./docs/system-architecture.md)** — Sync protocol, auth flows, IndexedDB schema, Tauri IPC
6. **[docs/architecture.md](./docs/architecture.md)** — System diagrams (C4, ER, component hierarchy, data flows)

## Key Conventions

- **Path alias**: `@/*` → `packages/ui/src/*`
- **TypeScript**: Strict mode required
- **Tailwind CSS v4**: Via `@tailwindcss/vite` plugin (not PostCSS)
- **camelCase**: Field names (matches server JSON)
- **Atomic design**: atoms → molecules → organisms → pages → templates
- **DI pattern**: ServiceFactory setters/getters (no frameworks)

## Deployment Modes

### Standalone Web
- Vite dev server or built SPA hosted on web server
- Full authentication (login, register, logout)
- Syncs to glean-oak-server

### Embedded in glean-oak-app
- React component mounted in Shadow DOM
- Shares auth tokens with parent app (no separate login)
- Route prefix: `/money`

### Tauri Desktop
- Native macOS/Windows/Linux app
- Encrypted token storage (ChaCha20Poly1305)
- Embedded Axum web server on port 25096
- Syncs to glean-oak-server via IPC

## Testing

- **Framework**: Vitest with node environment
- **Pattern**: Arrange-Act-Assert (AAA)
- **Mocking**: ServiceFactory `setTransactionService()` pattern
- **Coverage**: 46 tests across 3 files

```bash
pnpm test              # Watch mode
pnpm test:run          # Single run (CI)
```

## Contributing

### Before Committing
1. Run `pnpm lint` — fix ESLint errors
2. Run `pnpm type-check` — verify TypeScript
3. Run `pnpm test:run` — ensure tests pass
4. Run `pnpm format` — format with Prettier (tab width 4, print width 120)

### Commit Message Format
```
type(scope): description

feat(transfer): auto-escalate transfer leg edits
fix(sync): handle checkpoint race condition
docs(architecture): add system architecture guide
```

### Code Review Checklist
- TypeScript strict mode compliance
- Zustand store patterns (avoid direct mutations)
- Service factory usage (no direct adapter imports in components)
- CSS variables for theming (no hardcoded colors)
- Performance: useMemo for derived data, selector-based subscriptions
- Tests: new features should include unit tests

## Performance Targets

| Metric | Target |
|--------|--------|
| First paint | < 2s |
| Analytics recompute | < 500ms |
| Sync latency | < 5s |
| Page transitions | < 500ms |
| Mobile responsiveness | Usable at 375px+ width |

## Browser & Platform Support

- **Modern browsers**: Chrome 120+, Firefox 121+, Safari 17+
- **Mobile**: iOS Safari, Android Chrome (responsive)
- **Desktop**: macOS 11+, Windows 10+, Linux (glibc 2.29+)
- **ECMAScript**: ES2020 minimum

## Known Limitations (v1.0)

- No budgeting features (alerts, forecasts)
- No transaction tagging (categories only)
- No recurring transaction rules
- CSV export only (no PDF, Excel)
- No Google Drive integration
- CategorySetupPage is 1149 lines (refactoring candidate)

## Troubleshooting

### "IndexedDB quota exceeded"
Clear app data or delete old transactions. Max quota varies by browser (typically 50% of disk space).

### "Sync not working"
1. Check network connectivity
2. Verify auth tokens in localStorage (`glean-oak-accessToken`, `glean-oak-userId`)
3. Check `_syncMeta` table in IndexedDB for checkpoint corruption
4. Try manual sync: Settings → "Sync now" button

### "Tauri app won't start"
1. Ensure Rust is installed: `rustup update`
2. Clear build artifacts: `pnpm clean && cargo clean`
3. Check Tauri logs: `RUST_BACKTRACE=1 pnpm dev:tauri`

## Directory Structure Explained

```
money-insight/
├── apps/
│   ├── web/               # Standalone web app entry point
│   └── native/
│       ├── src/           # React frontend (same as web)
│       └── src-tauri/     # Rust backend (auth, encryption, web server)
├── packages/
│   ├── ui/                # All React components, adapters, stores, styles
│   └── shared/            # Types, constants, utilities (no React)
├── docs/                  # Documentation
│   ├── architecture.md    # Diagrams and component structure
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md
│   ├── code-standards.md
│   └── system-architecture.md
└── money-insight-app-schema.json  # Sync schema for server registration
```

## Related Projects

- **[glean-oak-app](../../../glean-oak-app)** — Admin panel that embeds Money Insight
- **[glean-oak-server](../../../glean-oak-server)** — Backend API for sync and auth
- **[glean-oak-sync-engine](../../glean-oak-core-engine/glean-oak-sync-engine)** — Sync protocol implementation

## License

See parent repository LICENSE file.

---

**Created**: 2026-02-15
**Last updated**: 2026-03-13
**Status**: v1.0 active development
**Maintainers**: Money Insight Team
