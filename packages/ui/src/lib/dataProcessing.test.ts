import { describe, expect, it } from "vitest";
import { parseCSVForImport } from "./dataProcessing";

describe("parseCSVForImport", () => {
  it("parses Exclude Report True/False values", async () => {
    const csv = [
      "date,note,amount,category,account,currency,Exclude Report",
      "2024/01/15,Internal move,-100000,Outgoing Transfer,Cash,VND,True",
      "2024/01/15,Salary,5000000,Income,Bank,VND,False",
    ].join("\n");

    const transactions = await parseCSVForImport(csv as unknown as File);

    expect(transactions).toHaveLength(2);
    expect(transactions[0].excludeReport).toBe(true);
    expect(transactions[1].excludeReport).toBe(false);
  });

  it("defaults missing Exclude Report values to false", async () => {
    const csv = [
      "date,note,amount,category,account,currency",
      "2024/01/15,Coffee,-50000,Food,Cash,VND",
    ].join("\n");

    const transactions = await parseCSVForImport(csv as unknown as File);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].excludeReport).toBe(false);
  });

  it("parses snake_case exclude_report headers", async () => {
    const csv = [
      "date,note,amount,category,account,currency,exclude_report",
      "2024/01/15,Internal move,-100000,Outgoing Transfer,Cash,VND,true",
    ].join("\n");

    const transactions = await parseCSVForImport(csv as unknown as File);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].excludeReport).toBe(true);
  });
});
