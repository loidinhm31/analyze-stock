import { format } from "date-fns";
import { Badge } from "@/components/atoms";
import { formatCurrency } from "@/lib/utils";

export interface TransactionItemProps {
  id: string | number;
  date: string | Date;
  category: string;
  account: string;
  note?: string;
  expense: number;
  income: number;
  onClick?: () => void;
}

export function TransactionItem({
  date,
  category,
  account,
  note,
  expense,
  income,
  onClick,
}: TransactionItemProps) {
  const transactionDate = typeof date === "string" ? new Date(date) : date;
  const isExpense = expense > 0;

  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">
            {format(transactionDate, "MMM dd, yyyy")}
          </span>
          <Badge variant="outline">{category}</Badge>
          <Badge variant="secondary">{account}</Badge>
        </div>
        {note && <p className="text-sm text-muted-foreground mt-1">{note}</p>}
      </div>
      <div className="text-right">
        <p
          className={`font-semibold ${isExpense ? "text-red-600" : "text-green-600"}`}
        >
          {isExpense
            ? `-${formatCurrency(expense)}`
            : `+${formatCurrency(income)}`}
        </p>
      </div>
    </div>
  );
}
