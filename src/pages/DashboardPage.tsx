import { useMemo, useCallback } from "react";
import { useSpendingStore } from "@/stores/spending-store";
import { Dashboard } from "@/components/templates";
import { FileUploadSection } from "@/components/templates";
import { databaseService } from "@/lib/database-service";
import { parseCSVForImport } from "@/lib/data-processing";
import type { NewTransaction } from "@/types";

/**
 * Dashboard page - shows spending analytics and transaction overview
 * If no transactions exist, shows initial upload screen
 */
export function DashboardPage() {
  const {
    transactions,
    filteredTransactions,
    categorySpending,
    monthlyAnalysis,
    bottlenecks,
    walletBalances,
    statistics,
    selectedCategory,
    filter,
    isDbReady,
    valuesHidden,
    importFromCSV,
    addTransaction,
    selectCategory,
    setFilter,
    clearFilter,
    toggleValuesHidden,
  } = useSpendingStore();

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

  // Get categories and accounts for form
  const getCategories = useCallback(() => databaseService.getCategories(), []);
  const getAccounts = useCallback(() => databaseService.getAccounts(), []);

  // Convert filter to expected format for Dashboard
  const dashboardFilter = useMemo(
    () => ({
      dateRange: filter.dateRange
        ? {
            startDate: filter.dateRange.startDate,
            endDate: filter.dateRange.endDate,
          }
        : undefined,
    }),
    [filter.dateRange],
  );

  // Show initial upload if no transactions
  if (transactions.length === 0) {
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
    filter.accounts.length > 0
      ? filteredTransactions
      : transactions;

  return (
    <Dashboard
      transactions={displayTransactions}
      categorySpending={categorySpending}
      monthlyAnalysis={monthlyAnalysis}
      bottlenecks={bottlenecks}
      walletBalances={walletBalances}
      stats={statistics}
      selectedCategory={selectedCategory}
      filter={dashboardFilter}
      onCategorySelect={selectCategory}
      onFilterApply={handleFilterApply}
      onFilterClear={clearFilter}
      valuesHidden={valuesHidden}
      onToggleValuesHidden={toggleValuesHidden}
    />
  );
}
