# Money Insight - Architecture Documentation

Personal finance tracking app with offline-first sync. Runs as standalone web app, embedded in glean-oak-app via Shadow DOM, or as Tauri desktop app. Turborepo monorepo with shared UI package.

## System Overview

```mermaid
C4Context
    title Money Insight - System Context

    Person(user, "User", "Tracks personal finances")

    System(mi, "Money Insight", "Offline-first finance tracker")

    System_Ext(qmHub, "glean-oak-app", "Admin panel host")
    System_Ext(qmServer, "glean-oak-server", "Sync + Auth API")

    Rel(user, mi, "Manages transactions, accounts, reports")
    Rel(mi, qmServer, "Sync data, authenticate", "HTTP/REST")
    Rel(qmHub, mi, "Embeds via Shadow DOM", "React component")
```

## Monorepo Structure

```mermaid
flowchart TB
    subgraph Apps["apps/"]
        Web["web/<br/>Vite + React 19<br/>Standalone web app"]
        Native["native/<br/>Tauri v2 desktop<br/>+ Rust backend"]
    end

    subgraph Packages["packages/"]
        UI["ui/<br/>Components, adapters,<br/>hooks, stores, styles"]
        Shared["shared/<br/>Types, constants,<br/>utilities (no React)"]
    end

    Web --> UI
    Native --> UI
    UI --> Shared

    classDef app fill:#e1f5fe,stroke:#0288d1
    classDef pkg fill:#f3e5f5,stroke:#7b1fa2
    class Web,Native app
    class UI,Shared pkg
```

## Service Architecture

Services are injected via `ServiceFactory` using setter/getter functions. Platform detection (`isTauri()`) determines which adapter implementations to use.

```mermaid
flowchart TB
    subgraph Factory["ServiceFactory (DI Registry)"]
        direction LR
        TxSvc["ITransactionService"]
        AccSvc["IAccountService"]
        CatSvc["ICategoryService"]
        CatGrpSvc["ICategoryGroupService"]
        StatSvc["IStatisticsService"]
        SyncSvc["ISyncService"]
        AuthSvc["IAuthService"]
    end

    subgraph WebAdapters["Web / Embedded Adapters"]
        IDBTx["IndexedDBTransactionAdapter"]
        IDBAcct["IndexedDBAccountAdapter"]
        IDBCat["IndexedDBCategoryAdapter"]
        IDBCatGrp["IndexedDBCategoryGroupAdapter"]
        IDBStats["IndexedDBStatisticsAdapter"]
        IDBSync["IndexedDBSyncAdapter"]
        QmAuth["QmServerAuthAdapter"]
    end

    subgraph TauriAdapters["Tauri Desktop Adapters"]
        TauriAuth["TauriAuthAdapter"]
    end

    subgraph Storage["Storage Layer"]
        IDB[(IndexedDB<br/>via Dexie.js)]
        RustEnc["Encrypted Token<br/>Storage (Rust)"]
    end

    TxSvc --> IDBTx
    AccSvc --> IDBAcct
    CatSvc --> IDBCat
    CatGrpSvc --> IDBCatGrp
    StatSvc --> IDBStats
    SyncSvc --> IDBSync
    AuthSvc --> QmAuth
    AuthSvc -.->|Tauri| TauriAuth

    IDBTx --> IDB
    IDBAcct --> IDB
    IDBCat --> IDB
    IDBCatGrp --> IDB
    IDBSync --> IDB
    TauriAuth --> RustEnc

    classDef iface fill:#fff9c4,stroke:#f9a825
    classDef web fill:#c8e6c9,stroke:#388e3c
    classDef tauri fill:#bbdefb,stroke:#1976d2
    classDef store fill:#f5f5f5,stroke:#616161
    class TxSvc,AccSvc,CatSvc,CatGrpSvc,StatSvc,SyncSvc,AuthSvc iface
    class IDBTx,IDBAcct,IDBCat,IDBCatGrp,IDBStats,IDBSync,QmAuth web
    class TauriAuth tauri
    class IDB,RustEnc store
```

**Key files:**
- `packages/ui/src/adapters/factory/ServiceFactory.ts` - DI registry
- `packages/ui/src/adapters/web/` - IndexedDB implementations
- `packages/ui/src/adapters/shared/QmServerAuthAdapter.ts` - HTTP auth
- `packages/ui/src/adapters/tauri/TauriAuthAdapter.ts` - IPC auth

## Data Model

