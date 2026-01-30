import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    ScrollArea,
    Badge,
} from "@/components/atoms";
import { Pagination } from "@/components/molecules";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { Transaction, ProcessedTransaction } from "@/types";

// Union type for both transaction types
type AnyTransaction = Transaction | ProcessedTransaction;

export interface TransactionListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    transactions: AnyTransaction[];
    valuesHidden?: boolean;
}

// Helper to get date from either type
function getDate(t: AnyTransaction): Date {
    return t.date instanceof Date ? t.date : new Date(t.date);
}

// Helper to get ID from either type
function getId(t: AnyTransaction): string | number {
    return t.id;
}

export function TransactionListModal({
    isOpen,
    onClose,
    title,
    subtitle,
    transactions,
    valuesHidden = false,
}: TransactionListModalProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Sort by date descending
    const sortedTransactions = [...transactions].sort(
        (a, b) => getDate(b).getTime() - getDate(a).getTime()
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

    // Calculate totals
    const totalExpense = transactions.reduce((sum, t) => sum + t.expense, 0);
    const totalIncome = transactions.reduce((sum, t) => sum + t.income, 0);

    // Mask value with asterisks
    const maskValue = (value: string) => "*".repeat(value.length);

    // Reset page when modal opens
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
            setCurrentPage(1);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle style={{ color: "#111827" }}>{title}</DialogTitle>
                    <DialogDescription>
                        {subtitle && <span>{subtitle} • </span>}
                        {transactions.length} transactions
                        {totalExpense > 0 && (
                            <span>
                                {" "}• Total:{" "}
                                {valuesHidden
                                    ? maskValue(formatCurrency(totalExpense))
                                    : formatCurrency(totalExpense)}
                            </span>
                        )}
                        {totalIncome > 0 && (
                            <span>
                                {" "}• Income:{" "}
                                {valuesHidden
                                    ? maskValue(formatCurrency(totalIncome))
                                    : formatCurrency(totalIncome)}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[500px] w-full pr-4">
                    {/* Desktop Table View */}
                    <div className="hidden md:block w-full overflow-x-auto">
                        <table className="w-full min-w-full">
                            <thead className="sticky top-0 bg-background border-b">
                                <tr className="text-left text-sm text-muted-foreground">
                                    <th className="p-3 font-medium">Date</th>
                                    <th className="p-3 font-medium">Category</th>
                                    <th className="p-3 font-medium">Account</th>
                                    <th className="p-3 font-medium">Description</th>
                                    <th className="p-3 font-medium text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTransactions.map((transaction) => {
                                    const amount = transaction.expense || transaction.income;
                                    const isExpense = transaction.expense > 0;
                                    const formattedAmount = formatCurrency(amount);

                                    return (
                                        <tr
                                            key={getId(transaction)}
                                            className="border-b hover:bg-accent transition-colors"
                                        >
                                            <td className="p-3 font-medium whitespace-nowrap">
                                                {format(getDate(transaction), "MMM dd, yyyy")}
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="secondary">{transaction.category}</Badge>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="outline">{transaction.account}</Badge>
                                            </td>
                                            <td className="p-3 max-w-md">
                                                <span className="text-sm text-muted-foreground line-clamp-2">
                                                    {transaction.note || "—"}
                                                </span>
                                            </td>
                                            <td
                                                className="p-3 text-right font-semibold whitespace-nowrap"
                                                style={{ color: isExpense ? "#DC2626" : "#059669" }}
                                            >
                                                {isExpense ? "-" : "+"}
                                                {valuesHidden ? maskValue(formattedAmount) : formattedAmount}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-2">
                        {paginatedTransactions.map((transaction) => {
                            const amount = transaction.expense || transaction.income;
                            const isExpense = transaction.expense > 0;
                            const formattedAmount = formatCurrency(amount);

                            return (
                                <div
                                    key={getId(transaction)}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm">
                                                {format(getDate(transaction), "MMM dd")}
                                            </span>
                                            <Badge variant="secondary" className="text-xs">
                                                {transaction.category}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {transaction.account}
                                            </Badge>
                                        </div>
                                        {transaction.note && (
                                            <p className="text-sm text-muted-foreground mt-1 truncate">
                                                {transaction.note}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right ml-2 flex-shrink-0">
                                        <p
                                            className="font-semibold"
                                            style={{ color: isExpense ? "#DC2626" : "#059669" }}
                                        >
                                            {isExpense ? "-" : "+"}
                                            {valuesHidden ? maskValue(formattedAmount) : formattedAmount}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pt-4 border-t">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={sortedTransactions.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            itemLabel="transactions"
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
