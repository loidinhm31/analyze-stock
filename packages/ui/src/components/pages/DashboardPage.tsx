import { useCallback, useMemo } from "react";
import { useSpendingStore } from "@money-insight/ui/stores/spendingStore";
import {
  Dashboard,
  FileUploadSection,
} from "@money-insight/ui/components/templates";
import type { AccountTypeValueWidgetProps } from "@money-insight/ui/components/organisms";
import { parseCSVForImport } from "@money-insight/ui/lib";
import * as categoryService from "@money-insight/ui/services/categoryService";
import * as accountService from "@money-insight/ui/services/accountService";
import { getAccountTypeValueHistory } from "@money-insight/ui/services/account-type-value-history";
import { useAccountTypeValuePreferences } from "@money-insight/ui/hooks";
import type { NewTransaction } from "@money-insight/ui/types";

/**
 * Dashboard page - shows spending analytics and transaction overview
 * If no transactions exist, shows initial upload screen
 */
export function DashboardPage() {
  const {
    transactions,
    accounts,
    filteredTransactions,
    categorySpending,
    monthlyAnalysis,
    bottlenecks,
    walletBalances,
    currentMonthReport,
    statistics,
    filter,
    isDbReady,
    valuesHidden,
    importFromCSV,
    addTransaction,
    setFilter,
    clearFilter,
    toggleValuesHidden,
  } = useSpendingStore();
  const {
    selectedAccountTypes,
    isLoading: isPreferencesLoading,
    error: preferencesError,
    reload: reloadPreferences,
    save: savePreferences,
  } = useAccountTypeValuePreferences();

  // Handle CSV file processing
  const handleFileProcess = useCallback(
    async (file: File) => {
      const transactions = await parseCSVForImport(file);
      if (transactions.length === 0) {
        throw new Error("No valid transactions found in CSV file");
      }
      await importFromCSV(transactions, file.name);
    },
    [importFromCSV],
  );

  // Handle add transaction
  const handleAddTransaction = useCallback(
    async (tx: NewTransaction): Promise<void> => {
      await addTransaction(tx);
    },
    [addTransaction],
  );

  // Handle filter apply
  const handleFilterApply = useCallback(
    (dateRange: { startDate: Date; endDate: Date }) => {
      setFilter({ dateRange });
    },
    [setFilter],
  );

  // Handle search change
  const handleSearchChange = useCallback(
    (search: string) => {
      setFilter({ search });
    },
    [setFilter],
  );

  // Get categories and accounts for form
  const getCategories = useCallback(() => categoryService.getCategories(), []);
  const getAccounts = useCallback(() => accountService.getAccounts(), []);

  // Convert filter to expected format for Dashboard
  const dashboardFilter = useMemo(
    () => ({
      dateRange: filter.dateRange
        ? {
            startDate: filter.dateRange.startDate,
            endDate: filter.dateRange.endDate,
          }
        : undefined,
      search: filter.search,
    }),
    [filter.dateRange, filter.search],
  );

  const accountValueHistories = useMemo(() => {
    if (!selectedAccountTypes || preferencesError) return [];
    return getAccountTypeValueHistory(
      accounts,
      transactions,
      selectedAccountTypes,
    );
  }, [accounts, preferencesError, selectedAccountTypes, transactions]);

  const accountValueWidget = useMemo<AccountTypeValueWidgetProps>(
    () => ({
      selectedAccountTypes,
      histories: accountValueHistories,
      isLoading: isPreferencesLoading,
      error: preferencesError,
      valuesHidden,
      onSaveSelection: savePreferences,
      onRetry: reloadPreferences,
    }),
    [
      accountValueHistories,
      isPreferencesLoading,
      preferencesError,
      reloadPreferences,
      savePreferences,
      selectedAccountTypes,
      valuesHidden,
    ],
  );

  const emptyActivityContent =
    transactions.length === 0 && accounts.length > 0 ? (
      <FileUploadSection
        compact
        getAccounts={getAccounts}
        getCategories={getCategories}
        isDbReady={isDbReady}
        onAddTransaction={handleAddTransaction}
        onFileProcess={handleFileProcess}
      />
    ) : undefined;

  // Keep the full onboarding view only until the user has created an account.
  if (transactions.length === 0 && accounts.length === 0) {
    return (
      <FileUploadSection
        isDbReady={isDbReady}
        onFileProcess={handleFileProcess}
        onAddTransaction={handleAddTransaction}
        getCategories={getCategories}
        getAccounts={getAccounts}
      />
    );
  }

  // Use filtered transactions if filter is active, otherwise use all transactions
  const displayTransactions =
    filter.dateRange ||
    filter.categories.length > 0 ||
    filter.accounts.length > 0 ||
    filter.search?.trim()
      ? filteredTransactions
      : transactions;

  return (
    <Dashboard
      transactions={displayTransactions}
      categorySpending={categorySpending}
      monthlyAnalysis={monthlyAnalysis}
      bottlenecks={bottlenecks}
      walletBalances={walletBalances}
      currentMonthReport={currentMonthReport}
      stats={statistics}
      accountValueWidget={accountValueWidget}
      emptyActivityContent={emptyActivityContent}
      hasUnfilteredTransactions={transactions.length > 0}
      filter={dashboardFilter}
      onSearchChange={handleSearchChange}
      onFilterApply={handleFilterApply}
      onFilterClear={clearFilter}
      valuesHidden={valuesHidden}
      onToggleValuesHidden={toggleValuesHidden}
    />
  );
}
