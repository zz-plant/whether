import { deriveRegimeStage } from "../regimePresentation";
import type { PostureStateContract } from "../report/postureStateContract";
import type { ReportData } from "../report/reportData";
import { buildCompactFreshnessMeta } from "../report/reportFormatting";

export type CliFreshnessContract = {
  updatedAt: string;
  line: string;
  maxAge: "fresh" | "stale";
  confidenceCue: string;
  degraded: boolean;
};

export type CliStatusContract = {
  version: "v1";
  generatedAt: string;
  updatedAt: string;
  freshness: CliFreshnessContract;
  regime: string;
  cyclePhase: string;
  confidence: { label: string; score: number };
  trend: string;
  decisionStability: "stable" | "unstable";
  call: {
    summary: string;
    do: string[];
    avoid: string[];
    flipConditions: string[];
  };
  degraded: boolean;
};

export type CliStatusExpandedContract = CliStatusContract & {
  view: "expanded";
  boundedDecision: {
    guardrailThreshold: string;
    reversalTrigger: string;
    flipConditionsCompact: string[];
    topDeltas: Array<{ metric: "tightness" | "risk_appetite" | "base_rate" | "curve_slope"; delta: number; direction: "up" | "down" }>;
  };
};

export type CliCallContract = {
  version: "v1";
  generatedAt: string;
  freshness: CliFreshnessContract;
  call: string;
  leadershipShould: string[];
  watch: string[];
  degraded: boolean;
};

export type CliChangesContract = {
  version: "v1";
  generatedAt: string;
  freshness: CliFreshnessContract;
  changed: Array<{
    metric: "tightness" | "risk_appetite" | "base_rate" | "curve_slope";
    from: number;
    to: number;
    direction: "up" | "down";
    impact: "positive" | "negative";
  }>;
  revisit: string[];
  flip: Array<{
    condition: string;
    distance: number | null;
  }>;
  degraded: boolean;
};

export type CliRegimeContract = {
  version: "v1";
  generatedAt: string;
  regime: string;
  phase: string;
  confidence: string;
  trend: string;
  interpretation: string;
  degraded: boolean;
};

const titleCase = (v: string) => (v.length ? `${v[0].toUpperCase()}${v.slice(1)}` : v);

const metricLabel = {
  tightness: "tightness",
  riskAppetite: "risk_appetite",
  baseRate: "base_rate",
  curveSlope: "curve_slope",
} as const;

const rawForKey = (reportData: ReportData, key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope") =>
  key === "tightness"
    ? reportData.assessment.scores.tightness
    : key === "riskAppetite"
      ? reportData.assessment.scores.riskAppetite
      : key === "baseRate"
        ? reportData.assessment.scores.baseRate
        : reportData.assessment.scores.curveSlope;

const deriveCyclePhaseLabel = (reportData: ReportData) => {
  const stage = deriveRegimeStage({
    regime: reportData.assessment.regime,
    momentum: reportData.reportDynamics.directionLabel,
    confidence: reportData.assessment.diagnostics.confidence === "MEDIUM" ? "MED" : reportData.assessment.diagnostics.confidence,
    distanceToFlip: reportData.assessment.diagnostics.nearestThresholdDelta,
  });
  return stage.displayLabel;
};

const impactFromSignal = (key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope", delta: number) => {
  if (key === "tightness" || key === "baseRate") {
    return delta > 0 ? "negative" : "positive";
  }
  return delta > 0 ? "positive" : "negative";
};

const buildDecisionStability = (postureState: PostureStateContract): "stable" | "unstable" =>
  postureState.currentState.transitionWatch === "ON" ? "unstable" : "stable";

const parseDistance = (condition: string, reportData: ReportData): number | null => {
  const match = condition.match(/(tightness|risk appetite)\s*([<>]=?)\s*(\d+(?:\.\d+)?)/i);
  if (!match) {
    return null;
  }
  const metric = match[1].toLowerCase();
  const operator = match[2];
  const target = Number(match[3]);
  const current = metric.includes("tightness")
    ? reportData.assessment.scores.tightness
    : reportData.assessment.scores.riskAppetite;

  if (operator.includes("<")) {
    return Number((current - target).toFixed(2));
  }
  return Number((target - current).toFixed(2));
};

const buildFreshness = ({ reportData, confidenceLabel, degraded }: { reportData: ReportData; confidenceLabel: "HIGH" | "MED" | "LOW"; degraded: boolean }): CliFreshnessContract => {
  const freshness = buildCompactFreshnessMeta({
    updatedAtLabel: reportData.treasury.fetched_at,
    confidenceLabel,
    isFallbackSnapshot: degraded,
  });

  return {
    updatedAt: freshness.updatedAtLabel,
    line: freshness.line,
    maxAge: freshness.maxAge,
    confidenceCue: freshness.confidenceCue,
    degraded,
  };
};

export const buildCliStatusContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliStatusContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  updatedAt: reportData.treasury.fetched_at,
  freshness: buildFreshness({ reportData, confidenceLabel: postureState.currentState.confidenceLabel, degraded }),
  regime: postureState.currentState.postureLabel,
  cyclePhase: deriveCyclePhaseLabel(reportData),
  confidence: {
    label: postureState.currentState.confidenceLabel,
    score: postureState.currentState.confidencePercent,
  },
  trend: titleCase(reportData.reportDynamics.directionLabel),
  decisionStability: buildDecisionStability(postureState),
  call: {
    summary: reportData.actionNowShort,
    do: reportData.startItems,
    avoid: reportData.stopItems,
    flipConditions: [...postureState.whatFlipsNext.thresholds],
  },
  degraded,
});

