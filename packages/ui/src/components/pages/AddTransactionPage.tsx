import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSpendingStore } from "@/stores/spending-store";
import { AddTransactionPage as AddTransactionTemplate } from "@/components/templates";
import { databaseService } from "@/lib/database-service";
import { parseCSVForImport } from "@/lib/data-processing";
import type { NewTransaction } from "@/types";

/**
 * Add Transaction page - allows manual transaction entry or CSV import
 */
export function AddTransactionPage() {
  const navigate = useNavigate();
  const { isDbReady, addTransaction, importFromCSV } = useSpendingStore();

  // Handle add transaction
  const handleAddTransaction = useCallback(
    async (tx: NewTransaction): Promise<void> => {
      await addTransaction(tx);
    },
    [addTransaction],
  );

  // Handle CSV file processing
  const handleFileProcess = useCallback(
    async (file: File) => {
      const transactions = await parseCSVForImport(file);
      if (transactions.length === 0) {
        throw new Error("No valid transactions found in CSV file");
      }
      await importFromCSV(transactions, file.name);
      // Navigate to dashboard after successful import
      navigate("/dashboard");
    },
    [importFromCSV, navigate],
  );

  // Success handler - navigate to dashboard
  const handleSuccess = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // Get categories and accounts for form
  const getCategories = useCallback(() => databaseService.getCategories(), []);
  const getAccounts = useCallback(() => databaseService.getAccounts(), []);

  return (
    <AddTransactionTemplate
      onAddTransaction={handleAddTransaction}
      onImportCSV={handleFileProcess}
      getCategories={getCategories}
      getAccounts={getAccounts}
      isDbReady={isDbReady}
      onSuccess={handleSuccess}
    />
  );
}
