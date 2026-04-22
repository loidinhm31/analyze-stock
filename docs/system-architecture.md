# System Architecture - Technical Details

For high-level overview, diagrams, and component structure, see `docs/architecture.md`.

This document covers: **Sync protocol, authentication, IndexedDB schema, Tauri IPC, and platform-specific concerns.**

## Sync Protocol & Checkpoint-Based Pagination

### Sync Lifecycle

```
User edits transaction
  ↓
IndexedDB.put() + mark syncedAt = null
  ↓
Background timer or user clicks "Sync now"
  ↓
IndexedDBSyncAdapter.syncNow()
  ├─ Acquire _syncInFlight lock (prevents concurrent syncs)
  ├─ Read _syncMeta for last checkpoint per table
  ├─ For each table:
  │  ├─ GET /api/v1/sync/{appId}/{table}?since={checkpoint}
  │  ├─ Server returns: records[], newCheckpoint, hasMore
  │  ├─ Merge changes: upsert non-deleted, delete soft-deleted
  │  └─ Update _syncMeta[table] = newCheckpoint
  ├─ Read _pendingChanges (local edits with syncedAt = null)
  ├─ If pendingChanges not empty:
  │  ├─ POST /api/v1/sync/{appId}/{table}/push with changes
  │  ├─ Server acknowledges + returns ACK/CONFLICT
  │  ├─ On conflict: fetch server version, apply server-wins
  │  └─ Clear _pendingChanges
  └─ Release _syncInFlight, notify listeners
```

### Checkpoint Format

```typescript
// _syncMeta table (key-value store)
{
  key: "transactions_checkpoint", // "accounts_checkpoint", etc.
  value: "2026-03-13T12:34:56.789Z" // ISO timestamp from server
}
```

### Pagination Details
- **Batch size**: 100 records default
- **hasMore flag**: Server indicates if more records available
- **Client continuation**: Automatically fetch next batch if hasMore = true
- **Monotonic checkpoints**: Each checkpoint >= previous; safe for resumption

### Concurrency & Lock Management

```typescript
// In IndexedDBSyncAdapter
private _syncInFlight: Promise<void> | null = null;

async syncNow() {
  // If sync already in progress, wait and return same promise
  if (this._syncInFlight) {
    // Return existing promise; caller gets progress callbacks
    return this._syncInFlight;
  }

  this._syncInFlight = this._performSync();
  try {
    await this._syncInFlight;
  } finally {
    this._syncInFlight = null;
  }
}
```

### Progress Callbacks
```typescript
// Multiple callers can await syncNow()
// All receive progress updates to same listeners

private progressListeners: Set<(progress: SyncProgress) => void> = new Set();

onSyncProgress(callback: (progress: SyncProgress) => void) {
  this.progressListeners.add(callback);
  return () => this.progressListeners.delete(callback);
}

// During sync, fan-out progress
progressListeners.forEach(cb => cb({ tablesCompleted: 3, totalTables: 5 }));
```

## Authentication Flows

### QmServerAuthAdapter (Web & Embedded)

```
User Registration:
  POST /api/v1/auth/register
  { email, password, ...}
  ←
  { accessToken, refreshToken, userId, expiresIn }
  ↓
  localStorage.setItem("glean-oak-accessToken", accessToken)
  localStorage.setItem("glean-oak-refreshToken", refreshToken)
  localStorage.setItem("glean-oak-userId", userId)

User Login:
  POST /api/v1/auth/login
  { email, password }
  ←
  { accessToken, refreshToken, userId, expiresIn }
  ↓
  [Same localStorage storage]

Sync Request (with auto-refresh):
  GET /api/v1/sync/{appId}/transactions
  Headers:
    X-API-Key: {appApiKey}
    X-App-Id: {appId}
    Authorization: Bearer {accessToken}
  ←
  200 OK + data
  OR
  401 Unauthorized
    ↓
    POST /api/v1/auth/refresh
    { refreshToken }
    ←
    { accessToken, refreshToken, expiresIn }
    [Update localStorage]
    [Retry original request]

Status Check (10s cache):
  GET /api/v1/auth/status
  Headers: Authorization: Bearer {accessToken}
  ←
  { authenticated: boolean, userId, email }
  [Cache result for 10s; skip repeated calls]

Logout:
  POST /api/v1/auth/logout
  [Clear localStorage tokens]
  [Redirect to /login]
```

