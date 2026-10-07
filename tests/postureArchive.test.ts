import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildPostureArchivePath,
  findPostureArchivePeriod,
  getPostureArchivePeriods,
  isPostureArchiveSlug,
  parsePostureArchiveIndex,
  postureArchiveStaticParams,
  postureArchiveYears,
} from "../lib/summary/postureArchive";
import { isIndexableArchivePeriodSlug } from "../lib/seo/indexationPolicy";

describe("posture archive index", () => {
  const periods = getPostureArchivePeriods();

  it("loads a non-empty generated index", () => {
    assert.ok(periods.length > 0, "archive index is empty — run `bun run archive:index`");
    assert.equal(periods.length, postureArchiveStaticParams.length);
  });

  it("returns an empty list rather than throwing on malformed input", () => {
    assert.deepEqual(parsePostureArchiveIndex([{ slug: "2022" }]), []);
  });

  it("keeps every slug unique so routes cannot collide", () => {
    const slugs = new Set(periods.map((period) => period.slug));
    assert.equal(slugs.size, periods.length);
  });

  it("uses year and quarter slug shapes that match their kind", () => {
    for (const period of periods) {
      if (period.kind === "year") {
        assert.match(period.slug, /^\d{4}$/);
      } else {
        assert.match(period.slug, /^\d{4}-q[1-4]$/);
      }
    }
  });

  it("never points a quarter at a parent year page that does not exist", () => {
    for (const period of periods) {
      if (!period.parentSlug) continue;
      assert.ok(
        isPostureArchiveSlug(period.parentSlug),
        `${period.slug} references missing parent ${period.parentSlug}`,
      );
    }
  });

  it("links siblings symmetrically within each kind", () => {
    for (const period of periods) {
      if (!period.nextSlug) continue;
      const next = findPostureArchivePeriod(period.nextSlug);
      assert.ok(next, `${period.slug} references missing next ${period.nextSlug}`);
      assert.equal(next?.previousSlug, period.slug);
      assert.equal(next?.kind, period.kind);
    }
  });

  it("keeps derived regime shares consistent with the sample count", () => {
    for (const period of periods) {
      if (!period.regimeMix.length) continue;
      const counted = period.regimeMix.reduce((total, share) => total + share.periods, 0);
      assert.equal(counted, period.sampleCount, `${period.slug} regime mix does not cover its samples`);
      assert.ok(period.sampleCadence, `${period.slug} has a regime mix but no sample cadence`);
    }
  });

  it("records a transition only where the posture actually changed", () => {
    for (const period of periods) {
      for (const transition of period.transitions) {
        assert.notEqual(transition.from, transition.to);
      }
    }
  });

  it("exposes every year page as an archive entry point", () => {
    assert.ok(postureArchiveYears.length > 0);
    for (const year of postureArchiveYears) {
      assert.ok(isPostureArchiveSlug(year.slug), `year ${year.slug} is missing from the period index`);
    }
  });

  it("treats all archive periods as indexable because they are closed records", () => {
    for (const period of periods) {
      assert.ok(isIndexableArchivePeriodSlug(period.slug));
    }
    assert.equal(isIndexableArchivePeriodSlug("2099-q9"), false);
  });

  it("builds archive paths under the history hub", () => {
    assert.equal(buildPostureArchivePath("2022-q2"), "/history/2022-q2");
  });

  /* The quarterly and yearly entries reach back to 2010; the record starts at the
     first month-end, Jan 31, 2012. The ten earlier periods had no readings behind
     them and were listed beside "Record starts Jan 31, 2012" as closed years. */
  it("starts where the record starts, with readings behind every period", () => {
    for (const period of periods) {
      assert.ok(period.asOf >= "2012-01-31", `${period.slug} closes before the record starts`);
      assert.ok(period.sampleCount > 0 && period.regimeMix.length > 0, `${period.slug} has no readings behind it`);
    }
    assert.equal(isPostureArchiveSlug("2011"), false);
    assert.equal(isPostureArchiveSlug("2010-q4"), false);
    assert.ok(!postureArchiveYears.some((year) => Number(year.slug) < 2012));
  });

  /* /history/2022-q3 was headlined Stormy, with Stormy's guidance, over 9 Freezing
     weeks of 14; /history/2018 was Stormy over 48 Sunny weeks of 52. */
  it("headlines each period with the conditions most of its readings held, and words for those conditions", () => {
    for (const period of periods) {
      const most = Math.max(...period.regimeMix.map((share) => share.periods));
      const held = period.regimeMix.find((share) => share.regime === period.regime);
      assert.equal(held?.periods, most, `${period.slug} is headlined ${period.operatorLabel}, which held ${held?.periods ?? 0} of ${period.sampleCount}`);
      assert.ok(period.headline.startsWith(`${period.operatorLabel} mode.`), `${period.slug}: "${period.headline}" is about other conditions`);
    }
    assert.equal(findPostureArchivePeriod("2022-q3")?.operatorLabel, "Freezing");
    assert.equal(findPostureArchivePeriod("2018")?.operatorLabel, "Sunny");
    /* A tie goes to the conditions in force at the close: 2022 split 22 Stormy, 22 Freezing. */
    assert.equal(findPostureArchivePeriod("2022")?.operatorLabel, "Freezing");
  });

  it("lists each year's quarters under the conditions their own pages lead with", () => {
    for (const year of periods.filter((period) => period.kind === "year")) {
      for (const child of year.children) {
        assert.equal(child.operatorLabel, findPostureArchivePeriod(child.slug)?.operatorLabel, `${year.slug} lists ${child.slug} differently`);
      }
    }
  });
});

describe("/history/[period] says what its own split says", () => {
  const render = async (period: string) => {
    const page = await import("../app/history/[period]/page");
    return renderToStaticMarkup(await page.default({ params: Promise.resolve({ period }) }));
  };

  it("leads a split period with the conditions most readings held and how it closed", async () => {
    const html = await render("2018");
    assert.match(html, />Mostly Sunny</);
    assert.match(html, /Sunny for 48 of 52 weekly readings; Stormy at the close\./);
    assert.doesNotMatch(html, /keep the plan flexible/, "Stormy's guidance for a year that was mostly Sunny");
    assert.doesNotMatch(html, /for the whole period/);
    /* A tie is not "mostly": 2022 split 22 Stormy, 22 Freezing. */
    const tied = await render("2022");
    assert.doesNotMatch(tied, /Mostly/);
    assert.match(tied, /Freezing for 22 of 52 weekly readings, tied with Stormy\./);
  });

  it("says conditions held for the whole period only where every reading did", async () => {
    assert.match(await render("2024"), /Conditions held at Freezing for the whole period\./);
    assert.doesNotMatch(await render("2022-q3"), /for the whole period/);
  });
});
