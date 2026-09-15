import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

/*
 * /search answered every request with a 308: to the toolkit library on an empty
 * query, and otherwise to whichever hub the top match belonged to. A reader
 * never saw what matched or whether anything had, and the intent behind the
 * search left no trace anywhere.
 */
describe("/search", () => {
  const source = readFileSync(new URL("../app/search/page.tsx", import.meta.url), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("renders results instead of redirecting", () => {
    assert.ok(!code.includes("permanentRedirect"), "no redirect remains in the route");
    assert.match(code, /<PageShell/);
  });

  /*
   * Recorded from the browser, not from this render. A render is not an action:
   * a prefetch, a retry after an error boundary, or a crawler following the
   * page each add a row to the zero-result rate the stream exists to measure.
   */
  it("records the shape of a search from the client, not during the render", () => {
    assert.ok(!code.includes("writeAnalytics"), "the route writes no telemetry while rendering");
    assert.match(code, /<SearchTelemetry/);

    const emitter = readFileSync(new URL("../lib/searchTelemetry.ts", import.meta.url), "utf8");
    const emitterCode = emitter.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const payload = emitterCode.slice(
      emitterCode.indexOf("type SearchTelemetryEvent"),
      emitterCode.indexOf("export const isSearchTelemetryEvent"),
    );
    assert.ok(payload.length > 0);
    assert.ok(!/query/i.test(payload), "the event type has no field that could hold the query");
    assert.match(emitter, /zeroResults/);
  });

  it("refuses a payload carrying any key beyond the four it promises to hold", async () => {
    const { isSearchTelemetryEvent } = await import("../lib/searchTelemetry");
    const valid = { type: "search", routedJob: "check", resultCount: 3, filtered: false, zeroResults: false };

    assert.ok(isSearchTelemetryEvent(valid));
    assert.ok(!isSearchTelemetryEvent({ ...valid, query: "should we hire" }));
    assert.ok(!isSearchTelemetryEvent({ ...valid, resultCount: -1 }));
    assert.ok(!isSearchTelemetryEvent({ ...valid, type: "other" }));
  });

  it("keeps the redirect target as an offered action rather than a forced one", () => {
    assert.match(code, /resolveSearchCommandHref/);
    assert.match(code, /Go straight there/);
  });

  it("stays out of the index", () => {
    assert.match(code, /metadata\.robots = noindexRobots/);
  });
});
