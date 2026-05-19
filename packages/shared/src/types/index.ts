// Auth & Sync types
export * from "./auth";
export * from "./sync";

// Base transaction interface from Money Lover CSV
export interface MoneyLoverTransaction {
  id: number;
  note: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
  date: Date;
  event?: string;
  excludeReport: boolean;
}

// Enhanced transaction with computed fields
export interface ProcessedTransaction extends MoneyLoverTransaction {
  expense: number;
  income: number;
  yearMonth: string;
  year: number;
  month: number;
  monthName: string;
}

// Category spending analysis
export interface CategorySpending {
  category: string;
  total: number;
  count: number;
  average: number;
  percentage: number;
  transactions: ProcessedTransaction[];
  subCategories?: CategorySpending[];
}

// Category group (parent category for grouping)
export interface CategoryGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isExpense: boolean;
  syncVersion: number;
  syncedAt: number | null;
}

// Category mapping (sub-category to parent group)
export interface CategoryMapping {
  id: string;
  subCategory: string;
  parentGroupId: string;
  syncVersion: number;
  syncedAt: number | null;
}

// Monthly analysis
export interface MonthlyAnalysis {
  yearMonth: string;
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  categoryBreakdown: CategorySpending[];
}

// Yearly analysis
export interface YearlyAnalysis {
  year: number;
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  monthlyData: MonthlyAnalysis[];
  categoryBreakdown: CategorySpending[];
}

// Spending bottleneck detection
export interface SpendingBottleneck {
  type: "high_amount" | "high_frequency" | "trend_increase";
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  amount: number;
  percentage: number;
  suggestion: string;
  transactions: ProcessedTransaction[];
}

// Date range filter
export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

// Filter state
export interface FilterState {
  dateRange: DateRangeFilter | null;
  categories: string[];
  accounts: string[];
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

// Transaction source type
export type TransactionSource = "csv_import" | "manual" | "balance_adjustment" | "transfer";

// Special category for balance adjustments
export const BALANCE_ADJUSTMENT_CATEGORY = "__balance_adjustment__";

// Special category for account transfers
export const TRANSFER_CATEGORY = "__transfer__";
export const OUTGOING_TRANSFER_CATEGORY = "Outgoing Transfer";
export const INCOMING_TRANSFER_CATEGORY = "Incoming Transfer";

// Parsed adjustment note structure
export interface AdjustmentNote {
  targetBalance: number;
}

// Transfer note encoded in transaction note field
export interface TransferNote {
  userNote: string;
  toAccount?: string;   // present on outgoing tx (debit)
  fromAccount?: string; // present on incoming tx (credit)
}

// Params for creating/updating a transfer
export interface TransferParams {
  fromAccount: string;
  toAccount: string;
  amount: number;
  date: string;
  note: string;
  currency: string;
  excludeReport?: boolean;
}

// New transaction for creation (matches Rust NewTransaction)
export interface NewTransaction {
  note: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
  date: string; // ISO format YYYY-MM-DD
  event?: string;
  excludeReport: boolean;
  source?: TransactionSource;
  importBatchId?: number;
  transferId?: string;
}

// Full transaction from database (matches Rust Transaction)
export interface Transaction {
  id: string;
  source: TransactionSource;
  importBatchId?: number;
  transferId?: string;
  note: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
  date: string;
  event?: string;
  excludeReport: boolean;
  expense: number;
  income: number;
  yearMonth: string;
  year: number;
  month: number;
  createdAt: string;
  updatedAt: string;
  syncVersion: number;
  syncedAt: number | null;
}

// Category definition
export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isExpense: boolean;
  syncVersion: number;
  syncedAt: number | null;
}

// Account definition
export interface Account {
  id: string;
  name: string;
  accountType?: string;
  icon?: string;
  initialBalance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  syncVersion: number;
  syncedAt: number | null;
}

// New account for creation
export interface NewAccount {
  name: string;
  accountType?: string;
  icon?: string;
  initialBalance: number;
  currency: string;
}

// Import batch tracking
export interface ImportBatch {
  id: number;
  filename: string;
  recordCount: number;
  importedAt: string;
}

// Filter for querying transactions (matches Rust TransactionFilter)
export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  categories?: string[];
  accounts?: string[];
  minAmount?: number;
  maxAmount?: number;
  source?: TransactionSource;
  search?: string;
}

// Statistics summary
export interface Statistics {
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  categoryCount: number;
  accountCount: number;
}

// Result of import operation
export interface ImportResult {
  batchId: number;
  importedCount: number;
  skippedCount: number;
}

// Daily spending for a single day
export interface DailySpending {
  date: string; // "YYYY-MM-DD"
  dayOfMonth: number; // 1-31
  displayDate: string; // "MM/DD"
  expense: number;
  income: number;
  cumulativeExpense: number;
  cumulativeIncome: number;
}

// Average daily spending pattern from previous months
export interface DailyAverageSpending {
  dayOfMonth: number;
  displayDate: string;
  averageExpense: number;
  averageCumulativeExpense: number;
}

// Monthly report data
export interface MonthlyReport {
  yearMonth: string;
  year: number;
  month: number;
  daysInMonth: number;
  dailySpending: DailySpending[];
  totalExpense: number;
  totalIncome: number;
  currentDayExpense: number;
  previousThreeMonthAverage: number;
  previousThreeMonthDailyPattern: DailyAverageSpending[];
}
