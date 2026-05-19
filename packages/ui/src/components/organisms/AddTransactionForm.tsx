import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@money-insight/ui/components/atoms";
import { TransactionForm } from "./TransactionForm";
import { TransferForm } from "./TransferForm";
import type {
  NewTransaction,
  Category,
  Account,
  TransferParams,
} from "@money-insight/ui/types";

export interface AddTransactionFormProps {
  onSubmit: (transaction: NewTransaction) => Promise<void>;
  onTransfer?: (params: TransferParams) => Promise<void>;
  isDbReady: boolean;
  getCategories: () => Promise<Category[]>;
  getAccounts: () => Promise<Account[]>;
  accounts?: Account[];
  onSuccess?: () => void;
  closeOnSuccess?: boolean;
}

export function AddTransactionForm({
  onSubmit,
  onTransfer,
  isDbReady,
  getCategories,
  getAccounts,
  accounts = [],
  onSuccess,
  closeOnSuccess = true,
}: AddTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [isTransferMode, setIsTransferMode] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setIsTransferMode(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col p-0">
        {isTransferMode ? (
          <TransferForm
            mode="add"
            accounts={accounts}
            isDbReady={isDbReady}
            onSubmit={async (params) => {
              await onTransfer?.(params);
              onSuccess?.();
              handleOpenChange(false);
            }}
            onCancel={() => setIsTransferMode(false)}
          />
        ) : (
          <>
            <TransactionForm
              mode="add"
              onSubmit={onSubmit}
              onCancel={() => handleOpenChange(false)}
              isDbReady={isDbReady}
              getCategories={getCategories}
              getAccounts={getAccounts}
              onSuccess={onSuccess}
              closeOnSuccess={closeOnSuccess}
            />
            {onTransfer && (
              <div className="px-6 pb-4 flex-shrink-0 -mt-2">
                <button
                  type="button"
                  className="w-full text-sm text-(--color-text-secondary) hover:text-(--color-primary-500) py-2 transition-colors"
                  onClick={() => setIsTransferMode(true)}
                >
                  Or make a transfer between accounts
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
