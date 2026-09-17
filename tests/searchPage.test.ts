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
    /* The emitter moved into the results component when search became instant,
       because what it records has to be a query the reader stopped changing. */
    const results = readFileSync(new URL("../app/search/searchResults.tsx", import.meta.url), "utf8");
    assert.match(results, /<SearchTelemetry/);

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

  /* The routing heuristic and the results list both moved when search became
     instant: the page renders a client component, which Next still renders into
     the initial HTML. Reading the files that hold them now, rather than the one
     that used to. */
  it("keeps the redirect target as an offered action rather than a forced one", () => {
    const results = readFileSync(new URL("../app/search/searchResults.tsx", import.meta.url), "utf8");
    assert.match(results, /resolveSearchCommandHref/);
    assert.match(results, /Go straight there/);
  });

  /*
   * The form keeps its `action` and its submit button, so a browser with no
   * JavaScript still gets the GET form the page always was — and the page still
   * renders `?q=` on the server. Typing is the improvement, not the mechanism.
   */
  it("still works as a plain GET form", () => {
    const results = readFileSync(new URL("../app/search/searchResults.tsx", import.meta.url), "utf8");
    assert.match(results, /action="\/search"/);
    assert.match(results, /type="submit"/);
    assert.match(code, /initialQuery=\{query\}/, "the server still resolves the query it was given");
  });

  /*
   * The trap instant search sets for this stream. It measures a zero-result
   * *rate*, and every prefix of every word is a zero-result, so recording per
   * keystroke would make "hirin" count as someone failing to find anything and
   * the denominator meaningless.
   */
  it("records a settled query rather than a keystroke", () => {
    const results = readFileSync(new URL("../app/search/searchResults.tsx", import.meta.url), "utf8");
    assert.match(results, /<SearchTelemetry\s+query=\{settledQuery\}/);
    assert.match(results, /setTimeout\(\(\) => setSettledQuery/);
    assert.doesNotMatch(results, /<SearchTelemetry\s+query=\{query\}/);
  });

  /* A history entry per keystroke turns the back button into a rubout key, and
     a search nobody can send anyone is not a result. */
  it("keeps the URL as the result, without a history entry per keystroke", () => {
    const results = readFileSync(new URL("../app/search/searchResults.tsx", import.meta.url), "utf8");
    assert.match(results, /router\.replace\(/);
    assert.doesNotMatch(results, /router\.push\(/);
  });

  it("stays out of the index", () => {
    assert.match(code, /metadata\.robots = noindexRobots/);
  });
});
