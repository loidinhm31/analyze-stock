# Money Insight - Project Overview & Product Development Requirements

## Product Vision

**Money Insight** is an offline-first personal finance tracker with encrypted sync, multi-platform deployment, and powerful analytics. Users track transactions, manage accounts, analyze spending patterns, and make data-driven financial decisions across web, desktop (Tauri), and embedded (glean-oak-app) deployments.

**Core philosophy**: Offline-first means users work seamlessly without internet; sync is automatic when available. Privacy-first: user data never syncs without consent.

## Target Users & Use Cases

| User Type | Primary Use Case |
|-----------|------------------|
| Individual budget tracker | Monthly expense tracking, category analysis, recurring transaction patterns |
| Multi-account manager | Managing checking, savings, credit cards; fund transfers between accounts |
| Digital nomad | Working offline in areas with poor connectivity; periodic batch sync |
| Finance student | Analyzing spending trends, learning double-entry (transfers as paired legs) |
| Embedded user | Accessing Money Insight as part of glean-oak-app admin panel (no separate login) |

## Feature Inventory

### Transaction Management
- **Manual entry**: Create transactions (amount, category, date, account, note)
- **Bulk import**: CSV import with batch tracking and duplicate detection
- **Transfer pairs**: Link related debit/credit transactions (e.g., moving money between accounts)
- **Balance adjustments**: Manual corrections for discrepancies (stored as special transactions)
- **Soft delete**: Deleted records kept for 60 days (enables sync propagation)
- **Transaction search**: Filter by date range, account, category, amount range, keyword

### Account Management
- **Multi-account**: Create/edit checking, savings, credit card, wallet accounts
- **Account balances**: Track running balance; auto-compute from transaction history
- **Manual balance adjustments**: Reconcile without creating transactions
- **Account icons**: Assign visual icons for quick recognition

### Category System
- **Hierarchical**: Parent groups (Food & Drink, Transport) → child categories (Coffee, Gas)
- **Dynamic categories**: Derive from transaction entries; manually add/edit/rename
- **Icon assignment**: Assign icons to groups or individual categories (35 icon library)
- **Category mapping**: Map sub-categories to parent groups for analytics rollup

### Reporting & Analytics
- **Dashboard**: Monthly spending pie chart, trend line (30-day rolling), bottleneck alerts
- **Monthly reports**: Spending vs. income, category breakdown, budget variance
- **Yearly analysis**: 12-month trend, category totals, savings rate
- **Bottleneck detection**: Categories with unusual spikes (>2σ deviation)
- **Wallet balances**: Total assets across all accounts (grouped by currency)
- **CSV export**: Export filtered transactions for spreadsheet analysis

### Sync & Multi-Device
- **Offline-first IndexedDB**: All data stored locally; sync is optional
- **Checkpoint-based sync**: Client-generated UUIDs enable offline record creation
- **Conflict resolution**: Server-wins with version tracking
- **User isolation**: Per-user IndexedDB databases derived from hashed userId
- **Automatic sync**: Periodic background sync (configurable interval)
- **Manual sync trigger**: "Sync now" button in settings

### Multi-Platform Deployment
- **Web (Vite + React)**: Standalone app or embedded in glean-oak-app via Shadow DOM
- **Tauri Desktop**: Native macOS/Windows/Linux app with encrypted token storage
- **Embedded mode**: Integrates into glean-oak-app with shared auth tokens and routing

### Authentication & Security
- **OAuth/JWT flow**: Register/login via glean-oak-server (web + desktop)
- **Token refresh**: Automatic refresh-token rotation with 10-second cache
- **Tauri encrypted storage**: ChaCha20Poly1305 cipher with Argon2 key derivation
- **Machine-ID isolation**: Tauri tokens tied to machine fingerprint
- **Logout option**: Clear tokens and app state; optionally keep local data for offline use

### Data Import & Export
- **CSV import**: Multi-file batch import; auto-detect date/amount columns
- **Import batches**: Track which CSV file sourced each transaction
- **CSV export**: Export filtered/sorted transactions with full metadata
- **Account seeding**: Auto-create accounts referenced in imports

## Non-Functional Requirements

### Performance
- **First paint < 2s**: Vite + lazy-loaded pages (Dashboard, Reports, Settings, etc.)
- **Analytics recompute < 500ms**: Single-pass MoneyInsightAnalyzer with useMemo caching
- **Sync throughput**: Checkpoint pagination; 100-record batches default
- **IndexedDB indexing**: Efficient filtered queries on date, account, category, amount

