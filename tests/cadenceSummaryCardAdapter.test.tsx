import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Toast } from "@base-ui/react/toast";
import { renderToStaticMarkup } from "react-dom/server";
import { CadenceSummaryCardAdapter } from "../app/components/cadenceSummaryCardAdapter";
import { evaluateRegime } from "../lib/regimeEngine";
import { buildMonthlySummary } from "../lib/summary/monthlySummary";
import { buildQuarterlySummary } from "../lib/summary/quarterlySummary";
import { buildWeeklySummary } from "../lib/summary/weeklySummary";
import { buildYearlySummary } from "../lib/summary/yearlySummary";

const assessment = evaluateRegime({
  source: "https://example.com/treasury",
  record_date: "2026-02-14",
  fetched_at: "2026-02-14T09:00:00.000Z",
  isLive: true,
  yields: {
    oneMonth: 5.2,
    twoYear: 4.8,
    tenYear: 4.5,
  },
});

const provenance = {
  sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
  sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
  timestampLabel: "Feb 14, 2026, 09:00 AM",
  ageLabel: "2h",
  statusLabel: "Live",
};

describe("CadenceSummaryCardAdapter", () => {
  it("keeps weekly structured section order and labels stable", () => {
    const summary = buildWeeklySummary({
      assessment,
      provenance,
      recordDateLabel: "Feb 14, 2026",
    });

    const html = renderToStaticMarkup(
      <Toast.Provider>
        <CadenceSummaryCardAdapter cadence="weekly" summary={summary} />
      </Toast.Provider>,
    );

    const titles = [
      "Capital posture",
      "Recommended moves",
      "Execution priorities",
      "Watchouts",
      "Execution constraints",
    ];

    let previousIndex = -1;
    for (const title of titles) {
      const index = html.indexOf(title);
      assert.ok(index > previousIndex, `Expected \"${title}\" to appear in order.`);
      previousIndex = index;
    }

    assert.match(html, /href="\/api\/weekly"/);
    assert.match(html, /href="\/operations\/data#weekly-api"/);
    assert.match(html, /Raw summary text/);
  });

  it("keeps monthly structured section order and labels stable", () => {
    const summary = buildMonthlySummary({
      assessment,
      provenance,
      recordDateLabel: "Feb 14, 2026",
    });

    const html = renderToStaticMarkup(
      <Toast.Provider>
        <CadenceSummaryCardAdapter cadence="monthly" summary={summary} />
      </Toast.Provider>,
    );

    const executionConstraintsIndex = html.indexOf("Execution constraints");
    const provenanceIndex = html.indexOf("Provenance");

    assert.ok(executionConstraintsIndex >= 0);
    assert.ok(provenanceIndex > executionConstraintsIndex);
    assert.match(html, /href="\/api\/monthly"/);
    assert.match(html, /Raw summary text/);
  });

  it("renders compact card for quarterly and yearly cadences", () => {
    const quarterlySummary = buildQuarterlySummary({
      assessment,
      provenance,
      recordDateLabel: "Feb 14, 2026",
      periodLabel: "Q1 2026",
    });
    const yearlySummary = buildYearlySummary({
      assessment,
      provenance,
      periodLabel: "2026",
    });

    const quarterlyHtml = renderToStaticMarkup(
      <Toast.Provider>
        <CadenceSummaryCardAdapter cadence="quarterly" summary={quarterlySummary} />
      </Toast.Provider>,
    );
    const yearlyHtml = renderToStaticMarkup(
      <Toast.Provider>
        <CadenceSummaryCardAdapter cadence="yearly" summary={yearlySummary} />
      </Toast.Provider>,
    );

    assert.match(quarterlyHtml, /href="\/api\/quarterly"/);
    assert.match(yearlyHtml, /href="\/api\/yearly"/);
    assert.doesNotMatch(quarterlyHtml, /Structured data/);
    assert.doesNotMatch(yearlyHtml, /Structured data/);
    assert.match(quarterlyHtml, /aria-label="Summary card text"/);
    assert.match(yearlyHtml, /aria-label="Summary card text"/);
  });
});
