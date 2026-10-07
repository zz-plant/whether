import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { buildQuietDayRead, buildStandupFlipLine } from "../lib/report/flipProximity";
import { buildWeeklyOperatorBriefPayload, buildWeeklyOperatorBriefPlainText } from "../lib/export/weeklyOperatorBrief";
import { buildBriefDocument } from "../lib/report/briefDocument";
import { buildWeeklyCallContract } from "../lib/report/weeklyCallContract";
import { evaluateRegime } from "../lib/regimeEngine";
import { snapshotData } from "../lib/snapshot";

/*
 * The operating latitude is 0.7 × risk appetite + 0.3 × (100 − funding pressure), so it
 * stays flat whenever the two scores move against each other in that ratio. Funding
 * pressure 54 to 57 with risk appetite 53 to 54 leaves it at 51 on both readings, while
 * funding pressure crosses the pause line at 56. Every "nothing changed" line read the
 * latitude's move until 2026-10-07, so this week printed:
 *
 *   "This week's guidance is unchanged."            (the latitude's shorthand, in the paste)
 *   "Call unchanged, …; no pace change."             (the standup line on /share)
 *   "Conditions unchanged — …"                       (the quiet-day line on /)
 *
 * beside guidance that now pauses four areas. They read what the week did to the guidance
 * now (`describeGuidanceChange`), and the latitude's line speaks about the number.
 */
const sep29 = { recordDate: "2026-09-29", label: "Sep 29" };

const buildWeek = (overrides: { regimeChanged?: boolean; previousRegime?: "VOLATILE" | "DEFENSIVE" } = {}) =>
  buildHomeBriefModel({
    assessment: {
      regime: "DEFENSIVE",
      diagnostics: { transitionWatch: false },
      thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
      scores: { tightness: 57, riskAppetite: 54 },
    },
    regimeAlert: overrides.previousRegime ? { previousRegime: overrides.previousRegime } : null,
    stopItems: ["Guardrail"],
    reportDynamics: {
      directionLabel: "mixed",
      regimeChanged: overrides.regimeChanged ?? false,
      changedSignals: [
        { key: "tightness", delta: 3 },
        { key: "riskAppetite", delta: 1 },
      ],
      anomalySignals: [],
      comparedWith: sep29,
    },
  });

describe("a flat operating latitude over a week the guidance changed", () => {
  it("keeps the latitude's line about the number when a pause line was crossed", () => {
    const model = buildWeek();
    const summary = model.weeklyLeadershipSummary;
    /* What the homepage passes the quiet-day read (`app/page.tsx`). */
    const steadyWeek = summary.guidanceChange === "held";

    assert.equal(summary.boldnessDelta, 0, "the latitude did not move");
    assert.ok((model.decisionMovement?.moved.length ?? 0) > 0, "a pause line was crossed");
    assert.equal(summary.guidanceChange, "lines");
    assert.equal(summary.shorthandLine, "Operating latitude unchanged since Sep 29.");

    assert.equal(
      buildStandupFlipLine({ regime: "DEFENSIVE", change: summary.guidanceChange, proximity: [] }),
      "Guidance changed at a pause or resume line, no near flip; review pace.",
    );
    assert.equal(
      buildQuietDayRead({ steadyWeek, flipProximity: ["If funding pressure falls 2 points, conditions turn Stormy."] }),
      null,
      "no \"Conditions unchanged\" over a crossed pause line",
    );
  });

  it("says the conditions changed when they did, whatever the latitude did", () => {
    const model = buildWeek({ regimeChanged: true, previousRegime: "VOLATILE" });
    const summary = model.weeklyLeadershipSummary;

    assert.equal(summary.boldnessDelta, 0);
    assert.equal(summary.guidanceChange, "conditions");
    assert.equal(
      buildStandupFlipLine({ regime: "DEFENSIVE", change: summary.guidanceChange, proximity: [] }),
      "Conditions changed to Cloudy, no near flip; review pace.",
    );
  });

  it("prints the number's move once in the paste, and nothing about the guidance holding", () => {
    const model = buildWeek();
    const assessment = evaluateRegime(snapshotData);
    const document = buildBriefDocument(
      { assessment, treasury: snapshotData, macroSeries: [], recordDateLabel: "Oct 5, 2026", sourceLabel: "Federal Reserve Economic Data (FRED)" },
      buildWeeklyCallContract({ assessment, homeBriefModel: model }),
    );
    const text = buildWeeklyOperatorBriefPlainText(
      buildWeeklyOperatorBriefPayload(document, { weeklyLeadershipSummary: model.weeklyLeadershipSummary }),
    );

    assert.match(text, /^Operating latitude: 51\/100 \(room to hire, spend and commit; higher means more room\) · vs Sep 29: no change$/m);
    assert.doesNotMatch(text, /guidance is (unchanged|holding)|guidance is holding where it was/i);
  });
});