```mermaid
erDiagram
    Transaction {
        string id PK "UUID (client-generated)"
        string category
        string account
        number amount "signed: neg=expense, pos=income"
        number expense "derived from amount"
        number income "derived from amount"
        string date "ISO date string"
        string yearMonth "YYYY-MM (computed)"
        number year "computed"
        number month "computed"
        string note
        string currency
        string source "csv_import | manual | balance_adjustment | transfer"
        string transferId FK "links paired transfer legs"
        number importBatchId FK
        number syncVersion
        number syncedAt
        boolean deleted "soft delete"
    }

    Account {
        string id PK
        string name
        string accountType
        string currency
        number initialBalance
        string icon
        number syncVersion
        number syncedAt
        boolean deleted
    }

    Category {
        string id PK
        string name
        boolean isExpense
        string icon
        string color
        number syncVersion
    }

    CategoryGroup {
        string id PK
        string name
        string icon
        number syncVersion
    }

    CategoryMapping {
        string id PK
        string subCategory "category name"
        string parentGroupId FK
        number syncVersion
    }

    ImportBatch {
        number id PK
        string filename
        number importedAt
        number transactionCount
    }

    _syncMeta {
        string key PK "table checkpoint key"
        string value "last sync timestamp"
    }

    _pendingChanges {
        number id PK
        string tableName
        string recordId
        string operation "create | update | delete"
    }

    CategoryGroup ||--o{ CategoryMapping : "has"
    CategoryMapping }o--|| Category : "maps to"
    Transaction }o--o| Account : "belongs to"
    Transaction }o--o| ImportBatch : "imported via"
    Transaction }o--o| Transaction : "transfer pair (transferId)"
```

**Database:** Per-user IndexedDB via Dexie.js. DB name derived from hashed userId.

**Key file:** `packages/ui/src/adapters/web/database.ts`

## State Management

Two Zustand stores manage all client state.

```mermaid
flowchart TB
    subgraph SpendingStore["spendingStore"]
        direction TB
        TxState["transactions[]<br/>accounts[]<br/>filter state"]
        Analysis["analyzer<br/>statistics<br/>categorySpending<br/>monthlyAnalysis<br/>yearlyAnalysis<br/>bottlenecks<br/>walletBalances"]
        Actions["addTransaction()<br/>createTransfer()<br/>importFromCSV()<br/>setFilter()<br/>refreshAnalysis()"]
    end

    subgraph CatStore["categoryGroupStore"]
        direction TB
        CatState["categories[]<br/>groups[]<br/>mappings[]<br/>lookupMap"]
        CatActions["addGroup()<br/>mapSubCategory()<br/>resolveParent()<br/>triggerAnalysisRefresh()"]
    end

    CatStore -->|"triggerAnalysisRefresh()<br/>(debounced 50ms)"| SpendingStore

    IDB[(IndexedDB)] --> SpendingStore
    IDB --> CatStore

    classDef store fill:#e8eaf6,stroke:#3f51b5
    class SpendingStore,CatStore store
```

**Key files:**
- `packages/ui/src/stores/spendingStore.ts` - Transactions + analytics
- `packages/ui/src/stores/categoryGroupStore.ts` - Category hierarchy

## Component Architecture (Atomic Design)

```mermaid
flowchart TB
    subgraph Templates["templates/"]
        AppShell["AppShell<br/>(sidebar + routes + bottom nav)"]
    end

    subgraph Pages["pages/ (lazy-loaded)"]
        Dashboard["DashboardPage"]
        TxPage["TransactionPage"]
        Reports["ReportsPage"]
        Settings["SettingsPage"]
        CatSetup["CategorySetupPage"]
        AddTx["AddTransactionPage"]
        Login["LoginPage"]
        Setup["InitialSetupPage"]
    end

    subgraph Organisms["organisms/"]
        TxList["GroupedTransactionList"]
        TxForm["TransactionForm"]
        TransferForm["TransferForm"]
        PieChart["CategoryPieChart"]
        TrendChart["MonthlyTrendChart"]
        Bottleneck["BottleneckAlerts"]
        SyncInit["BrowserSyncInitializer"]
        FileUp["FileUpload"]
    end

    subgraph Molecules["molecules/"]
        TxItem["TransactionItem"]
        DatePick["DatePicker"]
        IconPick["IconPicker"]
        StatCard["StatCard"]
        AccItem["AccountItem"]
    end

    subgraph Atoms["atoms/"]
        CatIcon["CategoryIcon (35 SVGs)"]
        Button["button, input, card, dialog..."]
    end

    AppShell --> Pages
    Dashboard --> PieChart
    Dashboard --> TrendChart
    Dashboard --> Bottleneck
    TxPage --> TxList
    TxList --> TxItem
    TxItem --> CatIcon
    AddTx --> TxForm
    AddTx --> TransferForm
    CatSetup --> IconPick
    IconPick --> CatIcon

    classDef tmpl fill:#fce4ec,stroke:#c62828
    classDef page fill:#e8eaf6,stroke:#283593
    classDef org fill:#e0f2f1,stroke:#00695c
    classDef mol fill:#fff3e0,stroke:#e65100
    classDef atom fill:#f3e5f5,stroke:#6a1b9a
    class AppShell tmpl
    class Dashboard,TxPage,Reports,Settings,CatSetup,AddTx,Login,Setup page
    class TxList,TxForm,TransferForm,PieChart,TrendChart,Bottleneck,SyncInit,FileUp org
    class TxItem,DatePick,IconPick,StatCard,AccItem mol
    class CatIcon,Button atom
```

