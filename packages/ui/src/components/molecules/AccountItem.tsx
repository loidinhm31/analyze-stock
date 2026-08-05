import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, Scale, Trash2 } from "lucide-react";
import {
  AccountIcon,
  ACCOUNT_ICONS,
  Badge,
  Button,
} from "@money-insight/ui/components/atoms";
import {
  cn,
  getCreditCardPaymentDueStatus,
  getCreditCardPaymentDueStatusLabel,
  isCreditCardPaymentReminderComplete,
} from "@money-insight/ui/lib";

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
  onTransfer?: () => void;
  paymentDueDay?: number;
  paymentCycleStartDate?: string;
  paymentCycleStartDay?: number;
  interestFreeDays?: number;
  paymentReminderEnabled?: boolean;
  nextPaymentDueDate?: string;
  lastPaymentConfirmedDueDate?: string;
  lastPaymentConfirmedAt?: string;
  statementTotal?: number | null;
  onConfirmPayment?: (id: string) => void;
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
  onTransfer,
  paymentCycleStartDate,
  paymentCycleStartDay,
  interestFreeDays,
  paymentReminderEnabled,
  nextPaymentDueDate,
  lastPaymentConfirmedDueDate,
  statementTotal,
  onConfirmPayment,
}: AccountItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Use calculated balance if available, otherwise use initialBalance
  const displayBalance = balance !== undefined ? balance : initialBalance;
  const isCreditCard = accountType === "Credit Card";
  const paymentStatus = getCreditCardPaymentDueStatus({
    nextPaymentDueDate,
    lastPaymentConfirmedDueDate,
  });
  const paymentSetupComplete = isCreditCardPaymentReminderComplete({
    id,
    paymentCycleStartDate,
    paymentCycleStartDay,
    interestFreeDays,
    nextPaymentDueDate,
  });
  const hasStatementDue =
    typeof statementTotal === "number" &&
    Number.isFinite(statementTotal) &&
    statementTotal < 0;
  const statementCalculationUnavailable =
    isCreditCard &&
    paymentReminderEnabled === true &&
    paymentSetupComplete &&
    statementTotal === null;
  const canConfirmPayment =
    isCreditCard &&
    paymentReminderEnabled === true &&
    paymentSetupComplete &&
    !!nextPaymentDueDate &&
    hasStatementDue;

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

  const handleTransfer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTransfer?.();
  };

  const handleConfirmPayment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirmPayment?.(id);
  };

  return (
    <div
      className="flex flex-col items-stretch gap-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {icon &&
            (ACCOUNT_ICONS[icon] ? (
              <AccountIcon name={icon} size={24} />
            ) : (
              <span className="text-2xl">{icon}</span>
            ))}
          <span className="font-medium">{name}</span>
          {accountType && <Badge variant="outline">{accountType}</Badge>}
        </div>
        {isCreditCard && paymentReminderEnabled && !paymentSetupComplete && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <Badge variant="warning">Needs setup</Badge>
            <span className="text-muted-foreground">
              Add cycle start date and interest-free days.
            </span>
          </div>
        )}
        {isCreditCard &&
          paymentReminderEnabled &&
          paymentSetupComplete &&
          nextPaymentDueDate && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <Badge
                variant={
                  paymentStatus === "overdue"
                    ? "destructive"
                    : paymentStatus === "confirmed"
                      ? "success"
                      : "warning"
                }
              >
                {getCreditCardPaymentDueStatusLabel(paymentStatus)}
              </Badge>
              <span className="text-muted-foreground">
                Due {nextPaymentDueDate}
              </span>
              {hasStatementDue && (
                <span className="text-muted-foreground">
                  Statement due{" "}
                  {formatCurrencyWithCode(
                    Math.abs(statementTotal ?? 0),
                    currency,
                  )}
                </span>
              )}
              {statementCalculationUnavailable && (
                <span className="text-warning-foreground" role="status">
                  Statement unavailable; check transaction dates or amounts.
                </span>
              )}
              {lastPaymentConfirmedDueDate && (
                <span className="text-muted-foreground">
                  Last confirmed cycle {lastPaymentConfirmedDueDate}
                </span>
              )}
            </div>
          )}
      </div>
      <div className="flex w-full shrink-0 items-center justify-between gap-1 sm:w-auto sm:justify-end sm:gap-2">
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
        {canConfirmPayment && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 min-w-11 gap-1.5 px-3"
            onClick={handleConfirmPayment}
            title={`Confirm payment for ${name}`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Confirm payment</span>
            <span className="sr-only sm:hidden">
              Confirm payment for {name}
            </span>
          </Button>
        )}
        {onAdjustBalance && (
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={handleAdjust}
            title="Adjust balance"
          >
            <Scale className="h-4 w-4" />
          </Button>
        )}
        {onTransfer && (
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={handleTransfer}
            title="Transfer money"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant={confirmDelete ? "destructive" : "ghost"}
            size="icon"
            className="min-h-11 min-w-11"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
