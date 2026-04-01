import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SourceHealthPanel } from "../app/sources/components/sourceHealthPanel";

describe("SourceHealthPanel", () => {
  it("renders degraded fallback rows with stale freshness in one scan", () => {
    const html = renderToStaticMarkup(
      <SourceHealthPanel
        rows={[
          {
            sourceName: "Treasury",
            cadenceLabel: "Intraday rates",
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
    assert.match(html, /Intraday rates/);
    assert.match(html, /Fallback/);
    assert.match(html, /Stale · Intraday rates/);
    assert.match(html, /Upstream treasury timeout\./);
  });

  it("distinguishes snapshot-backed freshness from degraded fallback rows", () => {
    const html = renderToStaticMarkup(
      <SourceHealthPanel
        rows={[
          {
            sourceName: "Startup/private markets",
            cadenceLabel: "Curated snapshot",
            freshnessStatus: "fresh",
            freshnessSlaHours: 1080,
            lastSuccessfulFetchAt: "2026-02-02T00:00:00.000Z",
            activeFallbackReason: null,
            mode: "snapshot",
          },
        ]}
      />,
    );

    assert.match(html, /Startup\/private markets/);
    assert.match(html, /Snapshot-backed/);
    assert.match(html, /Current · Curated snapshot/);
    assert.match(html, /<td class="px-2 py-2 text-slate-300">—<\/td>/);
  });
});
