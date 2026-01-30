import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function matchesSearch(
  transaction: {
    note: string;
    category: string;
    account: string;
    amount: number;
    date: string | Date;
    event?: string;
  },
  searchTerm: string,
): boolean {
  if (!searchTerm?.trim()) return true;
  const term = searchTerm.toLowerCase().trim();

  // Search text fields
  if (transaction.note?.toLowerCase().includes(term)) return true;
  if (transaction.category?.toLowerCase().includes(term)) return true;
  if (transaction.account?.toLowerCase().includes(term)) return true;
  if (transaction.event?.toLowerCase().includes(term)) return true;

  // Search amount
  if (String(transaction.amount).includes(term)) return true;
  if (formatCurrency(transaction.amount).toLowerCase().includes(term))
    return true;

  // Search date
  const dateStr =
    typeof transaction.date === "string"
      ? transaction.date
      : transaction.date.toISOString().split("T")[0];
  if (dateStr.includes(term)) return true;

  return false;
}
