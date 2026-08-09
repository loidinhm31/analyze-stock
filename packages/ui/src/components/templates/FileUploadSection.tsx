import {
  FileUpload,
  AddTransactionForm,
} from "@money-insight/ui/components/organisms";
import type {
  NewTransaction,
  Category,
  Account,
} from "@money-insight/ui/types";

export interface FileUploadSectionProps {
  compact?: boolean;
  isDbReady: boolean;
  onFileProcess: (file: File) => Promise<void>;
  onAddTransaction: (transaction: NewTransaction) => Promise<void>;
  getCategories: () => Promise<Category[]>;
  getAccounts: () => Promise<Account[]>;
}

export function FileUploadSection({
  compact = false,
  isDbReady,
  onFileProcess,
  onAddTransaction,
  getCategories,
  getAccounts,
}: FileUploadSectionProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center px-4 py-6"
          : "flex min-h-screen flex-col items-center justify-center px-4 py-8"
      }
    >
      <div className="space-y-3 sm:space-y-4 text-center mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold font-heading text-foreground sm:text-3xl md:text-4xl">
          {compact ? "Add your first transaction" : "Money Insight"}
        </h1>
        <p className="text-sm sm:text-base max-w-xl sm:max-w-2xl px-4 text-muted-foreground">
          {compact
            ? "Upload a CSV export or add a transaction manually to unlock financial analysis."
            : "Upload your CSV export to analyze spending patterns, track expenses, and discover financial insights."}
        </p>
      </div>

      <FileUpload onFileProcess={onFileProcess} />

      {/* Manual transaction entry */}
      {isDbReady && (
        <div className="mt-8">
          <p className="text-sm text-center mb-3 text-muted-foreground">
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