### TauriAuthAdapter (Desktop)

```
Init (Tauri IPC):
  auth_get_status
  ←
  { authenticated: boolean, userId, email }

Registration:
  auth_register { email, password }
  ←
  { accessToken, refreshToken, userId }
  ↓
  Rust backend: ChaCha20Poly1305.encrypt(tokens, derivedKey)
  Store on disk at {appDataDir}/auth/tokens.enc

Login:
  auth_login { email, password }
  ←
  { accessToken, refreshToken, userId }
  ↓
  [Encrypt + store]

Sync with Auth:
  JavaScript calls sync service
  sync service calls: auth_get_access_token
  ←
  { accessToken, expiresIn }
  [Optionally refresh if near expiry]
  ↓
  Use accessToken in HTTP headers

Logout:
  auth_logout
  ←
  [Rust: delete encrypted file]
  [JavaScript: clear state]
```

### Token Refresh Strategy
- **AccessToken lifetime**: 1 hour (typical)
- **RefreshToken lifetime**: 7 days (typical)
- **Web**: Auto-refresh on 401; block retry requests
- **Tauri**: Rust backend handles refresh transparently

## IndexedDB Schema & Sync Columns

### Full Schema (Dexie.js)

```typescript
const db = new Dexie("money-insight_sha256(userId)[0:12]");

db.version(1).stores({
  // Synced tables (require sync columns)
  transactions: "&id, account, date, category, yearMonth",
  accounts: "&id",
  categories: "&id",
  categoryGroups: "&id",
  categoryMappings: "&id, subCategory",

  // Metadata
  importBatches: "++id",
  _syncMeta: "&key",
  _pendingChanges: "++id, tableName, recordId, operation",
});
```

### Transaction Table Schema
```typescript
interface Transaction {
  id: string;                    // UUID (client-generated)
  amount: number;                // Signed: -100 (expense), +50 (income)
  expense: number;               // Math.abs(amount) if amount < 0, else 0
  income: number;                // amount if amount > 0, else 0
  category: string;              // e.g., "Coffee", "Salary"
  account: string;               // Account ID
  date: string;                  // ISO date string "2026-03-13"
  yearMonth: string;             // Computed "2026-03"
  year: number;                  // Computed 2026
  month: number;                 // Computed 3
  note?: string;                 // Optional user note
  currency: string;              // "VND", "USD", etc.
  source: string;                // "manual" | "csv_import" | "balance_adjustment" | "transfer"
  transferId?: string;           // Pairs outgoing ↔ incoming legs
  importBatchId?: number;        // FK to importBatches.id

  // Sync columns (required)
  syncVersion: number;           // Incremented on each edit
  syncedAt: number | null;       // Null = unsynced; timestamp = synced at
  createdAt?: number;            // Optional local timestamp
  updatedAt?: number;            // Optional local timestamp
  deleted: boolean;              // Soft delete flag
  deletedAt?: number;            // Timestamp of deletion
}
```

### Pending Changes Table
```typescript
interface _PendingChange {
  id: number;                    // Auto-increment
  tableName: string;             // "transactions", "accounts", etc.
  recordId: string;              // Record's ID
  operation: "create" | "update" | "delete";
}
```

### Sync Metadata Table
```typescript
interface _SyncMeta {
  key: string;                   // e.g., "transactions_checkpoint"
  value: string;                 // ISO timestamp
}
```

### Transfer Pair Mechanics
```typescript
// When user creates transfer: 50 VND from Account A → Account B

// Outgoing leg (expense)
{
  id: "uuid-1",
  amount: -50,
  account: "A",
  category: "Transfer",
  transferId: "transfer-id-123",
  source: "transfer",
}

// Incoming leg (income)
{
  id: "uuid-2",
  amount: +50,
  account: "B",
  category: "Transfer",
  transferId: "transfer-id-123",
  source: "transfer",
}

// Both share transferId; editing one auto-escalates to updateTransfer()
```

