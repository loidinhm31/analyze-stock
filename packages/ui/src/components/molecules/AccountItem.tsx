import { useState } from "react";
import { Trash2, Scale } from "lucide-react";
import { AccountIcon, ACCOUNT_ICONS, Badge, Button } from "@money-insight/ui/components/atoms";
import { cn } from "@money-insight/ui/lib";

export interface AccountItemProps {
  id: string;
  name: string;
  accountType?: string;
  icon?: string;
  initialBalance: number;
  balance?: number; // Calculated balance including transactions
  currency: string;
  onClick?: () => void;
  onDelete?: (id: string) => void;
  onAdjustBalance?: (id: string) => void;
}

function formatCurrencyWithCode(amount: number, currency: string): string {
  const formatters: Record<string, Intl.NumberFormat> = {
    VND: new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }),
    USD: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }),
    EUR: new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }),
    JPY: new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }),
    GBP: new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 2,
    }),
  };

  const formatter = formatters[currency] || formatters.VND;
  return formatter.format(amount);
}

export function AccountItem({
  id,
  name,
  accountType,
  icon,
  initialBalance,
  balance,
  currency,
  onClick,
  onDelete,
  onAdjustBalance,
}: AccountItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Use calculated balance if available, otherwise use initialBalance
  const displayBalance = balance !== undefined ? balance : initialBalance;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete?.(id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const handleAdjust = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdjustBalance?.(id);
  };

  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {icon && (
            ACCOUNT_ICONS[icon]
              ? <AccountIcon name={icon} size={24} />
              : <span className="text-2xl">{icon}</span>
          )}
          <span className="font-medium">{name}</span>
          {accountType && <Badge variant="outline">{accountType}</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p
            className={cn(
              "font-semibold",
              displayBalance >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {formatCurrencyWithCode(displayBalance, currency)}
          </p>
          <p className="text-xs text-muted-foreground">{currency}</p>
        </div>
        {onAdjustBalance && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAdjust}
            title="Adjust balance"
          >
            <Scale className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant={confirmDelete ? "destructive" : "ghost"}
            size="icon"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
