import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildBriefPermalinkUrl } from "../lib/export/briefPermalink";
import { buildPublishedBriefPath, latestPublishedBrief } from "../lib/report/publishedBriefs";

const shiftDays = (isoDate: string, days: number) =>
  new Date(Date.parse(isoDate) + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe("shared brief permalink", () => {
  it("points a shared artifact at the frozen week it describes", () => {
    const url = buildBriefPermalinkUrl(latestPublishedBrief.recordDate);
    assert.ok(url.endsWith(buildPublishedBriefPath(latestPublishedBrief.slug)), url);
  });

  it("falls back to the live brief once the archive is behind", () => {
    // Never a dated citation pointing at "/", which is a different brief each
    // week — the fallback drops the week, it does not misattribute it.
    const url = buildBriefPermalinkUrl(shiftDays(latestPublishedBrief.recordDate, 90));
    assert.ok(url.endsWith("/"), url);
    assert.ok(!url.includes("/brief/"), url);
  });

  it("carries no campaign or per-share parameters", () => {
    // The product advertises no trackers; a decorated share link would trade
    // that claim for a better funnel report.
    for (const recordDate of [latestPublishedBrief.recordDate, shiftDays(latestPublishedBrief.recordDate, 90)]) {
      const url = new URL(buildBriefPermalinkUrl(recordDate));
      assert.equal(url.search, "");
      assert.equal(url.hash, "");
    }
  });
});
