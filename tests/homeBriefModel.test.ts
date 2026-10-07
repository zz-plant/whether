import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildDecisionMatrixPayload, buildHomeBriefModel, buildMemoryRail } from "../lib/report/homeBriefModel";
import { getWeeklyPostureHistory } from "../lib/summary/weeklyPostureHistory";
import { REGIME_LABELS } from "../lib/regimePresentation";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("buildHomeBriefModel", () => {
  it("keeps the memory rail labels and posture sequence aligned with the recent weekly posture artifact", () => {
    const memoryRail = buildMemoryRail("Mar 19, 2026", "DEFENSIVE");
    const expectedPriorEntries = getWeeklyPostureHistory()
      .filter((entry) => entry.record_date !== "Mar 19, 2026")
      .slice(-3)
      .map((entry) => ({
        label: entry.record_date,
        posture: REGIME_LABELS[entry.regime],
      }));

    assert.deepEqual(memoryRail, [
      ...expectedPriorEntries,
      { label: "Mar 19, 2026", posture: "Cloudy" },
    ]);
  });
  it("derives stable labels and decision rules from brief inputs", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 57, riskAppetite: 54 },
      },
      regimeAlert: { previousRegime: "VOLATILE" },
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [{ key: "tightness", delta: 2 }],
        anomalySignals: [],
      },
    }, { overlaySector: "consumer" });

    assert.match(model.confidenceLabel, /LOW|MED|HIGH/);
    assert.equal(model.postureWithStageLabel, "Cloudy");
    assert.equal(model.postureLabel, "Cloudy");
    assert.equal(typeof model.confidencePercent, "number");
    assert.equal(typeof model.regimeHeader.regime, "string");
    assert.equal(typeof model.regimeHeader.confidence, "string");
    assert.equal(typeof model.regimeHeader.primaryRisk, "string");
    assert.ok(model.regimeHeader.regime.length > 0);
    assert.ok(model.regimeHeader.confidence.length > 0);
    assert.ok(model.regimeHeader.primaryRisk.length > 0);
    assert.match(model.trendLabel, /Improving|Deteriorating|Mixed|Stable/);
    assert.match(model.transitionWatch, /ON|OFF/);
    assert.equal(typeof model.guardrail, "string");
    assert.doesNotMatch(model.weeklyMemoLines.join(" "), /current track|next release/i);
    assert.match(model.weeklyMemoLines.join(" "), /Conditions change if:|next live weekly refresh/i);
    assert.equal(typeof model.reversalTrigger, "string");
    assert.equal(model.decisionRules.length, 5);
    assert.equal(model.startupVariantPolicy.options.length, 6);
    assert.ok(model.startupVariantPolicy.options.some((option) => option.mode === "growth"));
    assert.ok(model.startupVariantPolicy.options.some((option) => option.mode === "public"));
    assert.equal(model.startupVariantPolicy.selectedMode, "series-a");
    assert.match(model.startupVariantPolicy.adjustmentsByMode.seed.reversalTriggerDiscipline, /Reverse/i);
    assert.equal(model.roleAwareTemplates.length, 2);
    assert.ok(model.executiveOperationalStance.expand.length >= 2);
    assert.ok(model.executiveOperationalStance.avoid.length >= 2);
    assert.ok(model.executiveOperationalStance.expand.length <= 4);
    assert.ok(model.executiveOperationalStance.avoid.length >= 2);
    assert.ok(model.executiveOperationalStance.avoid.length <= 4);
    assert.match(model.roleAwareTemplates[0]?.doNow ?? "", /hiring|tempo|spend|reversible/i);
    assert.equal(typeof model.revisitDecisions, "boolean");
    assert.ok(Array.isArray(model.revisitQueue));
    assert.ok(model.revisitQueue.length > 0);
    assert.match(model.revisitQueue[0]?.reason ?? "", /this week/i);
    // The queue renders `recheck` per area and hoists a shared `driver`, so both
    // halves must survive separately rather than only as the composed sentence.
    assert.ok((model.revisitQueue[0]?.recheck ?? "").length > 0);
    assert.match(model.revisitQueue[0]?.reason ?? "", new RegExp(escapeRegExp(model.revisitQueue[0]!.recheck)));
    for (const item of model.revisitQueue) {
      if (item.driver) {
        assert.match(item.reason, new RegExp(escapeRegExp(item.driver)));
      }
    }
    /* Funding pressure 55 to 57 crosses the pause line at 56 while the operating latitude
       stays at 51: what the week did to the guidance comes from the lines, and the latitude's
       sentence speaks about the number alone. This read `steadyWeek: true` and "This week's
       guidance is unchanged." until 2026-10-07. */
    assert.equal(model.weeklyLeadershipSummary.boldnessDelta, 0);
    assert.equal(model.weeklyLeadershipSummary.guidanceChange, "lines");
    assert.equal(model.weeklyLeadershipSummary.shorthandLine, "Operating latitude unchanged since last week.");
    assert.match(model.decisionReadiness.label, /Act|Act with caution|Hold/);
    assert.ok(model.memoryRail.length > 0);
    assert.ok(model.historicalTimeline.length > 0);
    assert.equal(model.historicalAnalogs.length, 0);
    assert.equal(model.lastYearComparison, null);
    assert.equal(model.macroOverlay.length, 5);
    assert.ok(model.macroOverlay.some((item) => item.label.includes("Sector sensitivity (Consumer)")));
    assert.equal(model.whyThisCall.length, 3);
    assert.ok(Array.isArray(model.evidenceItems));
    assert.match(model.whyThisCall[0].detail, /points from its .* line/i);
    assert.match(model.whyThisCall[0].detail, /re-check .* approvals/i);
    assert.match(model.decisionRules[0].pauseTrigger, /\d/);
    assert.equal(typeof model.regimeVelocity.displayLabel, "string");
    assert.equal(typeof model.weeklyMovement.score, "number");
    assert.match(model.weeklyMovement.direction, /tightening|easing|stable/);
    assert.equal(model.regimeSignalIndicators.length, 4);
    assert.equal(model.inputInfluence.length, 4);
    assert.equal(model.inputInfluence[0]?.key, "tightness");
    assert.match(model.inputInfluence[0]?.effectDetail ?? "", /where conditions change|approvals/i);
    assert.match(model.inputInfluence[0]?.watchDistanceLabel ?? "", /the change line/i);
    assert.equal(model.inputInfluence[0]?.pressureDirection, "higher-is-worse");
    assert.deepEqual(model.inputInfluence[0]?.chartDomain, { min: 0, max: 100 });
    assert.equal(model.regimeSignalIndicators[0]?.label, "Funding pressure");
    assert.match(model.regimeSignalIndicators[0]?.trendDeltaLabel ?? "", /vs last week/);
  });

  it("names the reading its delta labels are measured against, where the week records one", () => {
    const build = (comparedWith?: { recordDate: string; label: string }) =>
      buildHomeBriefModel({
        assessment: {
          regime: "DEFENSIVE",
          diagnostics: { transitionWatch: true },
          thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
          scores: { tightness: 57, riskAppetite: 54 },
        },
        regimeAlert: { previousRegime: "VOLATILE" },
        stopItems: ["Guardrail"],
        reportDynamics: {
          directionLabel: "deteriorating",
          changedSignals: [{ key: "tightness", delta: 2 }],
          anomalySignals: [],
          ...(comparedWith ? { comparedWith } : {}),
        },
      });

    const dated = build({ recordDate: "2026-08-31", label: "Aug 31" });
    assert.match(dated.postureDeltaLabel, / since Aug 31$/);
    assert.equal(dated.regimeSignalIndicators[0]?.trendDeltaLabel, "+2.0 vs Aug 31");
    assert.equal(dated.weeklyLeadershipSummary.comparedWith?.label, "Aug 31");
    assert.equal(dated.weeklyLeadershipSummary.shorthandLine, "Operating latitude unchanged since Aug 31.");
    /* A sentence about the decisions, not a figure in a unit of its own: funding pressure 55 to 57
       crosses the pause line at 56, so four of the five areas pause. */
    assert.equal(
      dated.weeklyMovement.summary,
      "Since Aug 31, the pause now applies to Hiring, Fundraising, Spending and New bets, because funding pressure rose through 56.",
    );
    assert.equal(dated.decisionMovement?.comparedWith, "Aug 31");
    assert.doesNotMatch(dated.weeklyMovement.summary, /Pressure increased|Slow new commitments/);

    // A week that does not date its comparison reads as it always did.
    const undated = build();
    assert.match(undated.postureDeltaLabel, /than last week$/);
    assert.equal(undated.regimeSignalIndicators[0]?.trendDeltaLabel, "+2.0 vs last week");
    assert.equal(undated.weeklyLeadershipSummary.comparedWith, undefined);
    assert.equal(undated.weeklyLeadershipSummary.shorthandLine, "Operating latitude unchanged since last week.");
    assert.match(undated.weeklyMovement.summary, /^This week, the pause now applies to .*, because funding pressure rose through 56\.$/);
  });

  /*
   * The model is handed a looser `reportDynamics` than the loader's, and the moves past the weekly
   * sanity limit are the biggest ones: they land in `anomalySignals` and not in `changedSignals`.
   * Reading the second list alone read the Aug 31 to Sep 25 move (63 to 90 and 56 to 43) as no move at
   * all, and said no line had been crossed on the week both pause lines were.
   */
  it("reads a move that landed in anomalySignals as the move it is, when it says what crossed a line", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "SCARCITY",
        diagnostics: { transitionWatch: false },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
        scores: { tightness: 90, riskAppetite: 43 },
      },
      regimeAlert: { previousRegime: "EXPANSION" },
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [],
        anomalySignals: [
          { key: "tightness", delta: 27, reason: "Moved past the weekly sanity limit." },
          { key: "riskAppetite", delta: -13, reason: "Moved past the weekly sanity limit." },
        ],
        comparedWith: { recordDate: "2026-08-31", label: "Aug 31" },
      },
    });

    assert.equal(
      model.weeklyMovement.summary,
      "Since Aug 31, conditions changed from Sunny to Freezing. The pause now applies to every area, because funding pressure rose through 76 and risk appetite fell through 44.",
    );
    assert.equal(model.decisionShiftHeadline, model.weeklyMovement.summary);
    assert.equal(model.decisionMovement?.moved.length, 5);
  });

  it("preserves all normalized evidence items including curve-slope", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 48, riskAppetite: 52 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportEvidenceItems: [
        { key: "tightness", title: "Capital conditions", supportingBullets: ["A"], confidenceLabel: "High", directionLabel: "Tightening", immediateImplication: "A" },
        { key: "riskAppetite", title: "Risk appetite", supportingBullets: ["B"], confidenceLabel: "High", directionLabel: "Easing", immediateImplication: "B" },
        { key: "baseRate", title: "Policy rate pressure", supportingBullets: ["C"], confidenceLabel: "Medium", directionLabel: "Unchanged", immediateImplication: "C" },
        { key: "curveSlope", title: "Yield-curve signal", supportingBullets: ["D"], confidenceLabel: "Low", directionLabel: "Easing", immediateImplication: "D" },
      ],
    });

    assert.equal(model.evidenceItems.length, 4);
    assert.equal(model.evidenceItems[3]?.key, "curveSlope");
  });

  it("returns no-change decision summary when there are no deltas", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 50, riskAppetite: 50 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });

    assert.match(model.decisionShiftSummary, /^Conditions held steady this week; no pause or resume line was crossed\. Last week's guidance stands\./);
    assert.match(model.decisionShiftSummary, /Conditions change if:/);
    assert.equal(model.decisionMovement?.moved.length, 0);
    assert.equal(model.decisionRules.length, 5);
    assert.equal(model.roleAwareTemplates.length, 2);
    assert.match(model.roleAwareTemplates[0]?.doNow ?? "", /hiring|tempo|spend|reversible/i);
    assert.equal(typeof model.confidencePercent, "number");
    assert.match(model.trendLabel, /Improving|Deteriorating|Mixed|Stable/);
    assert.equal(typeof model.revisitDecisions, "boolean");
    assert.equal(model.revisitQueue.length, 0);
    assert.ok(model.memoryRail.length > 0);
    assert.ok(model.historicalTimeline.length > 0);
    assert.equal(model.historicalAnalogs.length, 0);
    assert.equal(model.lastYearComparison, null);
    assert.equal(model.macroOverlay.length, 5);
    assert.equal(model.whyThisCall.length, 3);
    assert.ok(Array.isArray(model.evidenceItems));
    assert.match(model.whyThisCall[0].detail, /points from its .* line/i);
    assert.match(model.whyThisCall[0].detail, /re-check .* approvals/i);
    assert.match(model.decisionRules[0].pauseTrigger, /\d/);
    assert.equal(model.weeklyMovement.direction, "stable");
    assert.equal(model.weeklyMovement.score, 0);
  });

  it("describes momentum using signal-improvement semantics and strongest move", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 54, riskAppetite: 55 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "improving",
        changedSignals: [
          { key: "riskAppetite", delta: 6 },
          { key: "tightness", delta: 0.2 },
        ],
        anomalySignals: [],
      },
    });

    const momentumReason = model.whyThisCall.find((reason) => reason.key === "momentum" || reason.label === "Momentum" || reason.label === "What moved this week")?.detail ?? "";
    assert.match(momentumReason, /Risk appetite improved, and the rest of the week's readings improved on balance\./);
    assert.doesNotMatch(momentumReason, /tightness/i);
  });

  it("uses per-signal semantics when deriving primary risk from dominant move", () => {
    const improvingRiskAppetite = buildHomeBriefModel({
      fetchedAtLabel: "Updated 2h ago",
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: false },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 25, riskAppetite: 80 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "improving",
        changedSignals: [
          { key: "riskAppetite", delta: 3.2 },
        ],
        anomalySignals: [],
      },
    });

    assert.match(improvingRiskAppetite.regimeHeader.primaryRisk, /^Upside: risk appetite strengthened 3\.2 points\.$/);

    const worseningRiskAppetite = buildHomeBriefModel({
      fetchedAtLabel: "Updated 2h ago",
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: false },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 25, riskAppetite: 70 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [{ key: "riskAppetite", delta: -2.4 }],
        anomalySignals: [],
      },
    });

    assert.match(worseningRiskAppetite.regimeHeader.primaryRisk, /^Downside: risk appetite weakened 2\.4 points\.$/);
  });

  it("uses direction-aware reversal trigger language for expansion risk-appetite boundaries", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "EXPANSION",
        diagnostics: { transitionWatch: false },
        thresholds: { tightnessRegime: 40, riskAppetiteRegime: 50 },
        scores: { tightness: 10, riskAppetite: 56 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });

    /* Both of Sunny's edges, each in the direction that leaves it: the same
       sentence the brief prints, not the nearest line alone. */
    assert.equal(
      model.reversalTrigger,
      "Funding pressure rises 30 pts to clear 40 (10 today) or risk appetite falls 6 pts to 50 or below (56 today).",
    );
    assert.equal(model.flipThreshold, model.reversalTrigger);
    assert.equal(model.regimeDistance.dimensionKey, "riskAppetite");
    assert.equal(model.regimeDistance.thresholdDirection, "fallToOrBelow");
  });

  it("renders selected homepage overlay sector in macro overlay label", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "EXPANSION",
        diagnostics: { transitionWatch: false },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
        scores: { tightness: 40, riskAppetite: 64 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    }, { overlaySector: "infrastructure" });

    const overlayRow = model.macroOverlay.find((item) => item.label.includes("Sector sensitivity"));
    assert.ok(overlayRow);
    assert.match(overlayRow?.label ?? "", /Infrastructure/);
  });

  it("builds ordered historical timeline entries from regime series", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 54, riskAppetite: 55 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      historicalSelection: { month: 2, year: 2026, banner: "Historical" },
      regimeSeries: [
        { year: 2026, month: 1, recordDate: "2026-01-31", regime: "VOLATILE", summary: "Stabilizing", tightness: 50, riskAppetite: 50 },
        { year: 2026, month: 2, recordDate: "2026-02-28", regime: "DEFENSIVE", summary: "Tighten", tightness: 50, riskAppetite: 50 },
        { year: 2026, month: 3, recordDate: "2026-03-31", regime: "SCARCITY", summary: "Not selected", tightness: 50, riskAppetite: 50 },
      ],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });

    assert.equal(model.historicalTimeline.length, 2);
    assert.equal(model.historicalTimeline[0]?.month, 1);
    assert.equal(model.historicalTimeline[1]?.month, 2);
    assert.equal(model.historicalTimeline[1]?.isCurrent, true);
    assert.match(model.historicalTimeline[0]?.label ?? "", /2026/);
  });

  it("names how long the conditions have held instead of a stage word", () => {
    const series = (regimes: Array<"EXPANSION" | "SCARCITY">) =>
      regimes.map((regime, index) => ({
        year: 2026,
        month: index + 1,
        recordDate: `2026-0${index + 1}-28`,
        regime,
        summary: "",
        tightness: 50,
        riskAppetite: 50,
      }));
    const build = (regimeSeries: ReturnType<typeof series>) =>
      buildHomeBriefModel({
        assessment: {
          regime: "SCARCITY",
          diagnostics: { transitionWatch: false },
          thresholds: { tightnessRegime: 55, riskAppetiteRegime: 45 },
          scores: { tightness: 75, riskAppetite: 30 },
        },
        regimeAlert: null,
        stopItems: ["Guardrail"],
        regimeSeries,
        reportDynamics: { directionLabel: "improving", changedSignals: [], anomalySignals: [] },
      });

    assert.equal(build(series(["EXPANSION", "SCARCITY", "SCARCITY", "SCARCITY"])).postureWithStageLabel, "Freezing for 3 months");
    // One month-end says nothing a reader can use, and a month-end that disagrees
    // with this week's call must not lend it a run it does not have.
    assert.equal(build(series(["EXPANSION", "SCARCITY"])).postureWithStageLabel, "Freezing");
    assert.equal(build(series(["SCARCITY", "SCARCITY", "EXPANSION"])).postureWithStageLabel, "Freezing");
    for (const regimeSeries of [series(["SCARCITY", "SCARCITY"]), series([])]) {
      assert.doesNotMatch(build(regimeSeries).postureWithStageLabel ?? "", /Early|Mid|Late|Fragile/);
    }
  });


  it("does not emit expansion stance copy when regime improves within contraction states", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: false },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 60, riskAppetite: 62 },
      },
      regimeAlert: { previousRegime: "SCARCITY" },
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "improving",
        changedSignals: [{ key: "riskAppetite", delta: 2 }],
        anomalySignals: [],
      },
    });

    assert.doesNotMatch(model.operatingStanceLine, /Stage expansion/i);
    assert.match(model.operatingStanceLine, /Hold approvals steady/i);
    assert.match(model.operatingStanceLine, /retention|margin|revenue-linked/i);
  });


  it("keeps noun discipline in top summary fields", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "VOLATILE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
        scores: { tightness: 69, riskAppetite: 52 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "mixed",
        changedSignals: [{ key: "riskAppetite", delta: 1 }],
        anomalySignals: [],
      },
    });

    assert.match(model.postureLabel, /Freezing|Cloudy|Stormy|Sunny/);
    // An instruction a reader can act on, not a label for a mode: the line used
    // to read "Operate for proof: ship reliability, trust, and short-payback
    // releases", and this assertion only checked that it said "operate".
    assert.ok(model.operatingStanceLine.length > 0);
    assert.doesNotMatch(model.operatingStanceLine, /posture|stance|survival mode|lanes?\b|^[A-Z][a-z]+ for [a-z]+:/i);
    assert.doesNotMatch(model.netConstraintSummary, /climate stance/i);
  });

  it("marks missing macro series as fallback indicators", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 58, riskAppetite: 45 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
      macroSeries: [],
    });

    const baseRate = model.regimeSignalIndicators.find((item) => item.key === "baseRate");
    assert.ok(baseRate);
    assert.equal(baseRate?.valueLabel, "—");
    assert.equal(baseRate?.trendArrow, "→");
    assert.equal(baseRate?.isFallback, true);
  });

  it("uses assessment base rate and curve slope in indicators and influence copy when available", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 58, riskAppetite: 45, baseRate: 5.4, curveSlope: -0.3 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [
          { key: "baseRate", delta: 0.2 },
          { key: "curveSlope", delta: -0.1 },
        ],
        anomalySignals: [],
      },
    });

    const baseRate = model.regimeSignalIndicators.find((item) => item.key === "baseRate");
    const curveSlope = model.regimeSignalIndicators.find((item) => item.key === "curveSlope");
    const baseRateInfluence = model.inputInfluence.find((item) => item.key === "baseRate");
    const curveInfluence = model.inputInfluence.find((item) => item.key === "curveSlope");

    assert.equal(baseRate?.valueLabel, "5.40");
    assert.equal(baseRate?.isFallback, false);
    assert.match(curveSlope?.valueLabel ?? "", /^-0\.\d\d$/);
    assert.equal(curveSlope?.isFallback, false);
    assert.match(baseRateInfluence?.pressureLabel ?? "", /Payback pressure|Neutral rate read|Rate relief/);
    assert.match(curveInfluence?.effectDetail ?? "", /curve|expansion confidence|inverted/i);
  });


  it("builds complete decision matrix across all row and column intersections", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 58, riskAppetite: 45 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });

    assert.equal(model.decisionMatrix.columns.length, 3);
    assert.deepEqual(model.decisionMatrix.columns.map((column) => column.label), ["Approve", "Delay", "Resume when"]);
    assert.equal(model.decisionMatrix.rows.length, 4);

    for (const row of model.decisionMatrix.rows) {
      for (const column of model.decisionMatrix.columns) {
        const cell = row.cells[column.key];
        assert.ok(cell);
        assert.ok(cell.text.length > 0);
        assert.ok(cell.detail.length > 0);
        assert.ok(cell.action.length > 0);
        assert.ok(cell.threshold.length > 0);
        assert.ok(cell.reversal.length > 0);
      }
    }

    const capitalRow = model.decisionMatrix.rows.find((row) => row.key === "capital");
    assert.ok(capitalRow);
    assert.match(capitalRow?.cells.flip.text ?? "", /funding pressure\s*</i);
    assert.match(capitalRow?.cells.flip.text ?? "", /and/i);
    assert.match(capitalRow?.cells.flip.text ?? "", /risk appetite\s*>/i);
  });

  it("preserves decimal flip thresholds in matrix scan copy", () => {
    const matrix = buildDecisionMatrixPayload({
      regime: "DEFENSIVE",
      thresholds: { tightnessRegime: 0, riskAppetiteRegime: 50 },
      decisionRules: [{
        area: "capital-raising",
        recommendation: "Prepare raise materials and launch planning early to preserve process control.",
        doNow: ["Prepare raise materials and launch planning early to preserve process control."],
        avoidNow: ["Avoid speed-first terms that reduce durability under tighter conditions."],
        scope: "Fundraising launch timing, process pacing, and minimum term quality.",
        pauseTrigger: "Pause acceleration if risk appetite falls below 44 or tightness rises above 6.0.",
        resumeTrigger: "Resume full process when risk appetite > 54 and tightness < 0.0.",
        pause: { verb: "Pause", join: "or", conditions: [] },
        resume: { verb: "Resume", join: "and", conditions: [] },
        flipConditions: [
          { metric: "tightness", operator: "<", value: 0, label: "Tightness < 0.0" },
          { metric: "riskAppetite", operator: ">", value: 54, label: "Risk appetite > 54" },
        ],
        rationale: "Timing the process around signal windows improves optionality and reduces forced terms.",
      }],
      confidenceDegraded: false,
      freshnessDegraded: false,
    });

    const capitalRow = matrix.rows.find((row) => row.key === "capital");
    assert.equal(capitalRow?.cells.flip.text, "Tightness < 0.0 and Risk appetite > 54");
    assert.equal(capitalRow?.cells.flip.reversal, "Tightness < 0.0 and Risk appetite > 54");
  });

  it("falls back to default matrix cues when decision inputs are missing", () => {
    const matrix = buildDecisionMatrixPayload({
      regime: "DEFENSIVE",
      thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
      decisionRules: [],
      confidenceDegraded: true,
      freshnessDegraded: true,
    });

    assert.equal(matrix.rows.length, 4);
    assert.equal(matrix.rows[0]?.cells.approve.text, "Stage approvals on short-cycle proof");
    assert.equal(matrix.rows[0]?.cells.delay.text, "Delay irreversible commitments");
    /* Cloudy leaves its quadrant by falling to either line. */
    assert.equal(matrix.rows[0]?.cells.flip.text, "Funding pressure at or below 50");
    assert.equal(matrix.rows[1]?.cells.flip.text, "Risk appetite at or below 50");
    assert.doesNotMatch(matrix.rows[3]?.cells.flip.text ?? "", /tighten again/i);
    assert.equal(matrix.rows[0]?.cells.approve.action, "Stage approvals on short-cycle proof");
    assert.match(matrix.rows[0]?.cells.approve.threshold ?? "", /Pause if thresholds weaken/);
    assert.equal(matrix.rows[0]?.cells.flip.reversal, "Funding pressure at or below 50");
  });



  it("builds start-route since-last-review delta when regime or drivers moved", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 56, riskAppetite: 46 },
      },
      regimeAlert: { previousRegime: "VOLATILE" },
      stopItems: ["Pause non-core hiring."],
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [{ key: "tightness", delta: 2.2 }],
        anomalySignals: [],
      },
      reportEvidenceItems: [{
        key: "tightness",
        title: "Capital conditions",
        supportingBullets: ["Weekly move"],
        confidenceLabel: "Medium",
        directionLabel: "Tightening",
        immediateImplication: "Tighten approvals for fixed-cost plans.",
      }],
      regimeSeries: [
        { year: 2026, month: 1, recordDate: "2026-01-31", regime: "VOLATILE", summary: "Earlier", tightness: 50, riskAppetite: 50 },
        { year: 2026, month: 2, recordDate: "2026-02-28", regime: "DEFENSIVE", summary: "Current", tightness: 50, riskAppetite: 50 },
      ],
    });

    assert.equal(model.sinceLastReview.hasMeaningfulDelta, true);
    assert.equal(model.sinceLastReview.items.length, 3);
    assert.ok(model.sinceLastReview.items.some((item) => item.href === "/signals"));
    assert.ok(model.sinceLastReview.items.some((item) => item.href === "/operate"));
    assert.ok(model.sinceLastReview.items.some((item) => item.href === "/resolve"));
  });

  it("returns compact fallback start-route copy when no meaningful delta exists", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 50, riskAppetite: 50 },
      },
      regimeAlert: null,
      stopItems: ["Hold guardrails."],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
      regimeSeries: [
        { year: 2026, month: 1, recordDate: "2026-01-31", regime: "DEFENSIVE", summary: "Earlier", tightness: 50, riskAppetite: 50 },
        { year: 2026, month: 2, recordDate: "2026-02-28", regime: "DEFENSIVE", summary: "Current", tightness: 50, riskAppetite: 50 },
      ],
    });

    assert.equal(model.sinceLastReview.hasMeaningfulDelta, false);
    assert.match(model.sinceLastReview.fallbackCopy, /No change\. Last week's guidance stands\./);
    assert.match(model.sinceLastReview.fallbackCopy, /Re-check when:/);
    assert.equal(model.sinceLastReview.items.length, 0);
  });

  it("derives a measurable guardrail when upstream copy is absent", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "VOLATILE",
        diagnostics: { transitionWatch: true },
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
        scores: { tightness: 64, riskAppetite: 52 },
      },
      regimeAlert: null,
      stopItems: [],
      reportDynamics: { directionLabel: "stable", changedSignals: [], anomalySignals: [] },
    });

    assert.match(model.guardrail, /funding pressure.*76|risk appetite.*44/i);
    assert.doesNotMatch(model.guardrail, /trigger confirmation/i);
    assert.doesNotMatch(model.netConstraintSummary, /stay the course/i);
  });
});
