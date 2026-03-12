import { deriveRegimeStage } from "../regimePresentation";
import type { PostureStateContract } from "../report/postureStateContract";
import type { ReportData } from "../report/reportData";
import { buildSharedFreshnessMetadata } from "../report/trustStatus";

export type CliFreshnessContract = {
  updatedLabel: string;
  marker: "live" | "degraded";
  confidenceCue: string;
  line: string;
};

export type CliStatusContract = {
  version: "v1";
  generatedAt: string;
  updatedAt: string;
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
  freshness: CliFreshnessContract;
};

export type CliCallContract = {
  version: "v1";
  generatedAt: string;
  call: string;
  leadershipShould: string[];
  watch: string[];
  degraded: boolean;
  freshness: CliFreshnessContract;
};

export type CliChangesContract = {
  version: "v1";
  generatedAt: string;
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
  freshness: CliFreshnessContract;
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
        ? reportData.treasury.fed_funds
        : reportData.treasury.yield_curve_spread;

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

export const buildCliStatusContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliStatusContract => {
  const freshness = buildSharedFreshnessMetadata({
    updatedAtLabel: reportData.treasury.fetched_at,
    confidenceLabel: postureState.currentState.confidenceLabel,
    isFallbackSnapshot: Boolean(reportData.treasury.fallback_at || reportData.treasury.fallback_reason),
    isDegraded: degraded,
  });

  return {
  version: "v1",
  generatedAt: new Date().toISOString(),
  updatedAt: reportData.treasury.fetched_at,
  regime: postureState.currentState.postureLabel,
  cyclePhase: titleCase(deriveRegimeStage(reportData.assessment.regime)),
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
  freshness,
};
};

export const buildCliCallContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliCallContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  call: reportData.actionNowShort,
  leadershipShould: reportData.startItems,
  watch: [...postureState.whatFlipsNext.thresholds],
  degraded,
  freshness: buildSharedFreshnessMetadata({
    updatedAtLabel: reportData.treasury.fetched_at,
    confidenceLabel: postureState.currentState.confidenceLabel,
    isFallbackSnapshot: Boolean(reportData.treasury.fallback_at || reportData.treasury.fallback_reason),
    isDegraded: degraded,
  }),
});

export const buildCliChangesContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliChangesContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  changed: reportData.reportDynamics.changedSignals.map((signal) => {
    const to = Number(rawForKey(reportData, signal.key).toFixed(2));
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
  freshness: buildSharedFreshnessMetadata({
    updatedAtLabel: reportData.treasury.fetched_at,
    confidenceLabel: postureState.currentState.confidenceLabel,
    isFallbackSnapshot: Boolean(reportData.treasury.fallback_at || reportData.treasury.fallback_reason),
    isDegraded: degraded,
  }),
});

export const buildCliRegimeContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliRegimeContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  regime: postureState.currentState.postureLabel,
  phase: titleCase(deriveRegimeStage(reportData.assessment.regime)),
  confidence: postureState.currentState.confidenceLabel,
  trend: titleCase(reportData.reportDynamics.directionLabel),
  interpretation: reportData.playbook.why,
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
