import Papa from "papaparse";
import { parse, isValid, format } from "date-fns";
import type { ProcessedTransaction, NewTransaction } from "@/types";

export async function parseCSV(file: File): Promise<ProcessedTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Transform headers to camelCase
        return header
          .replace(/\s+/g, "")
          .replace(/^(.)/, (match) => match.toLowerCase());
      },
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
      transformHeader: (header) => {
        return header
          .replace(/\s+/g, "")
          .replace(/^(.)/, (match) => match.toLowerCase());
      },
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

      // Robust boolean check for excludeReport - handles True, true, TRUE, 1, yes, etc.
      const excludeReportValue = String(row.excludeReport || "")
        .trim()
        .toLowerCase();
      const isExcluded =
        excludeReportValue === "true" ||
        excludeReportValue === "1" ||
        excludeReportValue === "yes";

      const transaction: ProcessedTransaction = {
        id: parseInt(row.id) || index,
        note: row.note || "",
        amount,
        category: row.category || "Uncategorized",
        account: row.account || "Unknown",
        currency: row.currency || "VND",
        date,
        event: row.event,
        excludeReport: isExcluded,
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

      // Robust boolean check for excludeReport - handles True, true, TRUE, 1, yes, etc.
      const excludeReportValue = String(row.excludeReport || "")
        .trim()
        .toLowerCase();
      const isExcluded =
        excludeReportValue === "true" ||
        excludeReportValue === "1" ||
        excludeReportValue === "yes";

      const transaction: NewTransaction = {
        note: row.note || "",
        amount,
        category: row.category || "Uncategorized",
        account: row.account || "Unknown",
        currency: row.currency || "VND",
        date: format(date, "yyyy-MM-dd"), // ISO format for SQLite
        event: row.event || undefined,
        exclude_report: isExcluded,
        source: "csv_import",
      };

      return transaction;
    })
    .filter((t): t is NewTransaction => t !== null);
}

function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
