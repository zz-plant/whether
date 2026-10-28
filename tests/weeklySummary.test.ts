import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { evaluateRegime } from "../lib/regimeEngine";
import { macroSeries } from "../lib/macroSnapshot";
import { resolvePublishedConfidence } from "../lib/report/confidence";
import { buildMonthlySummary } from "../lib/summary/monthlySummary";
import { buildQuarterlySummary } from "../lib/summary/quarterlySummary";
import { SHOCK_CROSSING_CUE } from "../lib/summary/summaryFormatting";
import { buildWeeklySummary } from "../lib/summary/weeklySummary";
import { buildYearlySummary } from "../lib/summary/yearlySummary";

describe("buildWeeklySummary", () => {
  it("generates a copy block that starts with summary context and bulleted weekly sections", () => {
    const assessment = evaluateRegime({
      source: "https://example.com/treasury",
      record_date: "2026-01-23",
      fetched_at: "2026-01-23T12:00:00.000Z",
      isLive: true,
      yields: {
        oneMonth: 5.6,
        twoYear: 5.1,
        tenYear: 3.9,
      },
    });

    const summary = buildWeeklySummary({
      assessment,
      recordDateLabel: "Jan 23, 2026",
      provenance: {
        sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
        sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
        timestampLabel: "Jan 23, 2026, 12:00 PM",
        ageLabel: "1h",
        statusLabel: "Live",
      },
    });

    assert.ok(summary.copy.startsWith(`${summary.title}\n${summary.summary}\n\n---`));
    assert.match(summary.copy, /RECOMMENDED MOVES FOR PRODUCT TEAMS \(NOW\)\n\n• /);
    assert.match(summary.copy, /EXECUTION PRIORITIES THAT TRAVEL WELL\n\n• /);
    assert.match(summary.copy, /WATCHOUTS THAT BREAK EXECUTION\n\n• /);
    assert.ok(summary.structured);
    assert.deepEqual(summary.structured.executionConstraints, summary.constraints);
    assert.equal(summary.structured.planningLanguage.length > 0, true);
  });

  it("prints the published confidence, not the engine's confirmation gate", () => {
    // Funding pressure 90 (20 over its line), risk appetite 57 (7 over): the
    // engine's gate ranks the raw 7 and says MEDIUM; the published confidence
    // puts the risk gap on the funding-pressure scale (31.5) and says HIGH. The
    // shape of the Sep 22, 2026 week the summaries used to contradict.
    const record = {
      source: "https://example.com/treasury",
      record_date: "2026-09-22",
      fetched_at: "2026-09-22T12:00:00.000Z",
      isLive: true,
      yields: { oneMonth: 4.2, twoYear: 4.0, tenYear: 4.425 },
    };
    const assessment = evaluateRegime(record);
    assert.equal(assessment.scores.tightness, 90);
    assert.equal(assessment.scores.riskAppetite, 57);
    assert.equal(assessment.diagnostics.confidence, "MEDIUM");
    assert.equal(resolvePublishedConfidence({ assessment, record }).label, "HIGH");

    const provenance = {
      sourceLabel: "test",
      timestampLabel: "Sep 22, 2026",
      ageLabel: "1h",
      statusLabel: "Live",
    };
    const weekly = buildWeeklySummary({ assessment, provenance, record });
    const monthly = buildMonthlySummary({ assessment, provenance, record });
    for (const summary of [weekly, monthly]) {
      assert.equal(summary.confidence, "HIGH");
      assert.ok(summary.summary.includes("The scores are clear of the change lines"), summary.summary);
    }

    // A fallback reading older than five days drops a step, as on every page
    // (the record is dated in the past, so on any clock after Sep 27 it is stale).
    const staleFallback = { ...record, fallback_at: "2026-09-22T12:00:00.000Z", fallback_reason: "upstream down" };
    const stale = buildWeeklySummary({ assessment, provenance, record: staleFallback });
    assert.equal(stale.confidence, "MEDIUM");
    assert.ok(stale.summary.includes("A score is within reach of its change line"), stale.summary);
  });

  /*
   * The Oct 5, 2026 shape: Freezing, funding pressure 90 (20 over its line), risk
   * appetite 48 (2 under). The summaries said "the signals behind it are barely
   * moving" because the engine's intensity band is the raw distance to the
   * nearer line (2 points), while funding pressure had risen 27 points since
   * Aug 31. The sentence now states that distance, in the canonical words.
   */
  it("states how far each score sits from its line, not a speed it never measured", () => {
    const record = {
      source: "https://example.com/treasury",
      record_date: "2026-10-05",
      fetched_at: "2026-10-05T12:00:00.000Z",
      isLive: true,
      yields: { oneMonth: 4.2, twoYear: 4.0, tenYear: 4.2 },
    };
    /* With the market series the reading is not held, so its change line is the lines. */
    const assessment = evaluateRegime(record, undefined, macroSeries);
    assert.equal(assessment.regime, "SCARCITY");
    assert.equal(assessment.policyAssessment.refusal.refused, false);
    assert.equal(assessment.scores.tightness, 90);
    /* On the record basis: the curve's 48, with the startup-market inputs' -11 left out. */
    assert.equal(assessment.scores.riskAppetite, 48);

    const provenance = { sourceLabel: "FRED", timestampLabel: "Oct 5, 2026", ageLabel: "6m.", statusLabel: "Canonical snapshot (high confidence)" };
    const changeLine =
      "Conditions change if: Funding pressure falls 20 pts from 90 to 70 or below, or risk appetite rises 2 pts from 48 to clear 50.";
    for (const summary of [
      buildWeeklySummary({ assessment, provenance, recordDateLabel: "Oct 5, 2026", record }),
      buildMonthlySummary({ assessment, provenance, recordDateLabel: "Oct 5, 2026", record }),
    ]) {
      assert.ok(summary.summary.includes(changeLine), summary.summary);
      assert.doesNotMatch(summary.copy, /moving|barely/);
    }
  });

  /* Rates alone leave too many inputs missing, so the reading is held. The change line
     named both scores' lines beside "The guidance is not changing this week" until
     2026-10-07; it is the hold's own condition now (docs/claims-ledger.md). */
  it("says what ends the hold on a held reading, not a line", () => {
    const record = {
      source: "https://example.com/treasury",
      record_date: "2026-10-05",
      fetched_at: "2026-10-05T12:00:00.000Z",
      isLive: true,
      yields: { oneMonth: 4.2, twoYear: 4.0, tenYear: 4.2 },
    };
    const assessment = evaluateRegime(record);
    assert.equal(assessment.policyAssessment.refusal.refused, true);
    const provenance = { sourceLabel: "FRED", timestampLabel: "Oct 5, 2026", ageLabel: "6m.", statusLabel: "Canonical snapshot (high confidence)" };
    const summary = buildWeeklySummary({ assessment, provenance, recordDateLabel: "Oct 5, 2026", record });
    assert.ok(
      summary.summary.includes("Conditions change if: The missing inputs return in a live reading; until then the guidance is not changing."),
      summary.summary,
    );
    assert.doesNotMatch(summary.summary, /pts to clear|or below \(/);
  });

  it("dates the paste by the record date it is handed and prints the published confidence", () => {
    const record = {
      source: "https://example.com/treasury",
      record_date: "2026-10-05",
      fetched_at: "2026-10-05T12:00:00.000Z",
      isLive: true,
      yields: { oneMonth: 4.2, twoYear: 4.0, tenYear: 4.2 },
    };
    const assessment = evaluateRegime(record);
    const weekly = buildWeeklySummary({
      assessment,
      provenance: { sourceLabel: "FRED", timestampLabel: "Oct 5, 2026", ageLabel: "6m.", statusLabel: "Canonical snapshot (high confidence)" },
      recordDateLabel: "Oct 5, 2026",
      record,
    });

    assert.equal(weekly.confidence, "MEDIUM");
    assert.equal(weekly.title, "Weekly action summary — Oct 5, 2026");
    assert.match(weekly.copy, /\nUpdated Oct 5, 2026\n/);
    assert.match(weekly.copy, /\nRoom before a change: within reach of the line\n/);
    assert.doesNotMatch(weekly.copy, /high confidence|EXPLICIT_KILL_CRITERIA|SLOWER_STRUCTURED|REVERSIBLE_ONLY/);
  });

  /*
   * The Oct 5, 2026 pastes, read end to end: "WHETHER · Capital Posture
   * Governance", "⚠️ RISK-OFF / CAPITAL-TIGHT" under a summary opening
   * "Freezing:", "MONTHLY POSTURE" and "BOUNDED NEXT ACTIONS", "Freezing mode."
   * leading the quarter and the year, and — on a held or shock week — "A policy
   * override is holding the posture in place" and "This flip crossed its line".
   */
  it("speaks in the conditions word on every cadence, including a held or shock week", () => {
    const record = {
      source: "https://example.com/treasury",
      record_date: "2026-10-05",
      fetched_at: "2026-10-05T12:00:00.000Z",
      isLive: true,
      yields: { oneMonth: 4.2, twoYear: 4.0, tenYear: 4.2 },
    };
    const live = evaluateRegime(record);
    const assessment = {
      ...live,
      diagnostics: { ...live.diagnostics, shockCrossing: true },
      policyAssessment: {
        ...live.policyAssessment,
        refusal: { refused: true, reasons: ["Too many inputs are missing to support a change in the guidance."] },
      },
    };
    const provenance = { sourceLabel: "Federal Reserve Economic Data (FRED)", timestampLabel: "Oct 5, 2026", ageLabel: "2d.", statusLabel: "Latest recorded reading" };
    const weekly = buildWeeklySummary({ assessment, provenance, recordDateLabel: "Oct 5, 2026", record });
    const monthly = buildMonthlySummary({ assessment, provenance, recordDateLabel: "Oct 5, 2026", record });
    const quarterly = buildQuarterlySummary({ assessment, provenance, periodLabel: "Q4 2026", record });
    const yearly = buildYearlySummary({ assessment, provenance, periodLabel: "2026", record });

    assert.match(weekly.copy, /\nWHETHER · Weekly operating guidance\n/);
    assert.match(weekly.copy, /\nMARKET CLIMATE\n\nFreezing: Money is expensive and hard to raise\.\n/);
    assert.match(weekly.summary, /The guidance is not changing this week\. Too many inputs are missing to support a change in the guidance\. Keep new commitments reversible until the hold lifts\./);
    for (const summary of [weekly, monthly]) {
      assert.ok(summary.summary.includes(SHOCK_CROSSING_CUE), summary.summary);
    }
    assert.match(monthly.copy, /\nCONDITIONS THIS MONTH\n\nFreezing\n/);
    assert.ok(quarterly.summary.startsWith(`Freezing: ${live.description}`), quarterly.summary);
    assert.ok(yearly.summary.startsWith(`Freezing: ${live.description}`), yearly.summary);
    for (const copy of [weekly.copy, monthly.copy, quarterly.copy, yearly.copy]) {
      assert.doesNotMatch(copy, /posture|policy override|bounded|\bflip|reversal condition|\bmode\b|RISK-(ON|OFF|SELECTIVE)|CAPITAL-(TIGHT|LOOSE)|SCARCITY/i);
    }
  });
});
