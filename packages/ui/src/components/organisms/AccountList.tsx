import { AccountItem } from "@money-insight/ui/components/molecules";
import { AddAccountDialog } from "@money-insight/ui/components/organisms";
import { Button } from "@money-insight/ui/components/atoms";
import { ArrowLeftRight } from "lucide-react";
import type { Account, NewAccount } from "@money-insight/ui/types";

export interface AccountListProps {
  accounts: Account[];
  accountBalances?: Map<string, number>; // Map of account name to calculated balance
  creditCardStatementTotals?: Map<string, number | null>; // Map of account id to current statement total
  onAccountClick?: (account: Account) => void;
  onAccountDelete?: (id: string) => void;
  onAccountAdd: (account: NewAccount) => Promise<Account | void>;
  onAdjustBalance?: (account: Account) => void;
  onTransfer?: (account?: Account) => void;
  onConfirmPayment?: (account: Account) => void;
}

export function AccountList({
  accounts,
  accountBalances,
  creditCardStatementTotals,
  onAccountClick,
  onAccountDelete,
  onAccountAdd,
  onAdjustBalance,
  onTransfer,
  onConfirmPayment,
}: AccountListProps) {
  // Sort accounts alphabetically by name
  const sortedAccounts = [...accounts].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {accounts.length === 0
            ? "No accounts yet"
            : `Showing ${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {onTransfer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onTransfer()}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer Money
            </Button>
          )}
          <AddAccountDialog onSubmit={onAccountAdd} />
        </div>
      </div>

      {sortedAccounts.length > 0 ? (
        <div className="space-y-2">
          {sortedAccounts.map((account) => (
            <AccountItem
              key={account.id}
              {...account}
              balance={accountBalances?.get(account.name)}
              statementTotal={creditCardStatementTotals?.get(account.id)}
              onClick={() => onAccountClick?.(account)}
              onDelete={onAccountDelete}
              onAdjustBalance={
                onAdjustBalance ? () => onAdjustBalance(account) : undefined
              }
              onTransfer={onTransfer ? () => onTransfer(account) : undefined}
              onConfirmPayment={
                onConfirmPayment ? () => onConfirmPayment(account) : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No accounts found.</p>
          <p className="text-sm mt-2">Click Add Account to get started.</p>
        </div>
      )}
    </div>
  );
}