export const buildCliStatusExpandedContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliStatusExpandedContract => ({
  ...buildCliStatusContract({ reportData, postureState, degraded }),
  view: "expanded",
  boundedDecision: {
    guardrailThreshold: reportData.stopItems[0] ?? "Keep current approvals staged.",
    reversalTrigger: postureState.whatFlipsNext.thresholds[0] ?? "Re-open risk only after threshold pressure eases.",
    flipConditionsCompact: postureState.whatFlipsNext.thresholds.slice(0, 3),
    topDeltas: reportData.reportDynamics.changedSignals.slice(0, 3).map((signal) => ({
      metric: metricLabel[signal.key],
      delta: Number(signal.delta.toFixed(2)),
      direction: signal.delta >= 0 ? ("up" as const) : ("down" as const),
    })),
  },
});

export const buildCliCallContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliCallContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  freshness: buildFreshness({ reportData, confidenceLabel: postureState.currentState.confidenceLabel, degraded }),
  call: reportData.actionNowShort,
  leadershipShould: reportData.startItems,
  watch: [...postureState.whatFlipsNext.thresholds],
  degraded,
});

export const buildCliChangesContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliChangesContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  freshness: buildFreshness({ reportData, confidenceLabel: postureState.currentState.confidenceLabel, degraded }),
  changed: reportData.reportDynamics.changedSignals.map((signal) => {
    const raw = rawForKey(reportData, signal.key);
    const to = Number((typeof raw === "number" ? raw : signal.delta).toFixed(2));
    const from = Number((to - signal.delta).toFixed(2));
    return {
      metric: metricLabel[signal.key],
      from,
      to,
      direction: signal.delta >= 0 ? ("up" as const) : ("down" as const),
      impact: impactFromSignal(signal.key, signal.delta),
    };
  }),
  revisit: reportData.stopItems,
  flip: postureState.whatFlipsNext.thresholds.map((condition) => ({
    condition,
    distance: parseDistance(condition, reportData),
  })),
  degraded,
});

export const buildCliRegimeContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliRegimeContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  regime: postureState.currentState.postureLabel,
  phase: deriveCyclePhaseLabel(reportData),
  confidence: postureState.currentState.confidenceLabel,
  trend: titleCase(reportData.reportDynamics.directionLabel),
  interpretation: reportData.playbook?.insight ?? reportData.assessment.description,
  degraded,
});

export const buildScenarioContract = ({ postureBefore, postureAfter, inputs }: { postureBefore: string; postureAfter: string; inputs: { tightness: number | null; riskAppetite: number | null } }) => ({
  version: "v1" as const,
  generatedAt: new Date().toISOString(),
  inputs,
  likelyOutcome: {
    from: postureBefore,
    to: postureAfter,
    changed: postureBefore !== postureAfter,
  },
  implication:
    postureBefore !== postureAfter
      ? "Increase willingness to commit only after two consecutive refreshes confirm this shift."
      : "No posture shift. Keep current pacing and monitor the flip thresholds.",
});
