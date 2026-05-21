import { describe, expect, it } from "vitest";
import { formatNumericInput, parseNumericInput } from "./utils";

describe("numeric input helpers", () => {
  it("adds thousands separators while preserving decimals", () => {
    expect(formatNumericInput("1234567.89")).toBe("1,234,567.89");
  });

  it("allows negative formatted values when requested", () => {
    expect(formatNumericInput("-1234567.89", { allowNegative: true })).toBe(
      "-1,234,567.89",
    );
  });

  it("keeps transient user input states intact", () => {
    expect(formatNumericInput("")).toBe("");
    expect(formatNumericInput("1234.")).toBe("1,234.");
    expect(formatNumericInput("-.", { allowNegative: true })).toBe("-.");
  });

  it("parses formatted numbers back to numeric values", () => {
    expect(parseNumericInput("1,234,567.89")).toBe(1234567.89);
    expect(parseNumericInput("-1,234",)).toBe(-1234);
  });
});
