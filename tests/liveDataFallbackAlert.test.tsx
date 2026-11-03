import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveDataFallbackAlert } from "../app/components/liveDataFallbackAlert";
import { describeSavedCopyBanner, resolveDataStatusGuidance } from "../lib/report/trustStatus";

describe("live data fallback alert", () => {
  const now = new Date("2026-03-10T21:00:00Z");
  const html = renderToStaticMarkup(
    <LiveDataFallbackAlert lastCachedTimestamp="2026-03-10T20:00:00Z" effectiveRecordDate="2026-03-07" now={now} />
  );

  it("opens on the same saved-copy sentence the homepage banner prints, with the hold", () => {
    const headline = describeSavedCopyBanner({ recordDate: "2026-03-07", now, guidanceHeld: false });
    assert.ok(html.includes(headline.replace(/'/g, "&#x27;")));
    assert.match(headline, /^Live data is late, so this is the Mar 7, 2026 reading, 3 days old\. Keep your current plan;/);
  });

  it("falls back to the undated sentence when the record date is unknown", () => {
    const undated = renderToStaticMarkup(<LiveDataFallbackAlert lastCachedTimestamp="2026-03-10T20:00:00Z" />);
    assert.ok(undated.includes(resolveDataStatusGuidance({ isFallbackSnapshot: true }).replace(/'/g, "&#x27;")));
  });

  it("prints readable dates and points at the source board", () => {
    assert.match(html, /Last checked Mar 10, 2026, 8:00 PM UTC\./);
    assert.doesNotMatch(html, /Rates are as of/, "the headline names the reading's date");
    assert.match(html, /href="\/trust#source-board"/);
  });

  it("prints no feed URL or raw ISO timestamp", () => {
    assert.doesNotMatch(html, /https?:\/\//);
    assert.doesNotMatch(html, /\d{4}-\d{2}-\d{2}T/);
  });

  it("draws as a caveat, not in the crossed-line red the amber and rose ramps resolve to", () => {
    assert.match(html, /weather-caveat-mark/);
    assert.match(html, /weather-caveat-band/);
    assert.doesNotMatch(html, /\b(?:amber|rose)-\d/);
  });
});