**Routes** (`packages/ui/src/components/pages/routes.tsx`):

| Path | Page | Description |
|------|------|-------------|
| `/dashboard` | DashboardPage | Charts, stats, recent transactions |
| `/transactions` | TransactionPage | Full transaction list + filters |
| `/add` | AddTransactionPage | Manual entry / transfer |
| `/reports` | ReportsPage | Analytics + reports |
| `/settings` | SettingsPage | Accounts, sync, preferences |
| `/categories` | CategorySetupPage | Category groups + icons |
| `/setup` | InitialSetupPage | First-run onboarding |

## Data Flows

### Transaction Creation

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Form as TransactionForm
    participant Store as spendingStore
    participant Adapter as IndexedDBTransactionAdapter
    participant DB as IndexedDB

    User->>Form: Fill amount, category, account, date
    Form->>Store: addTransaction(newTx)
    Store->>Adapter: addTransaction(newTx)
    Adapter->>Adapter: Generate UUID, compute yearMonth/expense/income
    Adapter->>DB: put(transaction)
    DB-->>Adapter: Success
    Adapter-->>Store: Transaction
    Store->>Store: Rebuild analyzer + recompute analytics
    Store-->>Form: UI re-renders
```

### Transfer Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Form as TransferForm
    participant Store as spendingStore
    participant Adapter as IndexedDBTransactionAdapter
    participant DB as IndexedDB

    User->>Form: Select from/to accounts, amount
    Form->>Store: createTransfer(params)
    Store->>Adapter: createTransfer(params)

    Adapter->>Adapter: Generate shared transferId

    par Create outgoing leg
        Adapter->>DB: put(outgoing: amount negative, fromAccount)
    and Create incoming leg
        Adapter->>DB: put(incoming: amount positive, toAccount)
    end

    DB-->>Adapter: Both stored
    Adapter-->>Store: [outgoing, incoming]
    Store->>Store: Update transactions[], recompute walletBalances
    Store-->>Form: UI re-renders
```

### Sync Flow

```mermaid
sequenceDiagram
    autonumber
    participant Init as BrowserSyncInitializer
    participant Sync as IndexedDBSyncAdapter
    participant Meta as _syncMeta
    participant DB as IndexedDB
    participant Server as glean-oak-server

    Init->>Sync: syncNow()
    Sync->>Sync: Acquire concurrency lock

    alt Lock acquired
        Sync->>Meta: Read last checkpoint per table
        Meta-->>Sync: timestamps

        loop For each synced table
            Sync->>Server: GET /sync/{appId}/{table}?since={checkpoint}
            Server-->>Sync: Delta records + new checkpoint

            Sync->>DB: Merge server changes (upsert/soft-delete)
            Sync->>Meta: Update checkpoint
        end

        Sync->>DB: Read _pendingChanges
        DB-->>Sync: Local changes

        opt Has pending changes
            Sync->>Server: POST /sync/{appId}/{table}/push
            Server-->>Sync: Ack
            Sync->>DB: Clear _pendingChanges
        end

        Sync-->>Init: Sync complete
    else Lock held (concurrent sync)
        Sync-->>Init: Attach progress listener to existing sync
    end
```

### Category Icon Resolution

```mermaid
flowchart TB
    Start["useCategoryIcon().<br/>getIcon(categoryName)"] --> CheckParent{"categoryGroupStore<br/>.resolveParent()"}
    CheckParent -->|Found parent| UseParent["Use parent group icon"]
    CheckParent -->|No parent| CheckDirect{"Direct category<br/>has icon?"}
    CheckDirect -->|Yes| UseDirect["Use category icon"]
    CheckDirect -->|No| Fallback["Fallback: wallet icon"]

    UseParent --> Render["<CategoryIcon name={icon} />"]
    UseDirect --> Render
    Fallback --> Render

    Render --> Registry{"CATEGORY_ICONS<br/>registry (35 icons)"}
    Registry -->|Found| SVG["Render inline SVG"]
    Registry -->|Not found| WalletFallback["Render wallet SVG"]
```

