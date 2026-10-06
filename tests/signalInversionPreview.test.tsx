import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SignalInversionPreview } from "../app/signals/components/signalInversionPreview";

describe("SignalInversionPreview", () => {
  it("renders the default inversion timeline summary for implication mode", () => {
    const html = renderToStaticMarkup(
      <SignalInversionPreview
        yieldCurveSeries={[
          { year: 2025, month: 11, recordDate: "2025-11-07", spread10Y2Y: -0.35, spread2Y3M: -0.42 },
          { year: 2025, month: 12, recordDate: "2025-12-05", spread10Y2Y: -0.28, spread2Y3M: -0.36 },
          { year: 2026, month: 1, recordDate: "2026-01-09", spread10Y2Y: -0.18, spread2Y3M: -0.24 },
          { year: 2026, month: 2, recordDate: "2026-02-06", spread10Y2Y: -0.08, spread2Y3M: -0.14 },
          { year: 2026, month: 3, recordDate: "2026-03-06", spread10Y2Y: 0.02, spread2Y3M: -0.04 },
        ]}
      />,
    );

    assert.match(html, /Has the yield curve inverted in the last year\?/);
    assert.match(html, /aria-label="Inversion timeline: ten-year minus two-year spread and two-year minus three-month spread"/);
    // A closed disclosure in the evidence page's instruments list, titled with its question.
    assert.match(html, /<details id="curve-context"(?![^>]*\sopen)/);
    assert.match(html, /Nov 2025/);
    assert.match(html, /Mar 2026/);
    assert.match(html, /zero line/);
  });
});
