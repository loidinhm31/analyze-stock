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

export function formatNumericInput(
  value: string,
  options?: { allowNegative?: boolean },
): string {
  const sanitized = sanitizeNumericInput(value, options?.allowNegative ?? false);

  if (
    sanitized === "" ||
    sanitized === "-" ||
    sanitized === "." ||
    sanitized === "-."
  ) {
    return sanitized;
  }

  const sign = sanitized.startsWith("-") ? "-" : "";
  const unsigned = sign ? sanitized.slice(1) : sanitized;
  const hasTrailingDecimal = unsigned.endsWith(".");
  const [rawIntegerPart = "", decimalPart] = unsigned.split(".");
  const normalizedIntegerPart =
    rawIntegerPart === ""
      ? "0"
      : rawIntegerPart.replace(/^0+(?=\d)/, "");
  const groupedIntegerPart = normalizedIntegerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );

  if (hasTrailingDecimal) {
    return `${sign}${groupedIntegerPart}.`;
  }

  if (decimalPart !== undefined) {
    return `${sign}${groupedIntegerPart}.${decimalPart}`;
  }

  return `${sign}${groupedIntegerPart}`;
}

export function parseNumericInput(value: string): number {
  return Number.parseFloat(value.replace(/,/g, ""));
}

function sanitizeNumericInput(value: string, allowNegative: boolean): string {
  let sanitized = "";
  let hasDecimal = false;

  for (const char of value.replace(/,/g, "").trim()) {
    if (char >= "0" && char <= "9") {
      sanitized += char;
      continue;
    }

    if (char === "." && !hasDecimal) {
      sanitized += char;
      hasDecimal = true;
      continue;
    }

    if (char === "-" && allowNegative && sanitized === "") {
      sanitized += char;
    }
  }

  return sanitized;
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
