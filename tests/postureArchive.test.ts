import assert from "node:assert/strict";
import { describe, it } from "bun:test";
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
});
