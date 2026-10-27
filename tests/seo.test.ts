import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { formatTitleMonth, serializeJsonLd, withUpdatedMarker } from "../lib/seo";

describe("JSON-LD serialization", () => {
  it("escapes script-breaking and HTML-sensitive characters", () => {
    const payload = {
      description: "</script><script>alert('xss')</script>",
      text: "A & B > C",
      separators: "\u2028\u2029",
    };

    const serialized = serializeJsonLd(payload);

    assert.match(serialized, /\\u003c\/script\\u003e\\u003cscript\\u003ealert\('xss'\)\\u003c\/script\\u003e/);
    assert.ok(!serialized.includes("</script>"));
    assert.ok(serialized.includes("\\u0026"));
    assert.ok(serialized.includes("\\u003e"));
    assert.ok(serialized.includes("\\u2028"));
    assert.ok(serialized.includes("\\u2029"));
  });
});

/*
 * A month in a title is a claim about the data on the page. These take the
 * data's date or nothing: a title with no date says what the page is, and a
 * title with a wrong one tells a searcher the page is fresher than it is.
 */
describe("title freshness markers", () => {
  it("names the month of the date it is given, in UTC", () => {
    assert.equal(formatTitleMonth("2026-10-06"), "October 2026");
    assert.equal(formatTitleMonth("2027-01-31T23:30:00.000Z"), "January 2027");
    assert.equal(withUpdatedMarker("How much runway should a startup have?", "2026-09-22"), "How much runway should a startup have? (updated Sep 2026)");
  });

  it("leaves the title undated when there is no date to name", () => {
    assert.equal(formatTitleMonth(undefined), null);
    assert.equal(formatTitleMonth("not a date"), null);
    assert.equal(withUpdatedMarker("Should we freeze hiring this week?", null), "Should we freeze hiring this week?");
    assert.equal(withUpdatedMarker("Should we freeze hiring this week?", "Unavailable"), "Should we freeze hiring this week?");
  });
});
