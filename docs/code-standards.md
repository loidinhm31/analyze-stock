# Code Standards & Conventions

## Naming Conventions

### Variables & Functions
- **camelCase**: `const transactionAmount = 100`, `function getBalance() {}`
- **Collections plural**: `transactions[]`, `accounts[]`, `categories[]`
- **Booleans prefixed**: `isLoading`, `hasError`, `canDelete`, `shouldSync`

### Types & Classes
- **PascalCase**: `interface Transaction {}`, `type SyncStatus = ...`
- **Singular nouns**: `type Account`, not `type AccountData`
- **Service interfaces I-prefixed**: `ITransactionService`, `IAuthService`

### Database & Fields
- **camelCase in schema**: `syncVersion`, `syncedAt`, `createdAt`, `updatedAt`, `deletedAt`, `deleted`
- **UUIDs as strings**: `id`, `accountId`, `transferId`, `importBatchId`
- **Enums SCREAMING_CASE**: `enum TransactionSource { MANUAL = "manual", TRANSFER = "transfer" }`

### Components
- **PascalCase files**: `TransactionForm.tsx`, not `transactionForm.tsx`
- **Functional components**: `const TransactionForm = (props) => {}`
- **Fragment shorthand**: `<>...</>` (not `<Fragment>`)

## Service Factory & Dependency Injection

### Pattern
```typescript
// In ServiceFactory.ts
let transactionServiceImpl: ITransactionService;
export function setTransactionService(svc: ITransactionService) {
  transactionServiceImpl = svc;
}
export function getTransactionService(): ITransactionService {
  if (!transactionServiceImpl) throw new Error("Not initialized");
  return transactionServiceImpl;
}
```

### Initialization (MoneyInsightApp.tsx)
```typescript
// Platform-agnostic data adapters (all use IndexedDB)
setTransactionService(new IndexedDBTransactionAdapter());
setAccountService(new IndexedDBAccountAdapter());

// Platform-specific auth adapter
const authAdapter = isTauri()
  ? new TauriAuthAdapter()
  : new QmServerAuthAdapter();
setAuthService(authAdapter);

// Sync adapter
setSyncService(new IndexedDBSyncAdapter());
```

### Service Usage in Components
```typescript
// Import from service facade (not directly from adapter)
import { getTransactionService } from "@/adapters/factory";

export function TransactionForm() {
  const onSubmit = async (tx: NewTransaction) => {
    const service = getTransactionService();
    await service.addTransaction(tx);
  };
}
```

## Zustand Store Patterns

### State Shape
```typescript
interface SpendingState {
  // Data
  transactions: Transaction[];
  accounts: Account[];
  analyzer: MoneyInsightAnalyzer;

  // Computed
  processedTransactions: ProcessedTransaction[];
  statistics: Statistics;
  monthlyAnalysis: MonthlyAnalysis[];

  // Filters & UI
  filters: TransactionFilter;
  isLoading: boolean;
  error: string | null;
  isDbReady: boolean;
  valuesHidden: boolean;

  // Actions
  addTransaction: (tx: NewTransaction) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  createTransfer: (params: TransferParams) => Promise<void>;
  refreshAnalysis: () => void;
  setFilter: (filter: Partial<TransactionFilter>) => void;
}
```

### Action Patterns

**Async actions with service delegation**:
```typescript
addTransaction: async (tx: NewTransaction) => {
  const service = getTransactionService();
  const created = await service.addTransaction(tx);
  set((state) => ({
    transactions: [...state.transactions, created],
  }));
  // Auto-trigger analysis refresh
  triggerAnalysisRefresh();
},
```

**Transfer auto-escalation**:
```typescript
updateTransaction: async (id: string, tx: Partial<Transaction>) => {
  const storedTx = get().transactions.find((t) => t.id === id);

  // If editing a transfer leg, auto-escalate to updateTransfer
  if (storedTx?.transferId) {
    const transferParams = reconstructTransferParams(
      storedTx.transferId,
      get().transactions,
      { ...storedTx, ...tx }
    );
    return get().updateTransfer(transferParams);
  }

  // Normal update
  const service = getTransactionService();
  const updated = await service.updateTransaction(id, tx);
  set((state) => ({
    transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
  }));
  triggerAnalysisRefresh();
},
```

