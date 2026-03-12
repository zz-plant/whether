import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SourceHealthPanel } from "../app/sources/components/sourceHealthPanel";

describe("SourceHealthPanel", () => {
  it("renders degraded fallback rows with stale freshness in one scan", () => {
    const html = renderToStaticMarkup(
      <SourceHealthPanel
        rows={[
          {
            sourceName: "Treasury",
            freshnessStatus: "stale",
            freshnessSlaHours: 6,
            lastSuccessfulFetchAt: "2026-01-01T01:00:00.000Z",
            activeFallbackReason: "Upstream treasury timeout.",
            mode: "fallback",
          },
        ]}
      />,
    );

    assert.match(html, /Source health/);
    assert.match(html, /Treasury/);
    assert.match(html, /Fallback/);
    assert.match(html, /Stale \(SLA 6h\)/);
    assert.match(html, /Upstream treasury timeout\./);
  });

  it("distinguishes unknown freshness from stale freshness", () => {
    const html = renderToStaticMarkup(
      <SourceHealthPanel
        rows={[
          {
            sourceName: "Macro",
            freshnessStatus: "unknown",
            freshnessSlaHours: 24,
            lastSuccessfulFetchAt: null,
            activeFallbackReason: "Macro series unavailable; running with fallback snapshot.",
            mode: "fallback",
          },
        ]}
      />,
    );

    assert.match(html, /Macro/);
    assert.match(html, /Unknown \(SLA 24h\)/);
    assert.doesNotMatch(html, /Stale \(SLA 24h\)/);
    assert.match(html, />Unknown<|Unknown \(/);
  });
});
