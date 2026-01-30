import { useState } from "react";
import { TransactionItem } from "@/components/molecules";
import { Pagination } from "@/components/molecules";
import type { Transaction } from "@/types";

export interface TransactionListProps {
  transactions: Transaction[];
  itemsPerPage?: number;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  itemsPerPage = 50,
  onTransactionClick,
}: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {sortedTransactions.length} transactions
        </p>
      </div>

      <div className="space-y-2">
        {paginatedTransactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            id={transaction.id}
            date={transaction.date}
            category={transaction.category}
            account={transaction.account}
            note={transaction.note}
            expense={transaction.expense}
            income={transaction.income}
            onClick={() => onTransactionClick?.(transaction)}
          />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedTransactions.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        itemLabel="transactions"
      />
    </div>
  );
}
