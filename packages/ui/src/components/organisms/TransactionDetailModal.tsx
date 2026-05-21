import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ScrollArea,
  Badge,
} from "@money-insight/ui/components/atoms";
import { format } from "date-fns";
import { formatCurrency } from "@money-insight/ui/lib";
import { getTransferDisplayNote } from "@money-insight/ui/services/transferService";
import type { CategorySpending } from "@money-insight/ui/types";

export interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string | null;
  categoryData: CategorySpending | undefined;
}

function getTransactionDescription(transaction: {
  note: string;
  source?: string;
}): string {
  if (transaction.source === "transfer") {
    return getTransferDisplayNote(transaction);
  }

  return transaction.note || "—";
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  selectedCategory,
  categoryData,
}: TransactionDetailModalProps) {
  const sortedTransactions = useMemo(
    () =>
      categoryData
        ? [...categoryData.transactions].sort(
            (a, b) => b.date.getTime() - a.date.getTime(),
          )
        : [],
    [categoryData],
  );

  if (!selectedCategory || !categoryData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{selectedCategory}</DialogTitle>
          <DialogDescription>
            {categoryData.count} transactions • Total:{" "}
            {formatCurrency(categoryData.total)}
            {" • "}Average: {formatCurrency(categoryData.average)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] w-full pr-4">
          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="sticky top-0 bg-background border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Account</th>
                  <th className="p-3 font-medium">Description</th>
                  <th className="p-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b hover:bg-accent transition-colors"
                    >
                      <td className="p-3 font-medium whitespace-nowrap">
                        {format(transaction.date, "MMM dd, yyyy")}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{transaction.account}</Badge>
                      </td>
                      <td className="p-3 max-w-md">
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {getTransactionDescription(transaction)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-red-600 whitespace-nowrap">
                        -{formatCurrency(transaction.expense)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {sortedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(transaction.date, "MMM dd, yyyy")}
                      </span>
                      <Badge variant="outline">{transaction.account}</Badge>
                    </div>
                    {getTransactionDescription(transaction) !== "—" && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {getTransactionDescription(transaction)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      -{formatCurrency(transaction.expense)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
