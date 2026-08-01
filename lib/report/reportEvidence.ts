import { DEFAULT_THRESHOLDS, buildSignalInfluence, evaluateRegime } from "../regimeEngine";
import { getPlaybookGuidance } from "../playbook";
import { buildCanonicalBoundedDecisionRules } from "./boundedDecisionRules";
import { resolveSignalDirection, signalOrder } from "./briefFormatting";
import { formatConfidencePlainLabel } from "./reportFormatting";
import { normalizeSignalContributions } from "./signalFormatting";
import { buildActionStripItems } from "./operatingCalls";
import type {
  ReportDynamics,
  ReportEvidenceItem,
} from "./reportDataTypes";

export const buildActionNowShort = ({
  directionLabel,
  regimeChanged,
}: Pick<ReportDynamics, "directionLabel" | "regimeChanged">): string => {
  if (regimeChanged || directionLabel === "deteriorating") {
    return "Conditions tightening — freeze new commitments and keep spend flexible.";
  }
  if (directionLabel === "improving") {
    return "Conditions easing — resume paused work with clear milestones.";
  }
  return "Conditions holding — continue at current pace with measurable outcomes.";
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

export const buildFlipThreshold = (assessment: ReturnType<typeof evaluateRegime>): string => {
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessNow = assessment.scores?.tightness;
  const riskNow = assessment.scores?.riskAppetite;

  const crossingText = ({
    label,
    now,
    threshold,
    direction,
  }: {
    label: "Cash availability" | "Market risk appetite";
    now: number;
    threshold: number;
    direction: "riseAbove" | "fallToOrBelow";
  }) => {
    const hasCurrentValue = typeof now === "number" && Number.isFinite(now);
    const alreadyTriggered = hasCurrentValue && (direction === "riseAbove" ? now > threshold : now <= threshold);
    const crossingCopy = direction === "riseAbove"
      ? `climbs above ${threshold.toFixed(1)}`
      : `falls to or below ${threshold.toFixed(1)}`;
    const holdCopy = direction === "riseAbove"
      ? `above ${threshold.toFixed(1)}`
      : `at or below ${threshold.toFixed(1)}`;

    if (!hasCurrentValue) {
      return `${label} flips this call if it ${crossingCopy}.`;
    }

    return alreadyTriggered
      ? `${label} is already in the flip zone at ${now.toFixed(1)} and only has to stay ${holdCopy}.`
      : `${label} flips this call if it ${crossingCopy}, from ${now.toFixed(1)} today.`;
  };

  const tightnessDirection: "riseAbove" | "fallToOrBelow" =
    assessment.regime === "SCARCITY" || assessment.regime === "DEFENSIVE" ? "fallToOrBelow" : "riseAbove";
  const riskDirection: "riseAbove" | "fallToOrBelow" =
    assessment.regime === "SCARCITY" || assessment.regime === "VOLATILE" ? "riseAbove" : "fallToOrBelow";
  const tightnessTriggered = tightnessDirection === "riseAbove"
    ? tightnessNow > tightnessThreshold
    : tightnessNow <= tightnessThreshold;
  const riskTriggered = riskDirection === "riseAbove"
    ? riskNow > riskThreshold
    : riskNow <= riskThreshold;
  const watchPrefix = tightnessTriggered || riskTriggered
    ? "One flip condition is already tripped."
    : "No flip condition is tripped yet.";

  return [
    watchPrefix,
    crossingText({ label: "Cash availability", now: tightnessNow, threshold: tightnessThreshold, direction: tightnessDirection }),
    crossingText({ label: "Market risk appetite", now: riskNow, threshold: riskThreshold, direction: riskDirection }),
  ].join(" ");
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

const signalLabels: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Cash availability",
  riskAppetite: "Market risk appetite",
  baseRate: "Fed interest rate",
  curveSlope: "Recession warning gauge",
};

const evidenceTitleBySignal: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Capital conditions",
  riskAppetite: "Market risk appetite",
  baseRate: "Fed interest rate",
  curveSlope: "Recession warning gauge",
};

const EVIDENCE_SIGNAL_MAGNITUDE_HIGH = 3;
const EVIDENCE_SIGNAL_MAGNITUDE_MEDIUM = 1;

const toConfidenceLabel = (delta: number): "LOW" | "MED" | "HIGH" => {
  const magnitude = Math.abs(delta);
  if (magnitude >= EVIDENCE_SIGNAL_MAGNITUDE_HIGH) return "HIGH";
  if (magnitude >= EVIDENCE_SIGNAL_MAGNITUDE_MEDIUM) return "MED";
  return "LOW";
};

const signalImmediateImplication = (key: ReportDynamics["changedSignals"][number]["key"], delta: number) => {
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

  return delta > 0
    ? "Longer-payback work becomes incrementally safer if guardrails hold."
    : "Keep commitments staged while macro risk remains elevated.";
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
        : `Sits ${thresholdDistance.toFixed(1)} points from the regime threshold.`,
    ];

    return {
      key,
      title: evidenceTitleBySignal[key],
      lastUpdated,
      supportingBullets,
      confidenceLabel: formatConfidencePlainLabel(toConfidenceLabel(delta)),
      directionLabel,
      immediateImplication: signalImmediateImplication(key, delta),
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
