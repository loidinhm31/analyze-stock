// Domain types — single source of truth from shared
export type {
  MoneyLoverTransaction,
  TransactionSource,
  DebtType,
  NewDebt,
  Debt,
  DebtSettlement,
  DebtSettlementInput,
  NewTransaction,
  Transaction,
  Category,
  CategoryGroup,
  CategoryMapping,
  Account,
  NewAccount,
  ImportBatch,
  TransactionFilter,
  Statistics,
  ImportResult,
  AdjustmentNote,
  TransferNote,
  TransferParams,
} from "@money-insight/shared/types";

// UI-specific types
export type {
  ProcessedTransaction,
  CategorySpending,
  MonthlyAnalysis,
  YearlyAnalysis,
  SpendingBottleneck,
  DateRangeFilter,
  FilterState,
  DailySpending,
  DailyAverageSpending,
  MonthlyReport,
} from "@money-insight/shared/types";
