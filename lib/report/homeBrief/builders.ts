import { anyPauseLineMet, buildFlipThreshold, resolveWeeklyTone } from "../reportEvidence";
import {
  buildCanonicalBoundedDecisionRules,
  decisionAreaLabel,
  formatBoundedDecisionAction,
  formatBoundedDecisionReverse,
  formatSharedFlipCorridor,
} from "../boundedDecisionRules";
import {
  buildActionStripItems,
  buildRoleAwareOperatingTemplates,
} from "../operatingCalls";
import { FRESH_FALLBACK_HOURS, resolveDistanceToFlip, resolvePublishedConfidence } from "../confidence";
import { buildRegimeFlipState, boundaryDirectionForRegime } from "../regimeFlipState";
import { type ReportDynamics } from "../reportData";
import { comparisonBasis, type ComparisonBasis } from "../comparisonBasis";
import { areaLinesFromRules, buildDecisionMovement, describeGuidanceChange } from "../decisionMovement";
import { previousScoresFromDynamics } from "../../export/scoreReference";
import { formatThresholdNumber } from "../../formatters";
import { NO_LIVE_READING_CALL } from "../reportCopy";
import { describePolicyHold } from "../regimeDescription";
import {
  REGIME_SEVERITY_RANK,
  getRegimeDisplayLabel,
  getRegimePublicLabel,
  type RegimeMomentum,
} from "../../regimePresentation";
import {
  getTransitionVelocityEstimate,
  toForecastLabel,
  type TransitionVelocityEstimate,
} from "../forecastModel";
import {
  formatConfidencePlainLabel,
  joinSentences,
} from "../reportFormatting";
import {
  buildDecisionReadinessState,
  buildTrustWarnings,
  couldCallChangeNextWeek,
} from "../trustStatus";
import {
  buildScopedVariantDecisionAdjustment,
  startupVariantModes,
} from "../boundedDecisionRules";
import { resolveRunwayBand, type RunwayBand } from "../operatorRunway";
import { buildDecisionMatrixPayload } from "./decisionMatrix";
import { buildPrimaryRiskLabel } from "./risk";
import { extractExecutiveOperationalStance } from "./executiveOperationalStance";
import {
  appendCallChangesIf,
  buildDecisionShiftSummary,
  buildOperatingStanceLine,
  buildReadThisCardItems,
  buildSignalConfidenceReason,
  buildWeeklyMemoLines,
  describeWeeklyMemoLead,
  buildWeeklyMovementMetric,
  buildWhyItMattersLine,
  resolvePrimaryShiftRegimeKey,
} from "./decisionNarrative";
import {
  buildFlipRiskMeterState as buildFlipRiskMeterStateInternal,
  buildHistoricalTimeline,
  formatRegimeWithDuration,
  buildMacroOverlay,
  buildMemoryRail,
  buildStartRouteDeltaBlock,
  buildWhyThisCall,
} from "./historyAndContext";
import {
  buildInputInfluenceItems,
  buildRegimeSignalIndicators,
} from "./signalIndicators";
import { buildWeeklyLeadershipBriefModel, getNetDeltaLabel } from "../weeklyLeadershipBrief";
import type {
  CanonicalFlipCondition,
  HomeBriefTrustWarning,
  HomeBriefHistoricalAnalog,
  HomeReportData,
  PostureTrajectoryState,
  StartupVariantPolicy,
  WeeklyDecisionCardViewModel,
} from "../homeBriefModel";
import type { SectorKey } from "../sectorSensitivity";
import type { WeeklyCallContract } from "../weeklyCallContract";
import { regimeSignalLabel } from "../signalTranslations";
import { isSavedCopy } from "../provenanceStatus";

export { buildMemoryRail };

type RevisitDriverSignal = {
  key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
  delta: number;
};

const revisitReasonByArea: Record<WeeklyDecisionCardViewModel["decision"]["revisitQueue"][number]["id"], string> = {
  hiring: "Re-check the hiring line before opening a new role.",
  "product-tempo": "Look at the roadmap again before assuming last week's pace still holds.",
  "capital-raising": "If you plan to raise, re-check the timing before assuming the window is unchanged.",
  "burn-discipline": "Re-approve optional spend before committing to new monthly costs.",
  "expansion-bets": "Re-check new bets before treating them as committed.",
};

const signalAreaPriority: Record<RevisitDriverSignal["key"], WeeklyDecisionCardViewModel["decision"]["revisitQueue"][number]["id"][]> = {
  tightness: ["hiring", "burn-discipline", "capital-raising"],
  riskAppetite: ["product-tempo", "expansion-bets", "capital-raising"],
  baseRate: ["capital-raising", "burn-discipline", "hiring"],
  curveSlope: ["product-tempo", "expansion-bets", "capital-raising"],
};

const formatDriverDelta = (delta: number) => Number.isInteger(delta) ? delta.toFixed(0) : delta.toFixed(1);