**Transfer pair creation** (atomic):
```typescript
createTransfer: async (params: TransferParams) => {
  const service = getTransactionService();
  const [outgoing, incoming] = await service.createTransfer(params);

  // Single set() call ensures state consistency
  set((state) => ({
    transactions: [...state.transactions, outgoing, incoming],
  }));
  triggerAnalysisRefresh();
},
```

### Analysis Refresh (Debounced)
```typescript
// In categoryGroupStore.ts
let refreshTimeout: NodeJS.Timeout;
export function triggerAnalysisRefresh() {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(async () => {
    // Dynamic import to avoid circular dependency
    const { useSpendingStore } = await import("./spendingStore");
    useSpendingStore.getState().refreshAnalysis();
  }, 50);
}
```

## Component Architecture

### Atomic Design Structure
```
components/
├── atoms/           # Primitives: Button, Input, Card, CategoryIcon
├── molecules/       # Composed: DatePicker, TransactionItem, StatCard
├── organisms/       # Features: TransactionForm, TransferForm, Charts
├── pages/           # Full pages (lazy-loaded): DashboardPage, ReportsPage
└── templates/       # Layouts: AppShell, Dashboard
```

### Component File Organization
```typescript
// File: TransactionForm.tsx
import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/stores"; // Zustand
import { getTransactionService } from "@/adapters/factory"; // DI
import { FormField } from "@/components/molecules";

// Props interface
interface TransactionFormProps {
  onSuccess?: (tx: Transaction) => void;
  onCancel?: () => void;
}

// Component
export function TransactionForm({ onSuccess, onCancel }: TransactionFormProps) {
  const transactions = useStore((s) => s.transactions); // Selector

  // Local state only for form fields
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const service = getTransactionService();
    const tx = await service.addTransaction({ amount, category, /* ... */ });
    onSuccess?.(tx);
  }, [amount, category, onSuccess]);

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Props Typing
```typescript
// Prefer specific prop interfaces over generic `any`
interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
  icon?: React.ReactNode;
}

// Use `React.ReactNode` for children, not `any`
interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}
```

## Performance Optimization Patterns

### Memoization with useMemo
```typescript
// Bad: recomputes on every render
export function ReportsSection() {
  const transactions = useStore((s) => s.transactions);

  const spending = transactions.filter((t) => t.amount < 0);
  const income = transactions.filter((t) => t.amount > 0);

  // ❌ Two passes over data
  return <div>{spending.length}</div>;
}

// Good: single-pass partition in useMemo
export function ReportsSection() {
  const transactions = useStore((s) => s.transactions);

  const { spending, income, total } = useMemo(() => {
    let spending = 0, income = 0;
    for (const tx of transactions) {
      if (tx.amount < 0) spending += Math.abs(tx.amount);
      else income += tx.amount;
    }
    return { spending, income, total: spending + income };
  }, [transactions]);

  return <div>{spending}</div>;
}
```

### Selector-based Store Subscriptions
```typescript
// Good: selector limits re-renders
function TransactionList() {
  const transactions = useStore((s) => s.transactions);
  // Only re-renders when transactions array changes

  return transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />);
}

// Bad: subscribes to entire store
function TransactionList() {
  const store = useStore();
  // Re-renders on ANY state change (loading, filter, etc.)

  return store.transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />);
}
```

### Lazy Component Loading
```typescript
// pages/routes.tsx
import { lazy, Suspense } from "react";

const DashboardPage = lazy(() => import("./DashboardPage"));
const ReportsPage = lazy(() => import("./ReportsPage"));

export function Routes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {/* Route switching */}
    </Suspense>
  );
}
```

## Theme & Styling Conventions

### CSS Variables (Semantic)
```css
/* Root variables (defined in global.css per theme) */
:root {
  --color-bg-light: #f8f9fa;
  --color-bg-white: #ffffff;
  --color-text-primary: #111827;
  --color-primary-500: #635bff;
}

.dark {
  --color-bg-light: #0f172a;
  --color-bg-white: #1e293b;
  --color-text-primary: #f1f5f9;
  --color-primary-500: #818cf8;
}
```

### Tailwind Usage
```tsx
// Always use semantic variables, not hardcoded colors
<button className="bg-(--color-primary-500) text-white">
  Submit
</button>

// Never hardcode colors
<button className="bg-blue-600">❌ Don't do this</button>

