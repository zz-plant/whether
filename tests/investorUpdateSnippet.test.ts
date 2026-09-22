import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildInvestorUpdateSnippetParts,
  findPriorMonthEnd,
  formatInvestorUpdateSnippet,
} from "../lib/export/investorUpdateSnippet";
import { evaluateRegime } from "../lib/regimeEngine";
import type { MonthlyRegimeHistoryEntry } from "../lib/summary/monthlyRegimeHistory";
import type { TreasuryData } from "../lib/types";

const treasury: TreasuryData = {
  record_date: "2026-09-16",
  fetched_at: "2026-09-16T09:00:00Z",
  source: "U.S. Treasury",
  isLive: true,
  yields: { oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.4 },
};

// The live contract's clauses are written for labelled slots and carry no full
// stop; the block has to supply one or the paragraph runs together.
const weeklyCall = {
  actionNow: "Hold net-new hiring and require reversible commitments.",
  pauseIf: "Pause if funding pressure crosses 66",
  changeCourseIf: "Re-open when risk appetite clears 50 for two reads",
};

const history: MonthlyRegimeHistoryEntry[] = [
  { record_date: "2026-06-30", regime: "EXPANSION", tightness: 40, riskAppetite: 60 },
  { record_date: "2026-08-31", regime: "DEFENSIVE", tightness: 80, riskAppetite: 44 },
  { record_date: "2026-07-31", regime: "VOLATILE", tightness: 70, riskAppetite: 50 },
  // The month in progress, which is never the comparison.
  { record_date: "2026-09-12", regime: "DEFENSIVE", tightness: 85, riskAppetite: 42 },
];

describe("investor update snippet", () => {
  it("compares against the latest month-end before the record date's month, whatever the order", () => {
    assert.equal(findPriorMonthEnd(history, "2026-09-16")?.record_date, "2026-08-31");
    assert.equal(findPriorMonthEnd(history, "2026-08-10")?.record_date, "2026-07-31");
    assert.equal(findPriorMonthEnd(history, "2026-06-05"), null);
  });

  it("writes the regime, the move over the month, and the call as two paragraphs with a stamp", () => {
    const assessment = evaluateRegime(treasury);
    const parts = buildInvestorUpdateSnippetParts({
      assessment,
      recordDate: treasury.record_date,
      weeklyCall,
      monthlyHistory: history,
      sourceLabel: treasury.source,
    });
    assert.match(parts.conditions, /as of 2026-09-16/);
    assert.match(parts.conditions, /(unchanged since|moved to .* from .* at) the end of Aug 2026/);
    assert.match(parts.conditions, /Over the month, funding pressure moved to \d+ of 100 \((\+|-)?\d+ points|unchanged\)/);
    assert.match(parts.conditions, /The call is (well clear of|within reach of|close to) the line that would change it\./);
    assert.match(parts.response, /^Our operating response this month: Hold net-new hiring/);
    assert.match(parts.response, /The guardrail we are watching: Pause if funding pressure crosses 66\./);
    assert.match(parts.response, /What would change our course: Re-open when risk appetite clears 50 for two reads\.$/);
    assert.doesNotMatch(parts.response, /commitments\.\./, "an existing full stop is not doubled");
    assert.equal(parts.source, "Source: U.S. Treasury, 2026-09-16, via whether.work.");

    const block = formatInvestorUpdateSnippet(parts, null);
    assert.deepEqual(block.split("\n"), [parts.conditions, "", parts.response, "", parts.source]);
  });

  it("names a regime change against the prior month-end", () => {
    const assessment = evaluateRegime(treasury);
    const priorDiffers = history.map((entry) =>
      entry.record_date === "2026-08-31" ? { ...entry, regime: assessment.regime === "EXPANSION" ? "SCARCITY" as const : "EXPANSION" as const } : entry,
    );
    const parts = buildInvestorUpdateSnippetParts({
      assessment,
      recordDate: treasury.record_date,
      weeklyCall,
      monthlyHistory: priorDiffers,
      sourceLabel: treasury.source,
    });
    assert.match(parts.conditions, /moved to .+ as of 2026-09-16, from .+ at the end of Aug 2026\./);
  });

  it("reports no move when the archive month has no scores, and none at all with no prior month", () => {
    const assessment = evaluateRegime(treasury);
    const scoreless = buildInvestorUpdateSnippetParts({
      assessment,
      recordDate: treasury.record_date,
      weeklyCall,
      monthlyHistory: [{ record_date: "2026-08-31", regime: assessment.regime }],
      sourceLabel: treasury.source,
    });
    assert.match(scoreless.conditions, /Funding pressure sits at \d+ of 100 and risk appetite at \d+ of 100\./);
    assert.doesNotMatch(scoreless.conditions, /over the month/i);

    const first = buildInvestorUpdateSnippetParts({
      assessment,
      recordDate: treasury.record_date,
      weeklyCall,
      monthlyHistory: [],
      sourceLabel: treasury.source,
    });
    assert.doesNotMatch(first.conditions, /end of/);
  });

  it("adds the runway sentence for a known band and leaves the paragraph alone otherwise", () => {
    const parts = { conditions: "C.", response: "R.", source: "S." };
    assert.equal(formatInvestorUpdateSnippet(parts, undefined), "C.\n\nR.\n\nS.");
    assert.match(formatInvestorUpdateSnippet(parts, "critical"), /^C\.\n\nR\. With under six months of runway, cash comes before/);
    assert.match(formatInvestorUpdateSnippet(parts, "tight"), /pay back inside \[n\] months/);
    assert.match(formatInvestorUpdateSnippet(parts, "balanced"), /the weekly call sets our pace/);
    assert.match(formatInvestorUpdateSnippet(parts, "abundant"), /without loosening the payback bar/);
    // The runway clause is the reader's own choice; what the company is doing about it is not,
    // so every band but the neutral one leaves that as a bracketed prompt rather than asserting
    // a signoff rule, a raise in progress or hires under way in the founder's voice.
    for (const band of ["critical", "tight", "abundant"] as const) {
      assert.match(formatInvestorUpdateSnippet(parts, band), /\[[^\]]+\]/, `${band} asserts a policy the reader did not choose`);
    }
    assert.doesNotMatch(formatInvestorUpdateSnippet(parts, "balanced"), /corridor|tempo|second signoff|peers/);
    // Letter copy, not control labels.
    for (const band of ["critical", "tight", "balanced", "abundant"] as const) {
      assert.doesNotMatch(formatInvestorUpdateSnippet(parts, band), /critical|tight runway|balanced|abundant|band/i);
    }
  });

  it("stamps a cached reading as one", () => {
    const parts = buildInvestorUpdateSnippetParts({
      assessment: evaluateRegime(treasury),
      recordDate: treasury.record_date,
      weeklyCall,
      monthlyHistory: history,
      sourceLabel: treasury.source,
      isFallback: true,
    });
    assert.match(parts.source, /cached snapshot, not a live read/);
  });
});