## Platform Deployment Modes

```mermaid
flowchart LR
    subgraph Standalone["Standalone Web"]
        WebApp["apps/web/<br/>Vite dev server :25096"]
        WebApp --> MoneyApp1["MoneyInsightApp<br/>useRouter=true"]
    end

    subgraph Embedded["Embedded in glean-oak-app"]
        Hub["glean-oak-app"]
        Hub --> Shadow["Shadow DOM"]
        Shadow --> MoneyApp2["MoneyInsightApp<br/>useRouter=false<br/>basePath=/money"]
    end

    subgraph Desktop["Tauri Desktop"]
        Tauri["apps/native/<br/>Tauri v2 window"]
        Tauri --> MoneyApp3["MoneyInsightApp"]
        RustBE["Rust Backend<br/>auth, encryption,<br/>embedded web server"]
        Tauri --> RustBE
    end

    MoneyApp1 --> IDB[(IndexedDB)]
    MoneyApp2 --> IDB
    MoneyApp3 --> IDB

    MoneyApp1 --> QmServer["glean-oak-server"]
    MoneyApp2 --> QmServer
    RustBE --> QmServer

    classDef mode fill:#e8f5e9,stroke:#2e7d32
    class Standalone,Embedded,Desktop mode
```

## Tauri/Rust Backend (Desktop)

The Rust backend is minimal -- only provides native platform features. All data operations remain in JavaScript/IndexedDB.

```mermaid
flowchart TB
    subgraph TauriApp["Tauri v2 Desktop App"]
        JS["JavaScript Frontend"]

        subgraph RustBackend["Rust Backend (src-tauri/)"]
            Auth["auth.rs<br/>login/logout/refresh<br/>IPC commands"]
            Session["session.rs<br/>SessionManager<br/>ChaCha20 + Argon2"]
            WebSrv["web_server.rs<br/>Embedded Axum :25096<br/>rust-embed assets"]
            Main["main.rs<br/>Plugin registration"]
        end
    end

    JS -->|"IPC: auth_login"| Auth
    JS -->|"IPC: auth_logout"| Auth
    JS -->|"IPC: auth_refresh"| Auth
    Auth --> Session
    Session --> EncStore["Encrypted Token<br/>Storage (disk)"]
    Auth --> QmServer["glean-oak-server"]

    classDef rust fill:#ffecb3,stroke:#ff8f00
    class Auth,Session,WebSrv,Main rust
```

**Key files:**
- `apps/native/src-tauri/src/auth.rs` - Auth IPC commands
- `apps/native/src-tauri/src/session.rs` - Encryption (ChaCha20Poly1305 + machine-ID key)
- `apps/native/src-tauri/src/web_server.rs` - Embedded Axum server for browser mode

## Theme System

Three themes (light, dark, cyber) applied via CSS class on root element. CSS variables provide theming -- **not** Tailwind's `dark:` prefix.

| Variable | Light | Dark | Cyber |
|----------|-------|------|-------|
| `--color-bg-light` | `#f8f9fa` | `#0f172a` | `#0F172A` |
| `--color-bg-white` | `#ffffff` | `#1e293b` | `#1E293B` |
| `--color-text-primary` | `#111827` | `#f1f5f9` | `#F1F5F9` |
| `--color-primary-500` | `#635bff` | `#818cf8` | `#3B82F6` |
| `--font-family-heading` | Poppins | Poppins | JetBrains Mono |
| `--font-family-body` | Open Sans | Open Sans | JetBrains Mono |

**Key file:** `packages/ui/src/styles/global.css`

## Sync Architecture

| Concept | Implementation |
|---------|---------------|
| Local storage | IndexedDB (Dexie.js), per-user DB |
| Sync protocol | Checkpoint-based pagination |
| ID generation | Client-generated UUIDs (offline-capable) |
| Conflict resolution | Server-wins, version numbers |
| Soft delete | `deleted=true` + 60-day TTL |
| Concurrency | `_syncInFlight` lock, progress fan-out |
| Auth | Dual: API key (app identity) + JWT (user) |
| Metadata | `_syncMeta` (checkpoints) + `_pendingChanges` (outbox) |
