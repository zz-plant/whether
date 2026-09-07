import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { Toast } from "@base-ui/react/toast";
import { renderToStaticMarkup } from "react-dom/server";
import { MonthlySummaryCard } from "../app/components/monthlySummaryCard";
import { evaluateRegime } from "../lib/regimeEngine";
import { buildMonthlySummary } from "../lib/summary/monthlySummary";

/**
 * Replaces tests/cadenceSummaryCardAdapter.test.tsx.
 *
 * That file rendered a generic adapter across weekly, monthly, quarterly and
 * yearly, which made it the only thing keeping three of those cadences alive —
 * the product renders monthly and nothing else. The monthly assertions it
 * carried (section order, the API link, the raw copy block) are the ones with a
 * surface behind them, so they move here.
 */

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

const renderCard = () => {
  const summary = buildMonthlySummary({ assessment, provenance, recordDateLabel: "Feb 14, 2026" });
  return renderToStaticMarkup(
    <Toast.Provider>
      <MonthlySummaryCard summary={summary} />
    </Toast.Provider>,
  );
};

describe("MonthlySummaryCard", () => {
  it("keeps structured section order and labels stable", () => {
    const html = renderCard();

    // Posture first, then what to do, then what would reverse it.
    const titles = [
      "Monthly posture",
      "Planning language",
      "Bounded next actions",
      "Top reversals",
      "Execution constraints",
      "Source",
    ];

    let previousIndex = -1;
    for (const title of titles) {
      const index = html.indexOf(title);
      assert.ok(index > previousIndex, `Expected "${title}" to appear in order.`);
      previousIndex = index;
    }
  });

  it("links the monthly API and exposes the raw copy block", () => {
    const html = renderCard();
    assert.match(html, /href="\/api\/monthly"/);
    assert.match(html, /Raw summary text/);
  });

  it("carries the provenance the card claims", () => {
    const html = renderCard();
    assert.match(html, /Source:/);
    assert.match(html, /Timestamp:/);
    assert.match(html, /Data age:/);
  });
});