const summarizeSignalDriver = (
  signal: RevisitDriverSignal,
) => {
  const absDelta = formatDriverDelta(Math.abs(signal.delta));

  switch (signal.key) {
    case "tightness":
      return signal.delta >= 0
        ? `Funding pressure rose ${absDelta} points this week.`
        : `Funding pressure eased ${absDelta} points this week.`;
    case "riskAppetite":
      return signal.delta >= 0
        ? `Risk appetite improved ${absDelta} points this week.`
        : `Risk appetite weakened ${absDelta} points this week.`;
    case "baseRate":
      return signal.delta >= 0
        ? `Borrowing costs rose ${absDelta} points this week.`
        : `Borrowing costs eased ${absDelta} points this week.`;
    case "curveSlope":
      return signal.delta >= 0
        ? `The recession warning gauge steepened ${absDelta} points this week.`
        : `The recession warning gauge flattened ${absDelta} points this week.`;
    default:
      return "Core inputs moved this week.";
  }
};

const buildRevisitQueue = ({
  revisitDecisions,
  decisionRules,
  reportDynamics,
}: {
  revisitDecisions: boolean;
  decisionRules: WeeklyDecisionCardViewModel["decision"]["decisionRules"];
  reportDynamics?: {
    changedSignals: RevisitDriverSignal[];
  };
}): WeeklyDecisionCardViewModel["decision"]["revisitQueue"] => {
  if (!revisitDecisions) {
    return [];
  }

  const changedSignals = [...(reportDynamics?.changedSignals ?? [])]
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
  const driverByArea = new Map<
    WeeklyDecisionCardViewModel["decision"]["revisitQueue"][number]["id"],
    RevisitDriverSignal
  >();

  for (const signal of changedSignals) {
    for (const area of signalAreaPriority[signal.key]) {
      if (!driverByArea.has(area)) {
        driverByArea.set(area, signal);
      }
    }
  }

  const orderedAreas = [
    ...driverByArea.keys(),
    ...decisionRules.map((rule) => rule.area),
  ].filter((area, index, areas) => areas.indexOf(area) === index);

  return orderedAreas.slice(0, 3).flatMap((area) => {
    const rule = decisionRules.find((candidate) => candidate.area === area);
    if (!rule) {
      return [];
    }

    const driver = driverByArea.get(area);
    const driverSentence = driver ? summarizeSignalDriver(driver) : null;
    const recheck = revisitReasonByArea[area];

    return [{
      id: area,
      label: decisionAreaLabel(area),
      action: formatBoundedDecisionAction(rule),
      driver: driverSentence,
      recheck,
      reason: `${driverSentence ? `${driverSentence} ` : ""}${recheck}`,
      flipCondition: formatBoundedDecisionReverse(rule),
    }];
  });
};

export const buildFlipRiskMeterState = (
  regimeDistance?: WeeklyDecisionCardViewModel["diagnostics"]["regimeDistance"],
): WeeklyDecisionCardViewModel["diagnostics"]["flipRiskMeter"] =>
  buildFlipRiskMeterStateInternal(regimeDistance);

/*
 * The operating latitude's move, in a sentence about the number. It was "This
 * week's guidance is unchanged." whenever the latitude did not move, and the
 * latitude is a blend of the two scores: it stayed flat on weeks one score
 * crossed a pause line, so the sentence said the guidance held beside guidance
 * that had changed. Whether it changed is `guidanceChange`.
 *
 * A replayed month is not "this week": it reads as the move against its own
 * earlier month-end, dated by it ("Operating latitude down since Feb 28."), and
 * as no comparison where the record starts. A live week with nothing to compare
 * says so rather than "unchanged".
 */
const buildLeadershipShorthandLine = (
  boldnessDelta: number | null,
  basis: ComparisonBasis,
  historical: boolean,
) => {
  if (boldnessDelta === null || (historical && !basis.date)) {
    return historical ? "No earlier month-end to compare with." : "No previous week to compare.";
  }
  return getNetDeltaLabel(boldnessDelta, basis);
};

