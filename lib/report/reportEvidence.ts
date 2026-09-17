import { DEFAULT_THRESHOLDS, buildSignalInfluence, evaluateRegime } from "../regimeEngine";
import { getPlaybookGuidance } from "../playbook";
import { buildCanonicalBoundedDecisionRules } from "./boundedDecisionRules";
import { resolveSignalDirection, signalOrder } from "./briefFormatting";
import { formatBoundaryDistance, formatConfidencePlainLabel } from "./reportFormatting";
import { formatScoreValue } from "../formatters";
import { regimeSignalLabel } from "./signalTranslations";
import { normalizeSignalContributions } from "./signalFormatting";
import { buildActionStripItems } from "./operatingCalls";
import type {
  ReportDynamics,
  ReportEvidenceItem,
} from "./reportDataTypes";
import type { RegimeKey } from "../regimeEngine";

type WeeklyTone = "tightening" | "easing" | "holding";

// The headline is the week's direction applied to the regime's posture. It used
// to ignore the regime, so a Sunny week that softened a little read "freeze new
// commitments" above a card that said scale proven bets — the two surfaces
// disagreed about the same call. Direction picks the row; regime picks the verb.
const ACTION_NOW_BY_REGIME: Record<RegimeKey, Record<WeeklyTone, string>> = {
  EXPANSION: {
    tightening: "Conditions tightening — keep proven bets moving, but stage anything new.",
    easing: "Conditions easing — scale proven bets with milestone gates.",
    holding: "Conditions holding — keep scaling proven bets at the current pace.",
  },
  VOLATILE: {
    tightening: "Conditions tightening — keep only reversible bets and cap concurrent experiments.",
    easing: "Conditions easing — reopen staged bets one tranche at a time.",
    holding: "Conditions holding — run reversible bets with named rollback owners.",
  },
  DEFENSIVE: {
    tightening: "Conditions tightening — freeze new commitments and keep spend flexible.",
    easing: "Conditions easing — resume paused work with clear milestones.",
    holding: "Conditions holding — continue at current pace with measurable outcomes.",
  },
  SCARCITY: {
    tightening: "Conditions tightening — freeze new commitments and protect runway.",
    easing: "Conditions easing — resume paused work with clear milestones.",
    holding: "Conditions holding — hold spend flat and require short paybacks.",
  },
};

export const buildActionNowShort = ({
  directionLabel,
  regimeChanged,
  regime = "DEFENSIVE",
}: Pick<ReportDynamics, "directionLabel" | "regimeChanged"> & { regime?: RegimeKey }): string => {
  const tone: WeeklyTone =
    directionLabel === "improving"
      ? "easing"
      : regimeChanged || directionLabel === "deteriorating"
        ? "tightening"
        : "holding";
  return ACTION_NOW_BY_REGIME[regime][tone];
};

export const buildGuidanceBundleFromAssessment = (assessment: ReturnType<typeof evaluateRegime>) => {
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime, {
    thresholds: assessment.thresholds,
    scores: assessment.scores,
  });
  const actionStripItems = buildActionStripItems(
    buildCanonicalBoundedDecisionRules({
      regime: assessment.regime,
      thresholds: assessment.thresholds,
      scores: assessment.scores,
    }),
  );

  return {
    playbook,
    startItems,
    stopItems,
    actionStripItems,
  };
};

/**
 * The conditions that would flip the current call, as one bounded condition.
 *
 * This used to return three sentences: a status ("No flip condition is tripped
 * yet.") followed by two that each repeated "flips this call". Every slot that
 * renders it already carries that verb in its label — "Reversal:", "This
 * recommendation breaks if:" — so the sentence spent its first clause saying
 * what the label said and its next two repeating each other. Worse, the
 * compaction helpers cut a phrase at its first period, so the Slack export of a
 * frozen brief read "Re-open when: No flip condition is tripped yet." and
 * carried no threshold at all.
 *
 * One sentence now, both boundaries, each with its live reading in parentheses.
 * A boundary already crossed says so in place of the status preamble, and sorts
 * first, because that is the half an operator has to act on.
 */
