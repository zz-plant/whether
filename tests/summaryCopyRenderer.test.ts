import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderMonthlySummaryCopy, renderWeeklySummaryCopy } from "../lib/summary/summaryCopyRenderer";

describe("summaryCopyRenderer", () => {
  it("renders weekly copy with provenance fallback when sourceUrl is missing", () => {
    const copy = renderWeeklySummaryCopy({
      title: "Weekly action summary",
      summary: "Growth Mode posture: example. Priority: scale proven bets.",
      confidence: "HIGH",
      provenance: {
        sourceLabel: "US Treasury Daily Treasury Yield Curve Rates",
        timestampLabel: "Feb 20, 2026, 10:00 AM",
        ageLabel: "1h",
        statusLabel: "Live",
      },
      structured: {
        climate: {
          label: "✅ Sunny: Money is cheap and available.",
          summary: ["Capital is accessible and risk appetite is healthy."],
        },
        recommendedMoves: ["Prioritize speed and distribution over perfection"],
        executionPriorities: ["Growth experiments with clear scaling paths"],
        watchouts: ["Delaying launches while waiting for perfect data"],
        planningLanguage: "Move quickly on growth bets.",
        executionConstraints: ["Keep payback discipline"],
        governanceParameters: {
          hiringThreshold: "MODERATE",
          paybackWindowTolerance: "LONGER",
          rollbackRequirement: "STANDARD",
          approvalVelocity: "FASTER",
          expansionScope: "BROAD",
          experimentationTolerance: "HIGH",
        },
      },
    });

    assert.match(copy, /Source: US Treasury Daily Treasury Yield Curve Rates/);
    assert.doesNotMatch(copy, /\(https?:\/\//);
    assert.match(copy, /RECOMMENDED MOVES FOR PRODUCT TEAMS \(NOW\)\n\n• /);
  });

  /*
   * The Oct 5, 2026 paste said Medium in its summary sentence and "Confidence:
   * Canonical snapshot (high confidence)" under RECOMMENDATION CONFIDENCE and in
   * the stamp, because both printed the provenance tier. It also listed the
   * governance settings as engine codes ("Rollback requirement:
   * EXPLICIT_KILL_CRITERIA"), which no reader-facing vocabulary defines.
   */
  it("prints the published confidence word and no governance codes", () => {
    const copy = renderWeeklySummaryCopy({
      title: "Weekly action summary — Oct 5, 2026",
      summary: "Freezing: example.",
      recordDateLabel: "Oct 5, 2026",
      confidence: "MEDIUM",
      provenance: {
        sourceLabel: "Federal Reserve Economic Data (FRED)",
        timestampLabel: "Oct 5, 2026, 2:03 AM UTC",
        ageLabel: "2d.",
        statusLabel: "Canonical snapshot (high confidence)",
      },
      structured: {
        climate: { label: "Capital is tight", summary: ["Capital is expensive."] },
        recommendedMoves: ["Protect runway"],
        executionPriorities: ["Retention"],
        watchouts: ["Adding headcount before revenue is committed"],
        planningLanguage: "Freeze discretionary scope.",
        executionConstraints: ["Shorten payback windows and preserve cash."],
        governanceParameters: {
          hiringThreshold: "HIGH",
          paybackWindowTolerance: "STANDARD",
          rollbackRequirement: "EXPLICIT_KILL_CRITERIA",
          approvalVelocity: "BALANCED",
          expansionScope: "BALANCED",
          experimentationTolerance: "MEDIUM",
        },
      },
    });

    assert.match(copy, /MARGIN\n\nMargin: within reach of the line\n/);
    assert.match(copy, /· Margin: within reach of the line$/);
    assert.match(copy, /Updated Oct 5, 2026/);
    assert.doesNotMatch(copy, /Canonical snapshot|high confidence/i);
    assert.doesNotMatch(copy, /GOVERNANCE PARAMETER|EXPLICIT_KILL_CRITERIA|BALANCED|STANDARD/);
  });

  it("renders monthly copy with bulleted constraints and provenance", () => {
    const copy = renderMonthlySummaryCopy({
      title: "Monthly action summary",
      summary: "Efficiency Mode posture: example. Priority: retain and reduce fixed cost.",
      confidence: "MEDIUM",
      provenance: {
        sourceLabel: "US Treasury",
        sourceUrl: "https://example.com/source",
        timestampLabel: "Feb 20, 2026, 10:00 AM",
        ageLabel: "2h",
        statusLabel: "Live",
      },
      structured: {
        posture: {
          label: "Growth Mode",
          summary: [
            "Priority: scale proven bets.",
            "Confidence: high (standard signal).",
            "Boundary watch: stable.",
          ],
        },
        planningLanguage: "Plan the month around scale proven bets, and keep execution inside the current constraints.",
        boundedNextActions: [
          "Keep the month anchored to scale proven bets.",
          "Keep new commitments inside the current constraints.",
        ],
        operatingRules: [{
          action: "Run no more than three concurrent experiments.",
          threshold: "Pause new experiments if risk appetite falls below 44.0.",
          reversal: "Reopen slots when risk appetite rises above 54.0.",
        }],
        reversalConditions: [
          "Re-open broader bets if regime posture or confidence weakens.",
          "Re-check the plan when any execution constraint starts to bind.",
        ],
        executionConstraints: ["Sequence delivery around revenue durability"],
        provenance: {
          source: "US Treasury (https://example.com/source)",
          timestamp: "Feb 20, 2026, 10:00 AM",
          dataAge: "2h",
        },
      },
    });

    assert.match(copy, /CONDITIONS THIS MONTH/);
    assert.match(copy, /PLANNING LANGUAGE TO USE/);
    assert.match(copy, /> Plan the month around scale proven bets/);
    assert.match(copy, /\nNEXT ACTIONS\n/);
    assert.match(copy, /MONTHLY OPERATING RULES/);
    assert.match(copy, /Action: Run no more than three concurrent experiments/);
    assert.match(copy, /RESUME LINES/);
    assert.match(copy, /EXECUTION CONSTRAINTS/);
    assert.match(copy, /EXECUTION CONSTRAINTS\n\n• Sequence delivery around revenue durability/);
    // The source line once sat under a bare "Source:" heading: "Source:\nSource: …".
    assert.match(copy, /\n\nSource: US Treasury \(https:\/\/example\.com\/source\)\n/);
    assert.doesNotMatch(copy, /Source:\nSource:/);
    assert.match(copy, /· Margin: within reach of the line$/);
    assert.doesNotMatch(copy, /Confidence: Live|Margin: live/i);
  });
});
