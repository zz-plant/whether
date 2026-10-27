import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveDataFallbackAlert } from "../app/components/liveDataFallbackAlert";
import { resolveDataStatusGuidance } from "../lib/report/trustStatus";

describe("live data fallback alert", () => {
  const html = renderToStaticMarkup(
    <LiveDataFallbackAlert lastCachedTimestamp="2026-03-10T20:00:00Z" effectiveRecordDate="2026-03-07" />
  );

  it("opens on the same data-status sentence the homepage banner prints", () => {
    assert.ok(html.includes(resolveDataStatusGuidance({ isFallbackSnapshot: true }).replace(/'/g, "&#x27;")));
  });

  it("prints readable dates and points at the source board", () => {
    assert.match(html, /Last checked Mar 10, 2026, 8:00 PM UTC\./);
    assert.match(html, /Rates are as of Mar 7, 2026\./);
    assert.match(html, /href="\/trust#source-board"/);
  });

  it("prints no feed URL or raw ISO timestamp", () => {
    assert.doesNotMatch(html, /https?:\/\//);
    assert.doesNotMatch(html, /\d{4}-\d{2}-\d{2}T/);
  });

  it("draws as a caveat, not in the crossed-line red the amber and rose ramps resolve to", () => {
    assert.match(html, /weather-caveat-mark/);
    assert.match(html, /border-caveat-border/);
    assert.doesNotMatch(html, /\b(?:amber|rose)-\d/);
  });
});
