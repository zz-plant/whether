import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { getPublishedBriefs } from "../lib/report/publishedBriefs";
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
