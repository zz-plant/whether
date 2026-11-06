import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { findPublishedBrief, getPublishedBriefs, publishedBriefDisplay, publishedBriefModifiedAt } from "../lib/report/publishedBriefs";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import { buildActionNowShort } from "../lib/report/reportEvidence";

/*
 * The archive is append-only, so a record whose Do-now line was written for a
 * different state than its call cannot be edited back into agreement. It has to
 * say so. 2026-w31 was frozen as Sunny with the Cloudy "freeze new commitments"
 * line, before the builder keyed that line on the state; it sat in the hottest
 * band of the page every shared link lands on, uncorrected, until 2026-09-30.
 */

/* Early records used "Conditions tightening — freeze …"; the builder now writes two sentences. */
const normalize = (line: string) =>
  line.replace(/^Conditions (\w+) — (\w)/, (_, tone: string, first: string) => `Conditions are ${tone}. ${first.toUpperCase()}`);

const DIRECTIONS = ["improving", "deteriorating", "stable"] as const;

describe("published brief call agreement", () => {
  it("every record's Do-now line is one its own state can print, or the record carries a correction", () => {
    for (const brief of getPublishedBriefs()) {
      const allowed = DIRECTIONS.map((directionLabel) =>
        buildActionNowShort({ directionLabel, regimeChanged: false, regime: brief.regime }),
      );
      if (allowed.includes(normalize(brief.actionNow))) continue;
      assert.ok(brief.correction, `${brief.slug}: "${brief.actionNow}" is not a ${brief.regime} line and has no correction`);
    }
  });

  it("the w31 correction names the line it should have printed", () => {
    const w31 = getPublishedBriefs().find((brief) => brief.slug === "2026-w31");
    assert.ok(w31?.correction);
    const intended = buildActionNowShort({ directionLabel: "deteriorating", regimeChanged: false, regime: "EXPANSION" });
    assert.ok(w31.correction.includes(intended), w31.correction);
  });
});

/*
 * A feed shows the weeks in one scroll, so what a week says changed is read against the
 * brief above it. "What changed" compares with the reading the week was frozen against,
 * which need not be that brief: w41 said conditions had changed to Freezing beside a w40 that
 * already read Freezing, and w44 moved to Cloudy and never said so.
 */
describe("reading the published briefs in order", () => {
  const inOrder = [...getPublishedBriefs()].reverse();
  const pairs = inOrder.flatMap((brief, index) => {
    const last = index > 0 ? inOrder.at(index - 1) : undefined;
    return last ? [{ brief, last }] : [];
  });

  it("says every change of conditions between two briefs", () => {
    for (const { brief, last } of pairs) {
      if (last.regime === brief.regime) continue;
      const before = getRegimePublicLabel(last.regime);
      const said = [publishedBriefDisplay(brief).whatChanged, brief.correction ?? ""].join(" ");
      assert.ok(said.includes(`read ${before}`) || said.includes(`from ${before} to`), `${brief.slug} after ${last.slug}: ${said}`);
    }
  });

  it("never claims a change the last brief had already made, without saying so", () => {
    for (const { brief, last } of pairs) {
      const { whatChanged } = publishedBriefDisplay(brief);
      const conditions = getRegimePublicLabel(brief.regime);
      if (last.regime !== brief.regime || !whatChanged.includes(`to ${conditions}`) || brief.correction) continue;
      assert.ok(whatChanged.includes(`already read ${conditions}`), `${brief.slug} after ${last.slug}: ${whatChanged}`);
    }
  });

  it("says nothing extra where the briefs agree", () => {
    const w45 = findPublishedBrief("2026-w45");
    assert.ok(w45);
    assert.doesNotMatch(publishedBriefDisplay(w45).whatChanged, /The last brief/);
  });

  it("has w44's correction name the weeks missed and the scores both briefs printed", () => {
    const [w41, w44] = [findPublishedBrief("2026-w41"), findPublishedBrief("2026-w44")];
    assert.ok(w41?.scores && w44?.scores && w44.correction);
    assert.ok(w44.correction.includes("weeks of Oct 12 and Oct 19"));
    assert.ok(w44.correction.includes(`risk appetite at ${w41.scores.riskAppetite}`));
    assert.ok(w44.correction.includes(`Cloudy at ${w44.scores.riskAppetite}`));
    assert.doesNotMatch(publishedBriefDisplay(w44).whatChanged, /The last brief/, "the correction says it once");
  });
});

describe("publishedBriefModifiedAt", () => {
  it("is the date a correction opens with, and otherwise the publication", () => {
    const publishedAt = "2026-10-26T00:00:00.000Z";
    assert.equal(publishedBriefModifiedAt({ publishedAt, correction: null }), publishedAt);
    assert.equal(publishedBriefModifiedAt({ publishedAt, correction: "Corrected Nov 5, 2026. The line was wrong." }), "2026-11-05T00:00:00.000Z");
    assert.equal(publishedBriefModifiedAt({ publishedAt, correction: "A note with no date." }), publishedAt);
  });
});