// Theme-aware components via CSS variables
<div className="bg-(--color-bg-white) border-(--color-border-light)">
  Card content
</div>
```

### Layout Classes
```tsx
// Flexbox
<div className="flex items-center justify-between gap-4">

// Grid
<div className="grid grid-cols-3 gap-4">

// Padding/margin
<div className="p-4 mb-6">

// Responsive
<div className="md:grid-cols-2 lg:grid-cols-3">
```

## TypeScript Strict Mode

### Required Practices
1. **No implicit any**: `function process(x: unknown) {}`
2. **Null checks**: `if (user) { user.name }`
3. **Type guards**: `if (typeof x === "string") { x.toUpperCase() }`
4. **Exhaustive switch**: Check all union variants

### Type Annotations
```typescript
// Function signatures
function getBalance(accountId: string): Promise<number> {
  // ...
}

// Object literals
const config: TransactionConfig = {
  defaultCategory: "Other",
  supportedCurrencies: ["VND", "USD"],
};

// Array types
const ids: string[] = [];
const handlers: Map<string, Handler> = new Map();
```

## Testing Patterns (Vitest)

### Unit Test Structure
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SpendingStore } from "@/stores";

describe("spendingStore", () => {
  let store: typeof SpendingStore;

  beforeEach(() => {
    store = useSpendingStore.getState();
    store.reset();
  });

  it("should add transaction", async () => {
    // Arrange
    const tx = { amount: 100, category: "Food" };

    // Act
    await store.addTransaction(tx);

    // Assert
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0].amount).toBe(100);
  });

  it("should handle async errors", async () => {
    // Mock service to throw
    vi.mocked(getTransactionService).mockRejectedValueOnce(
      new Error("Network error")
    );

    // Act & Assert
    await expect(store.addTransaction({ amount: 100 }))
      .rejects.toThrow("Network error");
  });
});
```

### Service Mocking
```typescript
import { setTransactionService } from "@/adapters/factory";
import { ITransactionService } from "@/adapters/factory/interfaces";

const mockService: ITransactionService = {
  addTransaction: vi.fn(async (tx) => ({ id: "123", ...tx })),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getTransactions: vi.fn(async () => []),
};

beforeEach(() => {
  setTransactionService(mockService);
});
```

## Code Organization by Feature

### Feature Directory Structure (Example: Transactions)
```
components/
├── organisms/
│   ├── TransactionForm.tsx       # Form component
│   ├── TransactionDetailModal.tsx # Detail view
│   ├── GroupedTransactionList.tsx # List component
│   └── TransactionActions.ts      # Helpers
stores/
├── spendingStore.ts              # State + selectors
└── [state-related stuff]
adapters/
├── factory/
│   └── interfaces/
│       └── ITransactionService.ts # Interface
└── web/
    └── IndexedDBTransactionAdapter.ts # Implementation
services/
└── transactionService.ts          # Facade (delegates to factory)
```

## Error Handling

### API/Service Errors
```typescript
// Always use typed Error subclasses
class SyncError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "SyncError";
  }
}

try {
  await syncService.syncNow();
} catch (err) {
  if (err instanceof SyncError && err.code === "CONFLICT") {
    // Handle conflict
  } else {
    // Unexpected error
  }
}
```

### Store Error State
```typescript
// Zustand store includes error state
interface SpendingState {
  error: string | null;
  setError: (msg: string | null) => void;
}

// Usage in component
const { error, setError } = useStore();
return error ? <ErrorBoundary error={error} /> : <Dashboard />;
```

## Git Conventions

### Commit Messages
- **Type prefix**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Scope (optional)**: `feat(transfer):`, `fix(sync):`
- **Message**: Imperative, lowercase ("add transaction" not "Added transaction")
- **Example**: `feat(transfer): auto-escalate transfer leg edits`

### Branch Naming
- **Feature**: `feat/description` → `feat/transfer-escalation`
- **Fix**: `fix/description` → `fix/sync-checkpoint-bug`
- **Docs**: `docs/description` → `docs/sync-architecture`

### PRs
- Link to issue if applicable
- Document breaking changes clearly
- Include screenshots for UI changes

---

**Last updated**: 2026-03-13
**Standards version**: 1.0
**Enforcement**: ESLint (base + react-internal), TypeScript strict, Prettier (tab 4, width 120)
