import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ScrollArea,
  Badge,
} from "@/components/atoms";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { CategorySpending } from "@/types";

export interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string | null;
  categoryData: CategorySpending | undefined;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  selectedCategory,
  categoryData,
}: TransactionDetailModalProps) {
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
                {categoryData.transactions
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((transaction) => (
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
                          {transaction.note || "—"}
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
            {categoryData.transactions
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .map((transaction) => (
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
                    {transaction.note && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {transaction.note}
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
