import { useCallback } from "react";
import { useSpendingStore } from "@money-insight/ui/stores";
import { useNav } from "@money-insight/ui/hooks";
import { AddTransactionEntry } from "@money-insight/ui/components/templates";
import { parseCSVForImport } from "@money-insight/ui/lib";
import * as categoryService from "@money-insight/ui/services/categoryService";
import * as accountService from "@money-insight/ui/services/accountService";
import type { NewTransaction, TransferParams } from "@money-insight/ui/types";

/**
 * Add Transaction page - allows manual transaction entry or CSV import
 */
export function AddTransactionPage() {
  const { navigate } = useNav();
  const { isDbReady, accounts, addTransaction, createTransfer, importFromCSV } =
    useSpendingStore();

  // Handle add transaction
  const handleAddTransaction = useCallback(
    async (tx: NewTransaction): Promise<void> => {
      await addTransaction(tx);
    },
    [addTransaction],
  );

  const handleTransfer = useCallback(
    async (params: TransferParams): Promise<void> => {
      await createTransfer(params);
      navigate("/dashboard");
    },
    [createTransfer, navigate],
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

  // Get categories and accounts for form
  const getCategories = useCallback(() => categoryService.getCategories(), []);
  const getAccounts = useCallback(() => accountService.getAccounts(), []);

  return (
    <AddTransactionEntry
      onAddTransaction={handleAddTransaction}
      onImportCSV={handleFileProcess}
      getCategories={getCategories}
      getAccounts={getAccounts}
      isDbReady={isDbReady}
      onTransfer={handleTransfer}
      accounts={accounts}
    />
  );
}
