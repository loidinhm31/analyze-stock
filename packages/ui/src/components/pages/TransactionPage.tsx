import { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
} from "@money-insight/ui/components/atoms";
import { useSpendingStore } from "@money-insight/ui/stores";
import { useNav } from "@money-insight/ui/hooks";
import {
  TimePeriodSelector,
  AccountStats,
} from "@money-insight/ui/components/molecules";
import {
  GroupedTransactionList,
  EditTransactionDialog,
  AccountList,
  EditAccountDialog,
  AdjustBalanceDialog,
  TransferForm,
  AddTransactionForm,
} from "@money-insight/ui/components/organisms";
import type { TimePeriodMode } from "@money-insight/ui/lib";
import type {
  Transaction,
  Account,
  TransferParams,
  NewTransaction,
} from "@money-insight/ui/types";
import * as categoryService from "@money-insight/ui/services/categoryService";
import * as accountService from "@money-insight/ui/services/accountService";

export function TransactionPage() {
  const { to } = useNav();
  const {
    transactions,
    accounts,
    valuesHidden,
    isDbReady,
    updateTransaction,
    addTransaction,
    deleteTransaction,
    updateTransfer,
    deleteTransfer,
    createTransfer,
    addAccount,
    updateAccount,
    deleteAccount,
    adjustBalance,
  } = useSpendingStore();

  const [activeTab, setActiveTab] = useState("transactions");
  const [periodMode, setPeriodMode] = useState<TimePeriodMode>("month");
  const [selectedAccount, setSelectedAccount] = useState<string>("__all__");
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [adjustingAccount, setAdjustingAccount] = useState<Account | null>(
    null,
  );
  const [transferFromAccount, setTransferFromAccount] =
    useState<Account | null>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

  const displayTransactions =
    selectedAccount !== "__all__"
      ? transactions.filter((t) => t.account === selectedAccount)
      : transactions;

  const getCategories = useCallback(() => categoryService.getCategories(), []);
  const getAccounts = useCallback(() => accountService.getAccounts(), []);

  // Calculate current balance for each account
  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    for (const account of accounts) {
      let balance = account.initialBalance;
      for (const tx of transactions) {
        if (tx.account === account.name) {
          balance += tx.income - tx.expense;
        }
      }
      balances.set(account.name, balance);
    }
    return balances;
  }, [accounts, transactions]);

  const handleTransactionClick = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
  }, []);

  const handleTransactionSubmit = useCallback(
    async (transaction: Transaction) => {
      await updateTransaction(transaction);
    },
    [updateTransaction],
  );

  const handleAddTransaction = useCallback(
    async (transaction: NewTransaction) => {
      await addTransaction(transaction);
    },
    [addTransaction],
  );

  const handleTransactionDelete = useCallback(
    async (id: string) => {
      await deleteTransaction(id);
    },
    [deleteTransaction],
  );

  const handleAccountClick = useCallback((account: Account) => {
    setEditingAccount(account);
  }, []);

  const handleAccountSubmit = useCallback(
    async (account: Account) => {
      await updateAccount(account);
    },
    [updateAccount],
  );

  const handleAccountDelete = useCallback(
    async (id: string) => {
      await deleteAccount(id);
    },
    [deleteAccount],
  );

  const handleAdjustBalance = useCallback((account: Account) => {
    setAdjustingAccount(account);
  }, []);

  const handleTransferOpen = useCallback((account?: Account) => {
    setTransferFromAccount(account ?? null);
    setIsTransferDialogOpen(true);
  }, []);

  const handleTransferSubmit = useCallback(
    async (params: TransferParams) => {
      await createTransfer(params);
      setIsTransferDialogOpen(false);
      setTransferFromAccount(null);
    },
    [createTransfer],
  );

  const handleAdjustBalanceSubmit = useCallback(
    async (accountName: string, targetBalance: number, date: string) => {
      return adjustBalance(accountName, targetBalance, date);
    },
    [adjustBalance],
  );

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Link
          to={to("dashboard")}
          className="p-2 rounded-lg hover:bg-(--color-bg-light) transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-secondary-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-heading text-foreground">
            Transactions & Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === "transactions"
              ? `${displayTransactions.length} transactions`
              : `${accounts.length} accounts`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="sticky top-0 z-10 border-b px-4 pt-2 bg-card">
            <TabsList className="w-full grid grid-cols-2 mb-2">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
            </TabsList>
          </div>

          {/* Transactions Tab Content */}
          <TabsContent value="transactions" className="mt-0">
            {/* Sticky period selector + account filter */}
            <div className="sticky top-13 z-10 border-b p-4 bg-card space-y-2">
              <div className="flex justify-end">
                <AddTransactionForm
                  onSubmit={handleAddTransaction}
                  isDbReady={isDbReady}
                  getCategories={getCategories}
                  getAccounts={getAccounts}
                  closeOnSuccess={false}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Group by
                </span>
                <TimePeriodSelector
                  value={periodMode}
                  onChange={setPeriodMode}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Account
                </span>
                <Select
                  value={selectedAccount}
                  onValueChange={setSelectedAccount}
                >
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.name}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grouped transaction list */}
            <div className="p-4">
              <GroupedTransactionList
                transactions={displayTransactions}
                periodMode={periodMode}
                valuesHidden={valuesHidden}
                onTransactionClick={handleTransactionClick}
              />
            </div>
          </TabsContent>

          {/* Accounts Tab Content */}
          <TabsContent value="accounts" className="mt-0">
            <div className="p-4 space-y-4">
              {accounts.length > 0 && (
                <AccountStats
                  accounts={accounts}
                  accountBalances={accountBalances}
                />
              )}
              <AccountList
                accounts={accounts}
                accountBalances={accountBalances}
                onAccountClick={handleAccountClick}
                onAccountDelete={handleAccountDelete}
                onAccountAdd={addAccount}
                onAdjustBalance={handleAdjustBalance}
                onTransfer={handleTransferOpen}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        transaction={editingTransaction}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSubmit={handleTransactionSubmit}
        onDelete={handleTransactionDelete}
        onUpdateTransfer={async (transferId, params) => {
          await updateTransfer(transferId, params);
          setEditingTransaction(null);
        }}
        onDeleteTransfer={async (transferId) => {
          await deleteTransfer(transferId);
          setEditingTransaction(null);
        }}
        isDbReady={isDbReady}
        getCategories={getCategories}
        getAccounts={getAccounts}
        accounts={accounts}
        allTransactions={transactions}
      />

      {/* Edit Account Dialog */}
      <EditAccountDialog
        account={editingAccount}
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        onSubmit={handleAccountSubmit}
        onDelete={handleAccountDelete}
      />

      {/* Adjust Balance Dialog */}
      <AdjustBalanceDialog
        account={adjustingAccount}
        currentBalance={
          adjustingAccount
            ? (accountBalances.get(adjustingAccount.name) ?? 0)
            : 0
        }
        open={!!adjustingAccount}
        onOpenChange={(open) => !open && setAdjustingAccount(null)}
        onSubmit={handleAdjustBalanceSubmit}
      />

      {/* Transfer Money Dialog */}
      <Dialog
        open={isTransferDialogOpen}
        onOpenChange={(open) => {
          setIsTransferDialogOpen(open);
          if (!open) setTransferFromAccount(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col p-0">
          <TransferForm
            key={transferFromAccount?.id ?? "blank-transfer"}
            mode="add"
            accounts={accounts}
            isDbReady={isDbReady}
            initialFromAccount={transferFromAccount?.name}
            onSubmit={handleTransferSubmit}
            onCancel={() => {
              setIsTransferDialogOpen(false);
              setTransferFromAccount(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
