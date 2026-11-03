import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildPortfolioNote } from "../lib/export/portfolioNote";
import { evaluateRegime } from "../lib/regimeEngine";
import { RUNWAY_BAND_OPTIONS } from "../lib/report/operatorRunway";
import type { TreasuryData } from "../lib/types";
import { buildBriefDocument } from "../lib/report/briefDocument";
import { fixtureWeeklyCall } from "./factories/exportFixtures";

/*
 * The portfolio note runs from one sender to many companies (2026-10-01), so it
 * cannot carry one runway: it prints every band, every area's rule with the one
 * side of it that can change the area, and where a company sets lines of its
 * own. It names no reader-side fact it was not given.
 */

const treasury: TreasuryData = {
  record_date: "2026-09-29",
  fetched_at: "2026-09-29T09:00:00Z",
  source: "U.S. Treasury",
  isLive: true,
  yields: { oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.4 },
};

const areas = [
  {
    area: "hiring" as const,
    rule: "Limit hiring to backfills and mission-critical roles tied to delivery risk",
    pause: { line: "Funding pressure > 76", state: "near" as const },
    resume: { line: "Risk appetite > 54" },
  },
  {
    area: "burn-discipline" as const,
    rule: "Put a payback figure on every discretionary line before approving it.",
    pause: { line: "Funding pressure > 76", state: "crossed" as const },
    resume: { line: "Funding pressure < 66" },
  },
  { area: "product-tempo" as const, rule: "Keep the core roadmap on schedule" },
];

const build = (isFallback = false) => {
  const record = isFallback ? { ...treasury, isLive: false, fallback_at: "2026-09-29T09:00:00Z", fallback_reason: "FRED unreachable." } : treasury;
  const assessment = evaluateRegime(record);
  return buildPortfolioNote(
    buildBriefDocument(
      { assessment, treasury: record, macroSeries: [], recordDateLabel: record.record_date, sourceLabel: "U.S. Treasury" },
      fixtureWeeklyCall(assessment),
    ),
    areas,
  );
};

describe("portfolio note", () => {
  it("prints what the week means at every runway band, not one company's", () => {
    const note = build();
    for (const band of RUNWAY_BAND_OPTIONS) {
      const phrase = `${band.phrase.charAt(0).toUpperCase()}${band.phrase.slice(1)}`;
      assert.ok(note.includes(`- ${phrase} of runway: `), `${band.label} band missing`);
    }
    assert.doesNotMatch(note, /: With .* of runway/, "the band label says the runway once; the notes do not repeat it");
  });

  it("gives each area its rule and the one side that can change it, under the page's own slot names", () => {
    const note = build();
    // Not on hold: only the pause line can change the area, so its restart line is left out.
    assert.match(note, /^- Hiring: Limit hiring to backfills and mission-critical roles tied to delivery risk\. Pause if Funding pressure > 76\.$/m);
    // On hold: only the restart line can.
    assert.match(note, /^- Spending: Put a payback figure on every discretionary line before approving it\. Restart when Funding pressure < 66\.$/m);
    assert.match(note, /- Roadmap: Keep the core roadmap on schedule\.$/m, "an area with no numeric line prints its rule alone");
    assert.ok(note.includes("The rule for each area:"));
  });

  it("ends where a company sets its own lines, with the source and the dated brief", () => {
    const note = build();
    assert.match(note, /\/operate#ops-plan-lines/);
    assert.match(note, /^Source: U\.S\. Treasury, 2026-09-29, via whether\.work · scored on the same data we used for past months\.$/m);
    assert.match(note, /^Full brief: https?:\/\//m);
    assert.match(build(true), /\(saved copy, not a live reading\) · scored on the same data we used for past months\.$/m);
  });

  it("uses none of the words a reader-facing paste may not", () => {
    assert.doesNotMatch(build(), /\b(board|posture|regime|stance|guardrail|flip|corridor|tightness|bounded|the call)\b/i);
  });
});