export const buildFlipThreshold = (assessment: ReturnType<typeof evaluateRegime>): string => {
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessNow = assessment.scores?.tightness;
  const riskNow = assessment.scores?.riskAppetite;

  const conditionText = ({
    label,
    now,
    threshold,
    direction,
  }: {
    label: "Funding pressure" | "Risk appetite";
    now: number;
    threshold: number;
    direction: "riseAbove" | "fallToOrBelow";
  }) => {
    const boundary = direction === "riseAbove"
      ? `above ${formatScoreValue(threshold)}`
      : `at or below ${formatScoreValue(threshold)}`;

    if (typeof now !== "number" || !Number.isFinite(now)) {
      return { text: `${label} ${boundary}`, tripped: false };
    }

    const tripped = direction === "riseAbove" ? now > threshold : now <= threshold;

    return {
      text: tripped
        ? `${label} ${boundary} (already true at ${formatScoreValue(now)})`
        : `${label} ${boundary} (${formatScoreValue(now)} today)`,
      tripped,
    };
  };

  const tightnessDirection: "riseAbove" | "fallToOrBelow" =
    assessment.regime === "SCARCITY" || assessment.regime === "DEFENSIVE" ? "fallToOrBelow" : "riseAbove";
  const riskDirection: "riseAbove" | "fallToOrBelow" =
    assessment.regime === "SCARCITY" || assessment.regime === "VOLATILE" ? "riseAbove" : "fallToOrBelow";

  const conditions = [
    conditionText({ label: "Funding pressure", now: tightnessNow, threshold: tightnessThreshold, direction: tightnessDirection }),
    conditionText({ label: "Risk appetite", now: riskNow, threshold: riskThreshold, direction: riskDirection }),
  ];

  // Stable sort: a crossed boundary leads, otherwise the declared order holds.
  const ordered = [...conditions].sort((a, b) => Number(b.tripped) - Number(a.tripped));

  // Signal names are capitalized as labels but sit mid-sentence after "or" here,
  // matching how the bounded rules already write them in prose.
  return `${ordered
    .map((condition, index) =>
      index === 0 ? condition.text : condition.text.charAt(0).toLowerCase() + condition.text.slice(1),
    )
    .join(" or ")}.`;
};

const signalAnomalyThresholds: Record<ReportDynamics["changedSignals"][number]["key"], number> = {
  tightness: 90,
  riskAppetite: 50,
  baseRate: 1.5,
  curveSlope: 1,
};

export const signalDeltaImprovesWhen: Record<ReportDynamics["changedSignals"][number]["key"], "positive" | "negative"> = {
  tightness: "negative",
  riskAppetite: "positive",
  baseRate: "negative",
  curveSlope: "positive",
};

export const isImprovingSignalDelta = (
  key: ReportDynamics["changedSignals"][number]["key"],
  delta: number,
): boolean => (signalDeltaImprovesWhen[key] === "positive" ? delta > 0 : delta < 0);

const resolveSignalInfluence = (assessment: ReturnType<typeof evaluateRegime>) =>
  normalizeSignalContributions(
    assessment.signalInfluence ??
      buildSignalInfluence({
        tightness: assessment.scores.tightness,
        riskAppetite: assessment.scores.riskAppetite,
        baseRate: assessment.scores.baseRate,
        curveSlope: assessment.scores.curveSlope,
        thresholds: (assessment as { thresholds?: typeof DEFAULT_THRESHOLDS }).thresholds ?? DEFAULT_THRESHOLDS,
      }),
  );

const signalLabels: Record<ReportDynamics["changedSignals"][number]["key"], string> = regimeSignalLabel;

/* Only `tightness` has an evidence-section title of its own; the rest are the
   canonical signal names. */
const evidenceTitleBySignal: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  ...regimeSignalLabel,
  tightness: "Capital conditions",
};

const EVIDENCE_SIGNAL_MAGNITUDE_HIGH = 3;
const EVIDENCE_SIGNAL_MAGNITUDE_MEDIUM = 1;

const toConfidenceLabel = (delta: number): "LOW" | "MED" | "HIGH" => {
  const magnitude = Math.abs(delta);
  if (magnitude >= EVIDENCE_SIGNAL_MAGNITUDE_HIGH) return "HIGH";
  if (magnitude >= EVIDENCE_SIGNAL_MAGNITUDE_MEDIUM) return "MED";
  return "LOW";
};

const signalImmediateImplication = (
  key: ReportDynamics["changedSignals"][number]["key"],
  delta: number,
  assessment: ReturnType<typeof evaluateRegime>,
) => {
  if (delta === 0) {
    return "No material operating change this week.";
  }

  if (key === "tightness") {
    return delta > 0
      ? "Tighten approvals and protect runway for fixed-cost commitments."
      : "Release selective approvals while keeping commitments reversible.";
  }

  if (key === "riskAppetite") {
    return delta > 0
      ? "Increase reversible experiments where payback stays visible."
      : "Bias toward proof-first launches and smaller bet sizes.";
  }

  if (key === "baseRate") {
    return delta > 0
      ? "Shorten payback windows before approving net-new spend."
      : "Maintain discipline while testing selective long-payback upside.";
  }

  const curveLine = assessment.scores.curveSlope ?? 0;
  const paybackCap = curveLine > 0 ? 12 : 9;
  return delta > 0
    ? `Allow projects up to ${paybackCap}-month payback only while the curve remains above 0.0% and funding pressure stays below ${formatScoreValue(assessment.thresholds.tightnessRegime)}.`
    : `Cap new projects at ${paybackCap}-month payback; reopen longer-payback work after the curve returns above 0.0% and funding pressure stays below ${formatScoreValue(assessment.thresholds.tightnessRegime)}.`;
};