export const buildHomeBriefModelInternal = (
  data: HomeReportData,
  options?: {
    overlaySector?: SectorKey;
    startupVariantMode?: StartupVariantPolicy["selectedMode"];
    runwayBand?: RunwayBand;
    runwayMonths?: number;
  },
) => {
  const {
    assessment,
    regimeAlert,
    stopItems,
    reportDynamics,
    recordDateLabel,
    macroSeries,
    forecast,
    historicalAnalogs,
    fetchedAtLabel,
    historicalSelection,
    regimeSeries,
    treasuryProvenance,
    treasury,
    actionNowShort,
    guardrailThreshold,
    flipThreshold,
    postureState,
  } = data;
  const overlaySector = options?.overlaySector ?? "b2b-saas";
  // The selected mode drives the pill highlight and defaults to series-a for
  // display. Stage-scoped copy is applied only when the operator explicitly
  // picked a stage, so an untouched brief keeps its canonical action line.
  const startupVariantMode = options?.startupVariantMode ?? "series-a";
  const explicitStartupVariantMode = options?.startupVariantMode;
  const runwayBand = options?.runwayBand;
  const runwayMonths = options?.runwayMonths;
  const runwayCalibrated = resolveRunwayBand(runwayBand, runwayMonths) !== null;
  const previousRegime = regimeAlert?.previousRegime;
  const severityDelta = previousRegime
    ? REGIME_SEVERITY_RANK[assessment.regime] - REGIME_SEVERITY_RANK[previousRegime]
    : 0;

  /* "No worse than last week" needs a last week. The severity delta is 0 both
     when the regime held and when there is nothing to compare it to, and this
     rendered the comparative sentence for both — including onto the OG share
     card, which is the version of this line that travels furthest.
     The comparison is last week's brief or the previous month-end, so a week
     that records its date says "since Sep 29" (`comparisonBasis`) and one that
     does not keeps "than last week". */
  const basis = comparisonBasis(reportDynamics?.comparedWith);
  const againstPrevious = basis.date ? basis.since : "than last week";
  const postureDeltaLabel =
    reportDynamics?.directionLabel === "unavailable"
      ? "No previous week to compare"
      : severityDelta > 0
        ? `Worse ${againstPrevious}`
        : severityDelta < 0
          ? `Better ${againstPrevious}`
          : `No worse ${againstPrevious}`;

  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessGap = Math.abs(assessment.scores.tightness - tightnessThreshold);
  const riskGap = Math.abs(assessment.scores.riskAppetite - riskThreshold);
  const nearestThresholdGap = resolveDistanceToFlip({
    scores: assessment.scores,
    thresholds: assessment.thresholds,
  });
  const isFallbackData = isSavedCopy(treasury) && !historicalSelection;
  const recordDateAgeHours = isFallbackData && treasury?.record_date
    ? Math.max(0, (Date.now() - Date.parse(`${treasury.record_date}T00:00:00.000Z`)) / 3_600_000)
    : 0;
  const { label: confidenceLabel, percent: confidencePercent } = resolvePublishedConfidence({
    assessment,
    record: treasury,
    historical: Boolean(historicalSelection),
  });
  /* What every surface prints as "could change next week" — the brief's trust
     line, the memo, the change-watch row, the exports — so it is the trust
     strip's rule, not a second one (`couldCallChangeNextWeek`). */
  const transitionWatch: "ON" | "OFF" = couldCallChangeNextWeek(assessment) ? "ON" : "OFF";
  const signalConfidenceReason = buildSignalConfidenceReason({
    confidenceLabel,
    nearestThresholdGap,
    changedSignals: reportDynamics?.changedSignals ?? [],
  });
  const trendLabel =
    reportDynamics?.directionLabel === "improving"
      ? "Improving"
      : reportDynamics?.directionLabel === "deteriorating"
        ? "Deteriorating"
        : reportDynamics?.directionLabel === "mixed"
          ? "Mixed"
          : reportDynamics?.directionLabel === "unavailable"
            ? "Not compared"
            : "Stable";
  const weeklyDeltaBySignal = new Map(
    (reportDynamics?.changedSignals ?? []).map((item) => [item.key, item.delta]),
  );
  /* The earlier reading's two scores, through the derivation every paste shares;
     null when nothing was compared. The operating latitude's move and the
     decision movement below both read it. The latitude's earlier reading used to
     exist only when a regime alert did, which needs a change line crossed, so
     every other week printed "no change" for a number that had moved
     (§1.1.26's "found, not changed"). */
  const previousReading = previousScoresFromDynamics(reportDynamics, {
    tightness: assessment.scores.tightness,
    riskAppetite: assessment.scores.riskAppetite,
  });
  const previousAssessment = previousReading
    ? {
        regime: previousRegime ?? assessment.regime,
        scores: { tightness: previousReading.tightness, riskAppetite: previousReading.riskAppetite },
      }
    : null;
  const postureTrajectory: PostureTrajectoryState = {
    current: {
      tightness: assessment.scores.tightness,
      riskAppetite: assessment.scores.riskAppetite,
    },
    previous: {
      tightness: assessment.scores.tightness - (weeklyDeltaBySignal.get("tightness") ?? 0),
      riskAppetite: assessment.scores.riskAppetite - (weeklyDeltaBySignal.get("riskAppetite") ?? 0),
    },
    weeklyDelta: {
      tightness: weeklyDeltaBySignal.get("tightness") ?? 0,
      riskAppetite: weeklyDeltaBySignal.get("riskAppetite") ?? 0,
    },
    thresholds: {
      tightness: tightnessThreshold,
      riskAppetite: riskThreshold,
    },
  };
  const weeklyLeadershipSummary = buildWeeklyLeadershipBriefModel({
    assessment,
    previousAssessment,
    last4Boldness: [],
    hiringTrendDelta: (weeklyDeltaBySignal.get("riskAppetite") ?? 0) - (weeklyDeltaBySignal.get("tightness") ?? 0),
    stabilityWeeks: transitionWatch === "ON" ? 1 : 2,
  });
  const operatingStanceLine = buildOperatingStanceLine({
    severityDelta,
    directionLabel: reportDynamics?.directionLabel,
    currentRegime: assessment.regime,
  });
  const refusal = assessment.policyAssessment?.refusal;
  const policyOverrideReason = refusal?.reasons?.[0] ?? null;
  /* The held guidance for the reason this week is held, from the table the
     weekly contract and the cadence cards read, so the three say the same. */
  const policyHold = refusal?.refused ? describePolicyHold(refusal) : null;
  const effectiveOperatingStanceLine = policyHold
    ? policyHold.currentCall
    : operatingStanceLine;

  const failureModes: HomeBriefTrustWarning[] = buildTrustWarnings({
    confidenceLabel,
    transitionWatch,
    freshnessLabel: fetchedAtLabel ?? "Unavailable",
    isFallbackSnapshot: isSavedCopy(treasury) && !historicalSelection,
    provenanceStatusLabel: treasuryProvenance?.statusLabel,
    changedSignals: reportDynamics?.changedSignals ?? [],
    anomalySignals: reportDynamics?.anomalySignals ?? [],
  });
  const revisitDecisions = (reportDynamics?.changedSignals.length ?? 0) > 0 && reportDynamics?.directionLabel !== "stable";
  const decisionReadiness = buildDecisionReadinessState({
    confidenceLabel,
    freshnessState: {
      updatedAtLabel: fetchedAtLabel ?? "Unavailable",
      freshnessStatus: isFallbackData
        ? recordDateAgeHours > FRESH_FALLBACK_HOURS ? "stale" : "fresh"
        : treasury?.fetched_at
          ? "fresh"
          : "unknown",
      mode: historicalSelection
        ? "historical"
        : isSavedCopy(treasury)
          ? "cached"
          : "live",
      timestamp: treasury?.fetched_at ?? null,
      ageHours: treasury?.fetched_at
        ? Math.max(0, (Date.now() - Date.parse(treasury.fetched_at)) / 3_600_000)
        : null,
    },
    isFallbackSnapshot: isSavedCopy(treasury) && !historicalSelection,
    isHistoricalSelection: Boolean(historicalSelection),
    policyHold,
  });

  const displayRegime = getRegimeDisplayLabel({
    regime: assessment.regime,
    momentum: (reportDynamics?.directionLabel ?? "stable") as RegimeMomentum,
    confidence: confidenceLabel,
    transitionWatch: transitionWatch === "ON",
  });

  const regimeFlipState = buildRegimeFlipState({
    regime: assessment.regime,
    scores: assessment.scores,
    thresholds: assessment.thresholds,
    regimeTransition: assessment.regimeTransition,
  });
  const reversalTrigger = regimeFlipState.text;

  // "Points to flip" measures the line worth watching, from the flip state —
  // which is the nearest unsatisfied boundary when the call and readings agree,
  // and the line that changes the flip target when a quadrant change is
  // pending. Measuring the satisfied boundary instead reported points to a
  // crossing that had already happened.
  const regimeDistance =
    regimeFlipState.watch.dimension === "tightness"
      ? {
          dimensionLabel: regimeSignalLabel.tightness,
          dimensionKey: "tightness" as const,
          currentValue: assessment.scores.tightness,
          thresholdValue: regimeFlipState.watch.threshold,
          pointsToFlip: Math.abs(regimeFlipState.watch.threshold - assessment.scores.tightness),
          thresholdDirection: regimeFlipState.watch.direction,
        }
      : {
          dimensionLabel: regimeSignalLabel.riskAppetite,
          dimensionKey: "riskAppetite" as const,
          currentValue: assessment.scores.riskAppetite,
          thresholdValue: regimeFlipState.watch.threshold,
          pointsToFlip: Math.abs(regimeFlipState.watch.threshold - assessment.scores.riskAppetite),
          thresholdDirection: regimeFlipState.watch.direction,
        };

  const likelyTransitionTarget = toForecastLabel(resolvePrimaryShiftRegimeKey(assessment.regime));
  const regimeVelocity: TransitionVelocityEstimate = getTransitionVelocityEstimate({
    from: toForecastLabel(assessment.regime),
    to: likelyTransitionTarget,
  });

  const historicalTimeline = buildHistoricalTimeline({ currentRegime: assessment.regime, regimeSeries, historicalSelection });

  const normalizedHistoricalAnalogs: HomeBriefHistoricalAnalog[] = (historicalAnalogs ?? [])
    .slice(0, 3)
    .map((analog) => ({
      date: analog.recordDate,
      similarityScore: analog.score,
      implication: analog.implication,
    }));

  const decisionRules = buildCanonicalBoundedDecisionRules({
    regime: assessment.regime,
    thresholds: assessment.thresholds,
    scores: assessment.scores,
  });
  const guardrail = guardrailThreshold
    ?? stopItems[0]
    ?? decisionRules[0]?.pauseTrigger
    ?? NO_LIVE_READING_CALL.pauseIf;
  const startupVariantPolicy: StartupVariantPolicy = {
    selectedMode: startupVariantMode,
    options: startupVariantModes,
    adjustmentsByMode: {
      seed: buildScopedVariantDecisionAdjustment({ mode: "seed", thresholds: assessment.thresholds, scores: assessment.scores, runwayBand, runwayMonths }),
      "series-a": buildScopedVariantDecisionAdjustment({ mode: "series-a", thresholds: assessment.thresholds, scores: assessment.scores, runwayBand, runwayMonths }),
      "series-b": buildScopedVariantDecisionAdjustment({ mode: "series-b", thresholds: assessment.thresholds, scores: assessment.scores, runwayBand, runwayMonths }),
      growth: buildScopedVariantDecisionAdjustment({ mode: "growth", thresholds: assessment.thresholds, scores: assessment.scores, runwayBand, runwayMonths }),
      public: buildScopedVariantDecisionAdjustment({ mode: "public", thresholds: assessment.thresholds, scores: assessment.scores, runwayBand, runwayMonths }),
      bootstrapped: buildScopedVariantDecisionAdjustment({ mode: "bootstrapped", thresholds: assessment.thresholds, scores: assessment.scores, runwayBand, runwayMonths }),
    },
  };
  const roleAwareTemplates = buildRoleAwareOperatingTemplates(decisionRules);
  const currentScores = {
    tightness: assessment.scores.tightness,
    tightnessPressure: assessment.scores.tightnessPressure,
    tightnessSaturated: assessment.scores.tightnessSaturated,
    riskAppetite: assessment.scores.riskAppetite,
  };
  const actionStripItems = buildActionStripItems(decisionRules, currentScores);
  const sharedFlipCorridor = formatSharedFlipCorridor(decisionRules);
  const executiveOperationalStance = extractExecutiveOperationalStance({ roleAwareTemplates, decisionRules });

  /* A held week's action is the hold's (`POLICY_OVERRIDE_CALL`), the sentence the
     pastes print. This said "Slow approvals, require reversible bets, and cap new
     experiments until …" on the page while every paste said the reason's own. */
  const conciseActionNow = policyHold
    ? policyHold.actionNow
    : (explicitStartupVariantMode || runwayCalibrated)
      ? startupVariantPolicy.adjustmentsByMode[startupVariantMode]?.doNowAdjustments[0]?.trim()
        || actionNowShort?.trim()
      : actionNowShort?.trim();
  const canonicalFlipConditions: CanonicalFlipCondition[] = decisionRules.flatMap((rule) =>
    rule.flipConditions.map((condition) => ({
      area: rule.area,
      metric: condition.metric,
      operator: condition.operator,
      value: condition.value,
      label: condition.label,
    })),
  );
  const compactFlipConditionLabels = canonicalFlipConditions
    .map((condition) => condition.label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  /* Both lines, from the reading itself, when the caller passed neither: a read
     built without the report's sentence (the stored operating snapshot, which
     the slide and the Monday sends print) fell through to the nearest line
     alone, so the slide's "Conditions change if" named one line where the
     homepage named two. A held week's is the hold's own condition, as the
     weekly contract's is (`buildWeekCallChangesIf`): this said the two lines,
     so on a held week /api/decision's memo and shift summary printed
     "Conditions change if: Funding pressure rises 25 pts to clear 70 (45 today)
     or risk appetite falls 12 pts to 50 or below (62 today)." beside a trigger
     that said "The two scores point the same way for a second reading". */
  const conciseFlipThreshold = policyHold
    ? policyHold.callChangesIf
    : postureState?.whatFlipsNext.flipTrigger?.trim()
      || flipThreshold?.trim()
      || buildFlipThreshold(assessment)
      || reversalTrigger
      || compactFlipConditionLabels[0];
  const decisionMatrix = buildDecisionMatrixPayload({
    regime: assessment.regime,
    thresholds: assessment.thresholds,
    decisionRules,
    confidenceDegraded: confidenceLabel === "LOW",
    freshnessDegraded: isFallbackData && recordDateAgeHours > FRESH_FALLBACK_HOURS,
  });
  /* What the week did to the decisions: which areas' lines were crossed since the
     reading the week is compared with. Null with no comparison, and every sentence
     below that says what changed reads it instead of naming a direction. */
  const decisionMovement = buildDecisionMovement({
    scores: { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite },
    previous: previousReading,
    thresholds: assessment.thresholds,
    regime: assessment.regime,
    areas: areaLinesFromRules(decisionRules),
  });
  /* What the week did to the guidance, for every line that says nothing changed:
     the conditions word, then the pause and resume lines, never the latitude. */
  const guidanceChange = describeGuidanceChange({
    movement: decisionMovement,
    regimeChanged: reportDynamics?.regimeChanged,
  });
  /* The week's direction by the headline's rule (`resolveWeeklyTone`): an
     improving week holds while a pause line is met. A held week's headline is
     the hold, which states no direction, so the model's `weeklyTone` is null
     there; the memo still says what the readings did. */
  const comparisonTone = reportDynamics
    ? resolveWeeklyTone({
        directionLabel: reportDynamics.directionLabel,
        regimeChanged: reportDynamics.regimeChanged === true,
        ...(reportDynamics.previousRegime ? { previousRegime: reportDynamics.previousRegime } : {}),
        regime: assessment.regime,
        pauseApplies: anyPauseLineMet(actionStripItems, assessment.scores),
      })
    : null;
  const weeklyMemoLead = describeWeeklyMemoLead(trendLabel, comparisonTone);
  const weeklyMovement = buildWeeklyMovementMetric({
    severityDelta,
    changedSignals: reportDynamics?.changedSignals ?? [],
    directionLabel: reportDynamics?.directionLabel,
    basis,
    movementSentence: decisionMovement?.sentence,
  });
  const revisitQueue = buildRevisitQueue({
    revisitDecisions,
    decisionRules,
    reportDynamics,
  });

  const regimeSignalIndicators = buildRegimeSignalIndicators({
    assessment,
    reportDynamics,
    macroSeries,
  });
  const inputInfluence = buildInputInfluenceItems({
    assessment,
    reportDynamics,
    regimeSignalIndicators,
  });

  const pressureLine =
    severityDelta > 0
      ? "Pressure is rising."
      : severityDelta < 0
        ? "Pressure eased."
        : "Conditions held.";
  const netConstraintSummary = joinSentences(
    displayRegime.label,
    pressureLine,
    conciseActionNow || decisionRules[0]?.doNow[0] || "Last week's hiring, roadmap, and spend guidance stands",
    conciseFlipThreshold,
  );

  return {
    postureLabel: displayRegime.label,
    postureWithStageLabel: formatRegimeWithDuration({
      label: displayRegime.label,
      currentRegime: assessment.regime,
      regimeSeries,
      historicalSelection,
    }),
    /* Never the posture state's own: that contract reads the same function, and
       preferring it is how /operate and /trust said Medium where / said High. */
    confidenceLabel,
    confidencePercent,
    /* The stored reason, which leads with the same code as the hold. It fell
       back to "The two scores disagree, or too many inputs are missing", which
       named two reasons for a hold that has one; a refusal always stores it. */
    signalConfidenceReason: policyHold
      ? joinSentences(
          signalConfidenceReason,
          "The guidance is also being held this week",
          policyOverrideReason,
        )
      : signalConfidenceReason,
    regimeHeader: {
      regime: displayRegime.label,
      confidence: formatConfidencePlainLabel(confidenceLabel),
      primaryRisk: buildPrimaryRiskLabel({
        failureModes,
        changedSignals: reportDynamics?.changedSignals ?? [],
      }),
    },
    trendLabel,
    weeklyTone: policyHold ? null : comparisonTone,
    regimeSignalIndicators,
    inputInfluence,
    postureTrajectory,
    currentScores,
    operatingStanceLine: effectiveOperatingStanceLine,
    /* Kept apart so the card model can build the memo again around the weekly
       contract's call (`buildWeeklyDecisionCardViewModel`). */
    weeklyMemoLead,
    weeklyMemoLines: buildWeeklyMemoLines({
      lead: weeklyMemoLead,
      operatingStanceLine: effectiveOperatingStanceLine,
      transitionWatch,
      pauseIf: guardrail,
      callChangesIf: conciseFlipThreshold,
    }),
    regimeDistance,
    regimeVelocity,
    decisionShiftSummary: buildDecisionShiftSummary({
      severityDelta,
      directionLabel: reportDynamics?.directionLabel,
      changeCount: reportDynamics?.changedSignals.length ?? 0,
      reversalTrigger: conciseFlipThreshold,
      movementSentence: decisionMovement?.sentence,
    }),
    /* The same sentence without its change clause, for every surface that prints
       its own change line beside it. */
    decisionShiftHeadline: buildDecisionShiftSummary({
      severityDelta,
      directionLabel: reportDynamics?.directionLabel,
      changeCount: reportDynamics?.changedSignals.length ?? 0,
      movementSentence: decisionMovement?.sentence,
    }),
    weeklyMovement,
    decisionMovement,
    transitionProbabilities: forecast?.next4WeekProbabilities ?? {
      Expansion: 25,
      Mixed: 25,
      Scarcity: 25,
      Defensive: 25,
    },
    decisionRules,
    startupVariantPolicy,
    decisionMatrix,
    actionStripItems,
    sharedFlipCorridor,
    roleAwareTemplates,
    executiveOperationalStance,
    revisitDecisions,
    revisitQueue,
    decisionReadiness,
    weeklyLeadershipSummary: {
      boldnessScore: weeklyLeadershipSummary.boldnessScore,
      boldnessDelta: previousAssessment ? weeklyLeadershipSummary.boldnessDelta : null,
      guidanceChange,
      shorthandLine: buildLeadershipShorthandLine(
        previousAssessment ? weeklyLeadershipSummary.boldnessDelta : null,
        basis,
        Boolean(historicalSelection),
      ),
      ...(reportDynamics?.comparedWith ? { comparedWith: reportDynamics.comparedWith } : {}),
    },
    guardrail,
    actionNowShort: conciseActionNow,
    guardrailThreshold: guardrail,
    flipThreshold: conciseFlipThreshold,
    lastCommittedChangeEvent: postureState?.lastCommittedChangeEvent ?? null,
    canonicalFlipConditions,
    compactFlipConditionLabels,
    historicalAnalogs: normalizedHistoricalAnalogs,
    memoryRail: buildMemoryRail(recordDateLabel, assessment.regime),
    historicalTimeline,
    lastYearComparison: data.lastYearComparison ?? null,
    macroOverlay: buildMacroOverlay(macroSeries, assessment, overlaySector),
    evidenceItems: data.reportEvidenceItems ?? [],
    netConstraintSummary,
    postureDeltaLabel,
    reversalTrigger: conciseFlipThreshold,
    transitionWatch,
    failureModes,
    sinceLastReview: buildStartRouteDeltaBlock({
      currentRegime: assessment.regime,
      regimeAlert,
      reportDynamics,
      evidenceItems: data.reportEvidenceItems ?? [],
      guardrail,
      reversalTrigger: conciseFlipThreshold,
      failureModes,
      trendLabel,
      historicalTimeline,
      heldDecision: decisionRules[0]?.doNow[0] ?? effectiveOperatingStanceLine,
    }),
    whyThisCall: buildWhyThisCall({
      tightnessGap,
      riskGap,
      tightnessNow: assessment.scores.tightness,
      riskNow: assessment.scores.riskAppetite,
      tightnessThreshold: assessment.thresholds.tightnessRegime,
      riskThreshold: assessment.thresholds.riskAppetiteRegime,
      tightnessDirection: boundaryDirectionForRegime(assessment.regime, "tightness"),
      riskDirection: boundaryDirectionForRegime(assessment.regime, "riskAppetite"),
      reportDynamics,
      transitionWatch,
      pendingFlipDetail: regimeFlipState.pendingCandidate
        ? `A move to ${getRegimePublicLabel(regimeFlipState.pendingCandidate)} is already pending — conditions hold where they are while the change waits on confirmation. The line that would change where it lands: ${regimeSignalLabel[regimeFlipState.watch.dimension]} ${regimeFlipState.watch.direction === "riseAbove" ? "rising above" : "falling to or below"} ${formatThresholdNumber(regimeFlipState.watch.threshold)}.`
        : undefined,
    }),
  };
};

export const buildWeeklyDecisionCardViewModelInternal = ({
  homeBriefModel,
  statusLabel,
  regimeKey,
  reportDynamics,
  citation,
  recordDateLabel,
  fetchedAtLabel,
  freshnessLine,
  confidenceHistory,
  confidenceTrend,
  canonicalDecisionCopy,
  isFallbackSnapshot,
  weeklyCall,
}: {
  homeBriefModel: ReturnType<typeof buildHomeBriefModelInternal>;
  statusLabel: string;
  regimeKey?: WeeklyDecisionCardViewModel["status"]["regimeKey"];
  reportDynamics: ReportDynamics;
  citation: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
  freshnessLine?: string;
  confidenceHistory?: WeeklyDecisionCardViewModel["status"]["confidenceHistory"];
  confidenceTrend?: WeeklyDecisionCardViewModel["status"]["confidenceTrend"];
  canonicalDecisionCopy?: WeeklyDecisionCardViewModel["decision"]["canonicalDecisionCopy"];
  isFallbackSnapshot?: boolean;
  weeklyCall?: WeeklyCallContract;
}): WeeklyDecisionCardViewModel => {
  const immediateDecision = weeklyCall?.actionNow
    ?? canonicalDecisionCopy?.doNowLines[0]
    ?? homeBriefModel.actionNowShort?.trim()
    ?? (homeBriefModel.revisitDecisions
      ? "Revise hiring and roadmap plans now."
      : "Hold last week's operating rules.");
  const whyItMattersLine = buildWhyItMattersLine({
    weeklyMovement: homeBriefModel.weeklyMovement,
  });
  const readThisCardItems = buildReadThisCardItems({
    decisionShiftSummary: homeBriefModel.decisionShiftHeadline,
    immediateDecision,
    reversalTrigger: weeklyCall?.callChangesIf ?? homeBriefModel.reversalTrigger,
  });

  return {
    status: {
      statusLabel,
      regimeKey,
      postureLabel: homeBriefModel.postureLabel,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      postureDelta: homeBriefModel.postureDeltaLabel,
      confidenceLabel: homeBriefModel.confidenceLabel,
      confidencePercent: homeBriefModel.confidencePercent,
      signalConfidenceReason: homeBriefModel.signalConfidenceReason,
      regimeHeader: homeBriefModel.regimeHeader,
      trendLabel: homeBriefModel.trendLabel,
      weeklyTone: homeBriefModel.weeklyTone,
      confidenceHistory,
      confidenceTrend,
      transitionWatch: homeBriefModel.transitionWatch,
      isFallbackSnapshot,
    },
    decision: {
      operatingStanceLine: weeklyCall?.currentCall ?? homeBriefModel.operatingStanceLine,
      /* The memo around the contract's call, pause line and "Conditions change if",
         as every paste prints them; the home model's own call can come from another
         branch of the stance rule than the stored contract's. */
      weeklyMemoLines: weeklyCall
        ? buildWeeklyMemoLines({
            lead: homeBriefModel.weeklyMemoLead,
            operatingStanceLine: weeklyCall.currentCall,
            transitionWatch: homeBriefModel.transitionWatch,
            pauseIf: weeklyCall.pauseIf,
            callChangesIf: weeklyCall.callChangesIf,
          })
        : homeBriefModel.weeklyMemoLines,
      netConstraintSummary: homeBriefModel.netConstraintSummary,
      guardrail: weeklyCall?.pauseIf ?? homeBriefModel.guardrail,
      reversalTrigger: weeklyCall?.callChangesIf ?? homeBriefModel.reversalTrigger,
      ...(weeklyCall?.resumeWhen ? { resumeWhen: weeklyCall.resumeWhen } : {}),
      actionNowShort: homeBriefModel.actionNowShort,
      immediateDecision,
      guardrailThreshold: weeklyCall?.pauseIf ?? homeBriefModel.guardrailThreshold,
      flipThreshold: weeklyCall?.callChangesIf ?? homeBriefModel.flipThreshold,
      compactFlipConditionLabels: weeklyCall?.flipConditionLabels ?? homeBriefModel.compactFlipConditionLabels,
      canonicalDecisionCopy,
      canonicalFlipConditions: homeBriefModel.canonicalFlipConditions,
      reportDynamics,
      decisionShiftSummary: weeklyCall
        ? appendCallChangesIf(homeBriefModel.decisionShiftHeadline, weeklyCall.callChangesIf)
        : homeBriefModel.decisionShiftSummary,
      decisionShiftHeadline: homeBriefModel.decisionShiftHeadline,
      transitionProbabilities: homeBriefModel.transitionProbabilities,
      decisionRules: homeBriefModel.decisionRules,
      decisionMatrix: homeBriefModel.decisionMatrix,
      startupVariantPolicy: homeBriefModel.startupVariantPolicy,
      actionStripItems: homeBriefModel.actionStripItems,
      sharedFlipCorridor: homeBriefModel.sharedFlipCorridor,
      roleAwareTemplates: homeBriefModel.roleAwareTemplates,
      executiveOperationalStance: homeBriefModel.executiveOperationalStance,
      revisitDecisions: homeBriefModel.revisitDecisions,
      revisitQueue: homeBriefModel.revisitQueue,
      decisionReadiness: homeBriefModel.decisionReadiness,
      weeklyLeadershipSummary: homeBriefModel.weeklyLeadershipSummary,
      weeklyMovement: homeBriefModel.weeklyMovement,
      decisionMovement: homeBriefModel.decisionMovement,
    },
    presentation: {
      whyItMattersLine,
      readThisCardItems,
    },
    diagnostics: {
      regimeSignalIndicators: homeBriefModel.regimeSignalIndicators,
      inputInfluence: homeBriefModel.inputInfluence,
      postureTrajectory: homeBriefModel.postureTrajectory,
      currentScores: homeBriefModel.currentScores,
      regimeDistance: homeBriefModel.regimeDistance,
      flipRiskMeter: buildFlipRiskMeterState(homeBriefModel.regimeDistance),
      regimeVelocity: homeBriefModel.regimeVelocity,
      whyThisCall: homeBriefModel.whyThisCall,
      evidenceItems: homeBriefModel.evidenceItems,
      failureModes: homeBriefModel.failureModes,
    },
    history: {
      memoryRail: homeBriefModel.memoryRail,
      historicalTimeline: homeBriefModel.historicalTimeline,
      historicalAnalogs: homeBriefModel.historicalAnalogs,
      lastYearComparison: homeBriefModel.lastYearComparison,
      macroOverlay: homeBriefModel.macroOverlay,
    },
    sinceLastReview: homeBriefModel.sinceLastReview,
    artifact: {
      citation,
      recordDateLabel,
      fetchedAtLabel,
      freshnessLine,
    },
  };
};
