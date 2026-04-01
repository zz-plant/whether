import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HistorySection } from "../app/components/weekly-card/HistorySection";

describe("HistorySection", () => {
  it("renders current checkpoint and shift badges", () => {
    const html = renderToStaticMarkup(
      <HistorySection
        historicalTimeline={[
          { label: "Jan 2026", posture: "Defensive", month: 1, year: 2026 },
          { label: "Feb 2026", posture: "Mixed", month: 2, year: 2026, isCurrent: true },
        ]}
      />,
    );

    assert.match(html, /Regime history/);
    assert.match(html, /Changed/);
    assert.match(html, /Current/);
    assert.match(html, /\/?month=2&amp;year=2026/);
  });
});
