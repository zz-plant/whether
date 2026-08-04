import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildPublishedBriefPath,
  buildPublishedBriefSlug,
  findAdjacentPublishedBriefs,
  findPublishedBrief,
  getPublishedBriefs,
  isPublishedBriefSlug,
  latestPublishedBrief,
  parsePublishedBriefs,
  publishedBriefStaticParams,
} from "../lib/report/publishedBriefs";
import { formatIsoWeekSlug, getIsoWeekInfo, parseIsoWeekSlug } from "../lib/isoWeek";

describe("iso week slugs", () => {
  it("round-trips a slug through parse and format", () => {
    const week = parseIsoWeekSlug("2026-w31");
    assert.deepEqual(week, { year: 2026, week: 31 });
    assert.equal(formatIsoWeekSlug(week!), "2026-w31");
  });

  it("zero-pads single digit weeks so slugs sort lexically", () => {
    assert.equal(formatIsoWeekSlug({ year: 2026, week: 7 }), "2026-w07");
  });

  it("rejects malformed and out-of-range slugs", () => {
    for (const slug of ["2026-w0", "2026-w54", "2026-31", "w31", "abcd-w31"]) {
      assert.equal(parseIsoWeekSlug(slug), null, `expected ${slug} to be rejected`);
    }
  });

  it("assigns a Thursday-anchored ISO week", () => {
    // 2026-01-01 is a Thursday, so it belongs to ISO week 1 of 2026.
    assert.deepEqual(getIsoWeekInfo(new Date("2026-01-01T00:00:00Z")), { year: 2026, week: 1 });
  });
});

describe("published briefs", () => {
  const briefs = getPublishedBriefs();

  it("loads at least the current week", () => {
    assert.ok(briefs.length > 0, "no published briefs — run `bun run brief:freeze`");
    assert.equal(briefs.length, publishedBriefStaticParams.length);
  });

  it("returns an empty list rather than throwing on malformed input", () => {
    assert.deepEqual(parsePublishedBriefs([{ slug: "2026-w31" }]), []);
  });

  it("keeps slugs unique and well formed", () => {
    const slugs = new Set(briefs.map((brief) => brief.slug));
    assert.equal(slugs.size, briefs.length);

    for (const brief of briefs) {
      assert.ok(parseIsoWeekSlug(brief.slug), `${brief.slug} is not an ISO week slug`);
      assert.equal(brief.slug, buildPublishedBriefSlug(brief.year, brief.week));
    }
  });

  it("carries a parseable publication date for every record", () => {
    for (const brief of briefs) {
      assert.ok(!Number.isNaN(new Date(brief.publishedAt).valueOf()), `${brief.slug} has an unparseable date`);
    }
  });

  it("orders newest first and exposes the newest as the canonical week", () => {
    const sorted = [...briefs].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    assert.deepEqual(
      briefs.map((brief) => brief.slug),
      sorted.map((brief) => brief.slug),
    );
    assert.equal(latestPublishedBrief.slug, briefs[0].slug);
  });

  it("resolves known slugs and rejects unknown ones", () => {
    assert.ok(isPublishedBriefSlug(briefs[0].slug));
    assert.equal(findPublishedBrief(briefs[0].slug)?.slug, briefs[0].slug);
    assert.equal(isPublishedBriefSlug("1999-w01"), false);
    assert.equal(findPublishedBrief("1999-w01"), undefined);
  });

  it("builds brief paths under /brief", () => {
    assert.equal(buildPublishedBriefPath("2026-w31"), "/brief/2026-w31");
  });

  it("walks adjacent weeks in reading order, oldest first", () => {
    const chronological = [...briefs].reverse();

    chronological.forEach((brief, index) => {
      const { previous, next } = findAdjacentPublishedBriefs(brief.slug);
      assert.equal(previous?.slug, chronological[index - 1]?.slug);
      assert.equal(next?.slug, chronological[index + 1]?.slug);
    });

    const oldest = chronological[0];
    const newest = chronological[chronological.length - 1];
    assert.equal(findAdjacentPublishedBriefs(oldest.slug).previous, undefined);
    assert.equal(findAdjacentPublishedBriefs(newest.slug).next, undefined);
  });

  it("returns no neighbours for an unknown week rather than the ends of the list", () => {
    assert.deepEqual(findAdjacentPublishedBriefs("1999-w01"), { previous: undefined, next: undefined });
  });
});
