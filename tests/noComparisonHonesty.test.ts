import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildReportDynamics } from "../lib/report/reportEvidence";
import { buildWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { buildReportDataFixture } from "./fixtures/reportFixtures";
import { evaluateRegime } from "../lib/regimeEngine";
import { snapshotData } from "../lib/snapshot";
import type { ReportDynamics } from "../lib/report/reportData";

/*
 * "No previous reading" and "a week that moved nothing" arrive as the same
 * inputs — a zero severity delta and an empty changed-signal list — and every
 * renderer downstream read the second meaning. `buildReportDynamics` said
 * `"stable"` when handed `previous: null`, and the loader's fallback dynamics
 * said it too, so a degraded read published "Conditions held steady this week.
 * Last week's calls stand." on the homepage and "No worse than last week" onto
 * the OG share card, which is the copy that travels furthest.
 *
 * The fix is a fifth direction rather than better wording: `"unavailable"`.
 * These tests pin the distinction at the source and at the surfaces, and the
 * second half of each one matters as much as the first — a real comparison must
 * still say what it found.
 */

const reading = (tightness: number, riskAppetite: number) =>
  evaluateRegime({
    ...snapshotData,
    yields: { ...snapshotData.yields, twoYear: riskAppetite / 20, tenYear: tightness / 20 },
  });

const CLAIMS_A_COMPARISON = /last week|held steady|no significant change|nothing (?:else )?moved|no material change/i;

describe("a comparison that did not happen", () => {
  it("is not reported as a stable week by the source that builds dynamics", () => {
    const current = reading(72, 45);

    assert.equal(buildReportDynamics({ current, previous: null }).directionLabel, "unavailable");
    assert.notEqual(buildReportDynamics({ current, previous: current }).directionLabel, "unavailable");
  });

  it("leaves the posture delta and the weekly movement making no claim about last week", () => {
    const snapshot = buildWeeklyBriefSnapshot({
      reportData: buildReportDataFixture({
        reportDynamics: {
          changedSignals: [],
          anomalySignals: [],
          totalSignalChanges: 0,
          regimeChanged: false,
          directionLabel: "unavailable",
        } satisfies ReportDynamics,
      }),
      degraded: true,
    });

    const { postureDeltaLabel, weeklyMovement, decisionShiftSummary } = snapshot.homeBriefModel;

    assert.equal(postureDeltaLabel, "No previous week to compare");
    assert.equal(weeklyMovement.direction, "unavailable");
    assert.equal(weeklyMovement.score, null, "a missing comparison is not a move of zero");
    assert.doesNotMatch(weeklyMovement.summary, CLAIMS_A_COMPARISON);
    assert.doesNotMatch(decisionShiftSummary, CLAIMS_A_COMPARISON);
  });

  it("still lets a real comparison say what it found", () => {
    const snapshot = buildWeeklyBriefSnapshot({
      reportData: buildReportDataFixture({
        reportDynamics: {
          changedSignals: [{ key: "tightness", label: "Funding pressure", delta: 4 }],
          anomalySignals: [],
          totalSignalChanges: 1,
          regimeChanged: false,
          directionLabel: "deteriorating",
        } satisfies ReportDynamics,
      }),
      degraded: false,
    });

    const { weeklyMovement, postureDeltaLabel } = snapshot.homeBriefModel;

    assert.notEqual(weeklyMovement.direction, "unavailable");
    assert.equal(typeof weeklyMovement.score, "number");
    assert.match(weeklyMovement.summary, /this week/i);
    assert.match(postureDeltaLabel, /last week/i);
  });
});
