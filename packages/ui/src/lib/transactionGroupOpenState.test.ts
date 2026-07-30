import { describe, expect, it } from "vitest";
import {
  getInitialOpenGroupKeys,
  reconcileOpenGroupKeys,
} from "./transactionGroupOpenState";

describe("transaction group open state", () => {
  const groupKeys = ["2026-07-30", "2026-07-29"];

  it("opens every day group initially", () => {
    expect(getInitialOpenGroupKeys(groupKeys, "day")).toEqual(groupKeys);
  });

  it("opens only the newest group in non-day modes", () => {
    expect(getInitialOpenGroupKeys(groupKeys, "month")).toEqual(["2026-07-30"]);
  });

  it("opens all visible groups when entering day mode", () => {
    expect(
      reconcileOpenGroupKeys(["2026-07-30"], groupKeys, "month", "day"),
    ).toEqual(groupKeys);
  });

  it("preserves an explicitly collapsed day group during a refresh", () => {
    expect(
      reconcileOpenGroupKeys(["2026-07-30"], groupKeys, "day", "day"),
    ).toEqual(["2026-07-30"]);
  });

  it("falls back to the newest non-day group when open groups are removed", () => {
    expect(
      reconcileOpenGroupKeys(["removed"], groupKeys, "month", "month"),
    ).toEqual(["2026-07-30"]);
  });
});