export const buildReportEvidenceItems = ({
  reportDynamics,
  assessment,
  lastUpdated,
}: {
  reportDynamics: ReportDynamics;
  assessment: ReturnType<typeof evaluateRegime>;
  lastUpdated: string | null;
}): ReportEvidenceItem[] =>
  signalOrder.map((key) => {
    const movedSignal = reportDynamics.changedSignals.find((item) => item.key === key);
    const delta = movedSignal?.delta ?? 0;
    const direction = resolveSignalDirection(delta);
    const directionLabel =
      direction === "tightening" ? "Tightening" : direction === "easing" ? "Easing" : "Unchanged";

    const thresholdDistance =
      key === "tightness"
        ? Math.abs(assessment.scores.tightness - assessment.thresholds.tightnessRegime)
        : key === "riskAppetite"
          ? Math.abs(assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime)
          : null;

    const supportingBullets = [
      delta === 0
        ? "No measurable move against the prior snapshot."
        : `Moved ${delta > 0 ? "+" : ""}${delta.toFixed(1)} against the prior snapshot, ${direction === "tightening" ? "tightening" : "easing"} the read.`,
      thresholdDistance === null
        ? `${signalLabels[key]} feeds this week's call but carries no regime threshold of its own.`
        : formatBoundaryDistance({
            label: signalLabels[key],
            points: thresholdDistance,
            threshold: key === "tightness" ? assessment.thresholds.tightnessRegime : assessment.thresholds.riskAppetiteRegime,
          }),
    ];

    return {
      key,
      title: evidenceTitleBySignal[key],
      lastUpdated,
      supportingBullets,
      confidenceLabel: formatConfidencePlainLabel(toConfidenceLabel(delta)),
      directionLabel,
      immediateImplication: signalImmediateImplication(key, delta, assessment),
    };
  });

export const buildReportDynamics = ({
  current,
  previous,
}: {
  current: ReturnType<typeof evaluateRegime>;
  previous: ReturnType<typeof evaluateRegime> | null;
}): ReportDynamics => {
  if (!previous) {
    return {
      changedSignals: [],
      anomalySignals: [],
      totalSignalChanges: 0,
      regimeChanged: false,
      directionLabel: "stable",
      signalContributions: resolveSignalInfluence(current),
    };
  }

  const comparisons = [
    {
      key: "tightness" as const,
      label: signalLabels.tightness,
      delta: current.scores.tightness - previous.scores.tightness,
    },
    {
      key: "riskAppetite" as const,
      label: signalLabels.riskAppetite,
      delta: current.scores.riskAppetite - previous.scores.riskAppetite,
    },
    {
      key: "baseRate" as const,
      label: signalLabels.baseRate,
      delta: current.scores.baseRate - previous.scores.baseRate,
    },
    {
      key: "curveSlope" as const,
      label: signalLabels.curveSlope,
      delta: (current.scores.curveSlope ?? 0) - (previous.scores.curveSlope ?? 0),
    },
  ].filter((item) => Math.abs(item.delta) >= 0.01);

  const { anomalies, changes } = comparisons.reduce(
    (accumulator, item) => {
      const maxExpectedDelta = signalAnomalyThresholds[item.key];
      if (Math.abs(item.delta) > maxExpectedDelta) {
        accumulator.anomalies.push({
          ...item,
          reason: `Exceeded weekly sanity threshold of ±${maxExpectedDelta}.`,
        });
        return accumulator;
      }

      accumulator.changes.push(item);
      return accumulator;
    },
    {
      anomalies: [] as Array<{
        key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
        label: string;
        delta: number;
        reason: string;
      }>,
      changes: [] as typeof comparisons,
    },
  );

  const sortedChanges = changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const improvingMoves = sortedChanges.filter((item) => isImprovingSignalDelta(item.key, item.delta)).length;
  const deterioratingMoves = sortedChanges.filter((item) => !isImprovingSignalDelta(item.key, item.delta)).length;
  const directionLabel: ReportDynamics["directionLabel"] =
    sortedChanges.length === 0
      ? "stable"
      : improvingMoves > 0 && deterioratingMoves > 0
        ? "mixed"
        : improvingMoves > 0
          ? "improving"
          : "deteriorating";

  return {
    changedSignals: sortedChanges,
    anomalySignals: anomalies,
    totalSignalChanges: sortedChanges.length,
    regimeChanged: current.regime !== previous.regime,
    directionLabel,
    signalContributions: resolveSignalInfluence(current),
  };
};
