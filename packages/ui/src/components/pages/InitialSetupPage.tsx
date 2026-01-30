import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSpendingStore } from "@/stores/spending-store";
import { FileUploadSection } from "@/components/templates";
import { databaseService } from "@/lib/database-service";
import { parseCSVForImport } from "@/lib/data-processing";
import type { NewTransaction } from "@/types";

/**
 * Initial setup page - shown when no transactions exist
 * Allows user to upload CSV or manually add first transaction
 */
export function InitialSetupPage() {
  const navigate = useNavigate();
  const { isDbReady, addTransaction, importFromCSV } = useSpendingStore();

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

  // Handle add transaction
  const handleAddTransaction = useCallback(
    async (tx: NewTransaction): Promise<void> => {
      await addTransaction(tx);
      // Navigate to dashboard after adding first transaction
      navigate("/dashboard");
    },
    [addTransaction, navigate],
  );

  // Get categories and accounts for form
  const getCategories = useCallback(() => databaseService.getCategories(), []);
  const getAccounts = useCallback(() => databaseService.getAccounts(), []);

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
