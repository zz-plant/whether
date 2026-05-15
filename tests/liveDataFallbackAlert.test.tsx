import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveDataFallbackAlert } from "../app/components/liveDataFallbackAlert";

describe("live data fallback alert", () => {
  it("renders source, effective date, and fallback reason when provided", () => {
    const html = renderToStaticMarkup(
      <LiveDataFallbackAlert
        lastCachedTimestamp="2026-03-10T00:00:00Z"
        sourceLabel="https://api.fiscaldata.treasury.gov"
        effectiveRecordDate="2026-03-07"
        fallbackReason="FRED Treasury fetch error: 500"
      />
    );

    assert.match(html, /Source: https:\/\/api\.fiscaldata\.treasury\.gov\./);
    assert.match(html, /Effective: 2026-03-07\./);
    assert.match(html, /Reason: FRED Treasury fetch error: 500/);
  });
});