## IndexedDB Per-User Isolation

### Database Name Generation
```typescript
async function hashUserId(userId: string): Promise<string> {
  const encoded = new TextEncoder().encode(userId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 12); // First 12 chars
}

const dbNameSuffix = await hashUserId(userId);
const dbName = `money-insight_${dbNameSuffix}`; // e.g., "money-insight_a1b2c3d4e5f6"
```

### Benefits
- **User privacy**: Different users have separate IndexedDB instances
- **Data isolation**: Clearing one user's data doesn't affect others
- **Machine multi-user**: Same device, different OS users = different DBs
- **No collisions**: SHA-256 hash almost guaranteed unique per userId

## Tauri IPC Commands

### Command Signature
```rust
// apps/native/src-tauri/src/auth.rs

#[tauri::command]
async fn auth_configure_sync(
  state: tauri::State<'_, AppState>,
  config: SyncConfig,
) -> Result<(), String> {
  // ...
  Ok(())
}

// Registered in main.rs
.invoke_handler(tauri::generate_handler![
  auth_register,
  auth_login,
  auth_logout,
  auth_get_status,
  auth_get_access_token,
  auth_is_authenticated,
  auth_configure_sync,
  open_in_browser,
  stop_browser_server,
])
```

### Encryption (ChaCha20Poly1305 + Argon2)

```rust
// 1. Derive key from machine ID + password
let machine_id = machine_uuid();
let mut key = [0u8; 32];
Argon2::default().hash_password(
  &format!("{}:{}", machine_id, password),
  &SaltString::generate(rand::thread_rng()),
  &mut key,
)?;

// 2. Encrypt tokens
let cipher = ChaCha20Poly1305::new(key.into());
let nonce = Nonce::from_slice(&[0u8; 12]);
let ciphertext = cipher.encrypt(nonce, tokens_json.as_ref())?;

// 3. Store on disk
fs::write(
  app_handle.path_resolver().app_data_dir().join("auth/tokens.enc"),
  ciphertext
)?;
```

### Platform-Specific Command Calls

**Web (via HTTP)**:
```typescript
const response = await fetch("POST /api/v1/auth/login", {
  body: JSON.stringify({ email, password }),
});
```

**Tauri (via IPC)**:
```typescript
const response = await window.__TAURI__.core.invoke("auth_login", {
  email,
  password,
});
```

## Platform Detection

### `isTauri()` Function
```typescript
function isTauri(): boolean {
  // Check for Tauri global object
  return "__TAURI_INTERNALS__" in window;
}

// Usage in ServiceFactory
if (isTauri()) {
  setAuthService(new TauriAuthAdapter());
  // Sync still uses IndexedDB + HTTP (via Tauri's web server proxy)
} else {
  setAuthService(new QmServerAuthAdapter());
}
```

## Tauri Embedded Web Server

### Axum Routes (port 25096)

```rust
// apps/native/src-tauri/src/web_server.rs

Router::new()
  .route("/", get(serve_frontend))
  .route("/api/*path", forward_to_server) // Proxy to glean-oak-server
  .fallback(serve_frontend)
  .layer(middleware::from_fn(session_auth_middleware))
  .layer(CorsLayer::permissive())
```

### Session Authentication
```rust
// Session manager checks if request has valid session
// Tracks active login session to prevent token hijacking
```

### Asset Serving
```rust
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "../../apps/native/dist"]
struct FrontendAssets;

// Serve static files from embedded archive
```

## Multi-Currency Support

### Design
- **Transaction field**: `currency: "VND" | "USD" | "EUR"`
- **Account field**: `currency: string`
- **No conversion**: Amounts stored as-is; no automatic conversion
- **Wallet balances**: Grouped by currency (e.g., `{ "VND": 5000, "USD": 100 }`)

### Supported Currencies
```typescript
const SUPPORTED_CURRENCIES = ["VND", "USD", "EUR"];
```

