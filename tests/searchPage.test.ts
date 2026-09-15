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

  it("records the shape of a search and not the text typed", () => {
    assert.match(code, /writeAnalytics\(\s*"search"/);
    const recordBody = code.slice(code.indexOf("const recordSearch"), code.indexOf("const SearchForm"));
    assert.ok(!/\bquery\b/.test(recordBody), "the recorded event does not carry the query text");
    assert.match(recordBody, /zeroResults/);
  });

  it("keeps the redirect target as an offered action rather than a forced one", () => {
    assert.match(code, /resolveSearchCommandHref/);
    assert.match(code, /Go straight there/);
  });

  it("stays out of the index", () => {
    assert.match(code, /metadata\.robots = noindexRobots/);
  });
});
