import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { MonthlyReport } from "@money-insight/ui/types";
import { MonthlyReportSection } from "./MonthlyReportSection";

const report: MonthlyReport = {
  yearMonth: "2026-08",
  year: 2026,
  month: 8,
  daysInMonth: 31,
  dailySpending: [],
  totalExpense: 300,
  totalIncome: 500,
  currentDayExpense: 150,
  previousThreeMonthAverage: 100,
  previousThreeMonthDailyPattern: [
    {
      dayOfMonth: 9,
      displayDate: "08/09",
      averageExpense: 100,
      averageCumulativeExpense: 100,
    },
  ],
};

describe("MonthlyReportSection", () => {
  it("does not render the spending comparison percentage when values are hidden", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <MonthlyReportSection report={report} valuesHidden />
      </MemoryRouter>,
    );

    expect(markup).not.toContain("50.0% vs avg");
    expect(markup).toContain("•••• vs avg");
  });
});
