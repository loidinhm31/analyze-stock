import { FileUpload, AddTransactionForm } from "@/components/organisms";
import type { NewTransaction, Category, Account } from "@/types";

export interface FileUploadSectionProps {
  isDbReady: boolean;
  onFileProcess: (file: File) => Promise<void>;
  onAddTransaction: (transaction: NewTransaction) => Promise<void>;
  getCategories: () => Promise<Category[]>;
  getAccounts: () => Promise<Account[]>;
}

export function FileUploadSection({
  isDbReady,
  onFileProcess,
  onAddTransaction,
  getCategories,
  getAccounts,
}: FileUploadSectionProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <div className="space-y-3 sm:space-y-4 text-center mb-6 sm:mb-8">
        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading"
          style={{ color: "#111827" }}
        >
          Spending Analyzer
        </h1>
        <p
          className="text-sm sm:text-base max-w-xl sm:max-w-2xl px-4"
          style={{ color: "#6B7280" }}
        >
          Upload your CSV export to analyze spending patterns, track expenses,
          and discover financial insights.
        </p>
      </div>

      <FileUpload onFileProcess={onFileProcess} />

      {/* Manual transaction entry */}
      {isDbReady && (
        <div className="mt-8">
          <p className="text-sm text-center mb-3" style={{ color: "#6B7280" }}>
            Or add transactions manually:
          </p>
          <AddTransactionForm
            onSubmit={onAddTransaction}
            isDbReady={isDbReady}
            getCategories={getCategories}
            getAccounts={getAccounts}
          />
        </div>
      )}
    </div>
  );
}