### Analytics Isolation
- **Monthly spending**: Computed per currency separately
- **Cross-currency transfer**: Same transferId, different currencies (edge case)
- **Total wallet**: Human reads multiple currency subtotals

## Balance Adjustment System

### Design
- **Special transactions**: Marked with `source: "balance_adjustment"`
- **Category**: Fixed constant `BALANCE_ADJUSTMENT_CATEGORY`
- **Purpose**: Manual balance corrections without affecting expense tracking
- **Example**: Beginning balance entry, bank fee reversal

### Service Logic
```typescript
// balanceAdjustmentService.ts
function isAdjustmentTransaction(tx: Transaction): boolean {
  return tx.source === "balance_adjustment";
}

function parseAdjustmentNote(note: string): { oldBalance, newBalance }? {
  // Parse "Adjustment: 100000 → 150000"
}

function getBalanceAtDate(
  account: Account,
  date: string,
  allTransactions: Transaction[]
): number {
  // Sum all transactions for account up to date (excluding adjustments)
  // Then apply latest adjustment up to date
}
```

## CSV Import Batching

### Import Process
```typescript
// 1. Parse CSV file
const rows = parseCSV(file);

// 2. Create import batch
const batch = await importBatchService.createBatch({
  filename: file.name,
  transactionCount: rows.length,
});

// 3. Upsert accounts from CSV
for (const row of rows) {
  await accountService.upsertAccount(row.account, { /* ... */ });
}

// 4. Create transactions
for (const row of rows) {
  await transactionService.addTransaction({
    ...row,
    importBatchId: batch.id,
  });
}

// 5. Mark batch complete
```

### Deduplication
- **No built-in deduplication**: User responsible for avoiding duplicates
- **Import batch tracking**: Each transaction knows its source file
- **Re-import strategy**: Delete previous batch, import new

## Error Handling & Recovery

### Sync Errors
| Error | Cause | Recovery |
|-------|-------|----------|
| `CONFLICT` | Version mismatch (concurrent edit) | Fetch server version, apply server-wins, retry |
| `NETWORK` | Offline or server unavailable | Queue in `_pendingChanges`, retry on next sync |
| `AUTH` | Invalid token | Refresh token, retry; on persistent failure, prompt login |
| `QUOTA_EXCEEDED` | IndexedDB quota full | Warn user; suggest deleting old data |

### Transaction Rollback
```typescript
// If sync fails mid-transaction
try {
  await tx.addTransaction(newTx);
  await db.table("_pendingChanges").add({
    tableName: "transactions",
    recordId: newTx.id,
    operation: "create",
  });
} catch (err) {
  // Rollback: delete from transactions
  await db.table("transactions").delete(newTx.id);
  throw err;
}
```

## Performance Considerations

### Indexes for Query Speed
```javascript
// Dexie indexes optimized for common queries
db.version(1).stores({
  transactions: "&id, account, date, category, yearMonth",
  // &id = primary key
  // account, date, category, yearMonth = secondary indexes
});

// Fast queries
db.transactions.where("account").equals("acc-1").toArray(); // O(log n)
db.transactions.where("date").between("2026-01-01", "2026-03-13").toArray();
```

### Analytics Caching via useMemo
```typescript
const monthlyAnalysis = useMemo(() => {
  // Partition + aggregate transactions
  // Runs only when transactions array reference changes
}, [transactions]);
```

### Sync Batching
- Fetch 100 records per request (configurable)
- Push changes in single POST request
- Reduces round-trip latency

---

## References

- **Sync Protocol**: Based on glean-oak-sync-engine checkpoint design
- **Auth**: JWT with refresh-token rotation (industry standard)
- **Encryption**: ChaCha20Poly1305 + Argon2 (OWASP-recommended)
- **IndexedDB**: Dexie.js wrapper; transactional guarantees
- **Tauri**: v2 with Axum embedded server

---

**Last updated**: 2026-03-13
**Architecture version**: 1.0
**Compatibility**: glean-oak-server v1.0+, Tauri v2.0+
