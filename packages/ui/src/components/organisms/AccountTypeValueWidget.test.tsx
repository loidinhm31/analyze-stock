import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AccountTypeValueHistory } from "@money-insight/ui/services/account-type-value-history";
import { AccountTypeValueWidget } from "./AccountTypeValueWidget";

const history: AccountTypeValueHistory = {
  currency: "USD",
  currentBalance: 1234.5,
  monthEndBalances: [
    { monthEnd: "2026-06-30", value: 1200 },
    { monthEnd: "2026-07-31", value: 1234.5 },
  ],
  trailingMetric: { label: "3-month average", value: 1217.25 },
};

const baseProps = {
  selectedAccountTypes: ["cash"] as const,
  histories: [history],
  isLoading: false,
  error: null,
  onSaveSelection: async () => undefined,
  onRetry: async () => undefined,
};

describe("AccountTypeValueWidget", () => {
  it("renders per-currency values and an accessible configuration trigger", () => {
    const markup = renderToStaticMarkup(
      <AccountTypeValueWidget {...baseProps} valuesHidden={false} />,
    );

    expect(markup).toContain("Account value");
    expect(markup).toContain("USD");
    expect(markup).toContain("$1,234.50");
    expect(markup).toContain('aria-label="Configure account value widget"');
  });

  it("does not render raw balance values or a value-bearing chart when hidden", () => {
    const markup = renderToStaticMarkup(
      <AccountTypeValueWidget {...baseProps} valuesHidden />,
    );

    expect(markup).toContain("••••");
    expect(markup).toContain("12-month chart hidden");
    expect(markup).not.toContain("1,234.50");
    expect(markup).not.toContain("1,217.25");
  });

  it("renders a useful unconfigured state", () => {
    const markup = renderToStaticMarkup(
      <AccountTypeValueWidget
        {...baseProps}
        histories={[]}
        selectedAccountTypes={null}
        valuesHidden={false}
      />,
    );

    expect(markup).toContain("No account types selected");
    expect(markup).toContain("Configure this widget");
  });
});
