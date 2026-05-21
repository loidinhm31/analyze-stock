import { useState } from "react";
import { format } from "date-fns";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
} from "@money-insight/ui/components/atoms";
import { DatePicker } from "@money-insight/ui/components/molecules";
import {
  formatCurrency,
  formatNumericInput,
  parseNumericInput,
} from "@money-insight/ui/lib";
import type { Account, Transaction } from "@money-insight/ui/types";

export interface AdjustBalanceDialogProps {
  account: Account | null;
  currentBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    accountName: string,
    targetBalance: number,
    date: string,
  ) => Promise<Transaction>;
}

export function AdjustBalanceDialog({
  account,
  currentBalance,
  open,
  onOpenChange,
  onSubmit,
}: AdjustBalanceDialogProps) {
  const [targetBalance, setTargetBalance] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !date) return;

    const target = parseNumericInput(targetBalance);
    if (isNaN(target)) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const dateStr = format(date, "yyyy-MM-dd");
      await onSubmit(account.name, target, dateStr);
      onOpenChange(false);
      // Reset form
      setTargetBalance("");
      setDate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setTargetBalance("");
      setDate(new Date());
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const adjustmentAmount =
    targetBalance && !isNaN(parseNumericInput(targetBalance))
      ? parseNumericInput(targetBalance) - currentBalance
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>
              Set the actual balance for {account?.name || "this account"}. An
              adjustment transaction will be created to reconcile the
              difference.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Current Balance Display */}
            <div className="space-y-2">
              <Label>Current Calculated Balance</Label>
              <div
                className={`text-lg font-semibold ${
                  currentBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(currentBalance)}
              </div>
            </div>

            {/* Target Balance Input */}
            <div className="space-y-2">
              <Label htmlFor="targetBalance">Actual Balance</Label>
              <Input
                id="targetBalance"
                type="text"
                inputMode="decimal"
                placeholder="Enter actual balance"
                value={targetBalance}
                onChange={(e) =>
                  setTargetBalance(
                    formatNumericInput(e.target.value, { allowNegative: true }),
                  )
                }
                required
              />
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Adjustment Date</Label>
              <DatePicker
                date={date}
                onDateChange={setDate}
                placeholder="Select date"
                className="w-full"
              />
            </div>

            {/* Adjustment Preview */}
            {targetBalance && !isNaN(parseNumericInput(targetBalance)) && (
              <div className="space-y-2 rounded-lg border p-3">
                <Label className="text-muted-foreground">
                  Adjustment Preview
                </Label>
                <div
                  className={`text-lg font-semibold ${
                    adjustmentAmount >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {adjustmentAmount >= 0 ? "+" : ""}
                  {formatCurrency(adjustmentAmount)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {adjustmentAmount === 0
                    ? "Balance already matches"
                    : adjustmentAmount > 0
                      ? "Will add income adjustment"
                      : "Will add expense adjustment"}
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !targetBalance}>
              {isSubmitting ? "Adjusting..." : "Adjust Balance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
