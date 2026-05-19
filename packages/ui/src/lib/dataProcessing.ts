import Papa from "papaparse";
import { parse, isValid, format } from "date-fns";
import type {
  ProcessedTransaction,
  NewTransaction,
} from "@money-insight/ui/types";

export async function parseCSV(file: File): Promise<ProcessedTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeCsvHeader,
      complete: (results) => {
        try {
          const transactions = processTransactions(results.data);
          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse CSV file and return NewTransaction[] for SQLite import
 */
export async function parseCSVForImport(file: File): Promise<NewTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeCsvHeader,
      complete: (results) => {
        try {
          const transactions = processTransactionsForImport(results.data);
          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

function processTransactions(data: any[]): ProcessedTransaction[] {
  return data
    .map((row, index) => {
      if (!row.date) {
        console.warn(`Missing date at row ${index}`);
        return null;
      }

      // Parse date (format: YYYY/MM/DD)
      const date = parse(row.date, "yyyy/MM/dd", new Date());

      if (!isValid(date)) {
        console.warn(`Invalid date at row ${index}:`, row.date);
        return null;
      }

      const amount = parseFloat(row.amount) || 0;

      const transaction: ProcessedTransaction = {
        id: parseInt(row.id) || index,
        note: row.note || "",
        amount,
        category: row.category || "Uncategorized",
        account: row.account || "Unknown",
        currency: row.currency || "VND",
        date,
        event: row.event,
        excludeReport: parseExcludeReport(row),
        expense: amount < 0 ? Math.abs(amount) : 0,
        income: amount > 0 ? amount : 0,
        yearMonth: formatYearMonth(date),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        monthName: date.toLocaleString("default", { month: "long" }),
      };

      return transaction;
    })
    .filter((t): t is ProcessedTransaction => t !== null);
}

function processTransactionsForImport(data: any[]): NewTransaction[] {
  return data
    .map((row, index) => {
      if (!row.date) {
        console.warn(`Missing date at row ${index}`);
        return null;
      }

      // Parse date (format: YYYY/MM/DD)
      const date = parse(row.date, "yyyy/MM/dd", new Date());

      if (!isValid(date)) {
        console.warn(`Invalid date at row ${index}:`, row.date);
        return null;
      }

      const amount = parseFloat(row.amount) || 0;

      const transaction: NewTransaction = {
        note: row.note || "",
        amount,
        category: row.category || "Uncategorized",
        account: row.account || "Unknown",
        currency: row.currency || "VND",
        date: format(date, "yyyy-MM-dd"),
        event: row.event || undefined,
        excludeReport: parseExcludeReport(row),
        source: "csv_import",
      };

      return transaction;
    })
    .filter((t): t is NewTransaction => t !== null);
}

function normalizeCsvHeader(header: string): string {
  const normalized = header.trim().replace(/[\s_-]+/g, "");
  if (normalized.toLowerCase() === "excludereport") {
    return "excludeReport";
  }
  return normalized.replace(/^(.)/, (match) => match.toLowerCase());
}

function parseExcludeReport(row: Record<string, unknown>): boolean {
  const rawValue =
    row.excludeReport ?? row.ExcludeReport ?? row.exclude_report ?? "";
  const value = String(rawValue).trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