### Reliability
- **Data integrity**: Sync version tracking + soft-delete TTL prevents data loss
- **Error recovery**: Unsynced changes marked in `_pendingChanges` table; auto-retry
- **Offline resilience**: App remains fully functional without network; queues changes locally
- **State persistence**: Zustand store hydrated from IndexedDB on app load

### Security
- **Data encryption**: Tauri tokens stored encrypted on disk; HTTP uses HTTPS only
- **Token lifecycle**: Access token (short-lived), refresh token (rotated), no password caching
- **API authentication**: Dual auth (API key + JWT) with per-request validation
- **User isolation**: SHA-256(userId) prefixes IndexedDB database names

### Scalability
- **Unbounded transaction history**: Pagination + checkpoint-based sync handles large datasets
- **Multi-currency support**: Transactions store currency; walletBalances group by currency
- **Category hierarchy**: Flat storage with mapping table; fast parent resolution

### Accessibility
- **Theme support**: Light, dark, cyber themes with CSS variables
- **Keyboard navigation**: All modals, forms, menus keyboard-accessible
- **ARIA labels**: Form fields, buttons, icons have descriptive labels
- **Color contrast**: Text/background contrast >= 4.5:1 (WCAG AA)

### Browser & Platform Support
- **Modern browsers**: Chrome 120+, Firefox 121+, Safari 17+ (ES2020 minimum)
- **Mobile browsers**: iOS Safari, Android Chrome (responsive design, touch-friendly)
- **Tauri desktop**: macOS 11+, Windows 10+, Linux (glibc 2.29+)
- **Embedded**: Requires glean-oak-app environment (post-v1.0)

## Deployment Modes

### Standalone Web (`apps/web`)
- User accesses `https://app.example.com/money`
- Full authentication flow (login, register, logout)
- Syncs to glean-oak-server
- Uses QmServerAuthAdapter (HTTP)

### Embedded in glean-oak-app
- Hosted as Shadow DOM component in admin panel route `/money`
- Inherits auth from glean-oak-app (shared localStorage tokens)
- No separate login required
- Uses embedded MoneyInsightApp component with `useRouter=false`

### Tauri Desktop
- Native app window; user runs locally
- Embedded Axum web server (port 25096) hosts frontend + api
- Encrypted token storage via ChaCha20Poly1305
- Syncs to glean-oak-server via TauriAuthAdapter (IPC → Rust → HTTP)

## Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Time to first transaction entry | < 30 seconds | New user friction |
| Sync latency (after edit) | < 5 seconds | User expectation |
| Offline usability | 100% feature parity | Core requirement |
| Category accuracy | User-defined grouping | Domain-driven |
| Report generation | < 500ms | Interactivity |
| Mobile responsiveness | Usable on 375px+ width | Market reality |

## Technical Constraints

- **Single-page app**: React Router v7 (no server-side rendering)
- **No backend business logic**: All analytics computed client-side (MoneyInsightAnalyzer)
- **IndexedDB required**: No alternative local storage backend
- **TypeScript strict mode**: Full type safety across codebase
- **Zustand state**: No Redux, MobX, or context-only state
- **Tauri v2 minimum**: For desktop release

## Success Criteria for v1.0

1. Add/edit/delete transactions with proper sync
2. Manage accounts and balances
3. Category hierarchy with icon support
4. Monthly and yearly reports
5. CSV import functionality
6. Tauri desktop app working
7. Embedded in glean-oak-app
8. Offline sync verified (30+ transactions)
9. Zero unrecoverable data loss in testing
10. All pages load < 2 seconds

## Known Limitations & Future Work

### v1.0 Limitations
- No budgeting features (alerts, forecasts)
- No transaction tagging (only categories)
- No recurring transaction rules
- CSV export only (no PDF, Excel)
- No data backup/restore UI
- No Google Drive integration

### Roadmap (Post-v1.0)
- **v1.1**: Budget limits with alerts
- **v1.2**: Recurring transaction rules
- **v1.3**: Investment portfolio tracking
- **v1.4**: Bill reminders + notifications
- **v2.0**: Collaboration (shared accounts, approval workflows)

---

## PDR Change Log

| Date | Version | Change |
|------|---------|--------|
| 2026-03-13 | 1.0 | Initial PDR; features frozen for v1.0 |
| TBD | 1.1 | Budget features, alerts |

---

**Last updated**: 2026-03-13
**Owner**: Money Insight Team
**Status**: Active (v1.0 development)
