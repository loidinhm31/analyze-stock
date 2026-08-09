import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SpendingBottleneck } from "@money-insight/ui/types";
import { BottleneckAlerts } from "./BottleneckAlerts";

const bottleneck: SpendingBottleneck = {
  type: "high_amount",
  category: "Dining",
  severity: "high",
  amount: 1234.5,
  percentage: 23.4,
  suggestion:
    "Dining represents 23.4% of your spending. Small purchases add up to $1,234.50.",
  transactions: [],
};

describe("BottleneckAlerts", () => {
  it("does not render value-bearing suggestions when values are hidden", () => {
    const markup = renderToStaticMarkup(
      <BottleneckAlerts bottlenecks={[bottleneck]} valuesHidden />,
    );

    expect(markup).not.toContain("23.4%");
    expect(markup).not.toContain("$1,234.50");
    expect(markup).toContain("Suggestion hidden while values are protected.");
  });
});
