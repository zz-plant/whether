import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildPostureSummary } from "../app/api/posture/current/route";
import { buildAssessmentFixture } from "./fixtures/reportFixtures";

/*
 * `/api/posture/current`'s `summary` is the sentence an integrator shows a
 * person. On Oct 5 2026 it read "Conditions: Freezing (money is expensive and
 * hard to raise). vs Aug 31: mixed. Funding pressure 90/100: …" — a sentence
 * opening lowercase, and "mixed" on a week both scores had worsened.
 */
describe("/api/posture/current summary", () => {
  const freezing = buildAssessmentFixture({ regime: "SCARCITY", scores: { tightness: 90, riskAppetite: 48 } });

  it("says the direction since the compared reading as a sentence of its own", () => {
    const summary = buildPostureSummary({
      assessment: freezing,
      reportDynamics: { directionLabel: "deteriorating", comparedWith: { recordDate: "2026-08-31", label: "Aug 31" } },
    });

    assert.equal(
      summary,
      "Conditions: Freezing (money is expensive and hard to raise). Since Aug 31: worse. Funding pressure 90/100: money is hard to raise.",
    );
    for (const sentence of summary.split(/(?<=\.) /)) {
      assert.match(sentence, /^[A-Z]/, `"${sentence}" opens lowercase`);
    }
  });

  it("leaves the direction out when there was nothing to compare with", () => {
    const summary = buildPostureSummary({ assessment: freezing, reportDynamics: { directionLabel: "unavailable" } });

    assert.doesNotMatch(summary, /Since|not compared/);
    assert.match(summary, /^Conditions: Freezing \(.*\)\. Funding pressure 90\/100/);
  });
});
