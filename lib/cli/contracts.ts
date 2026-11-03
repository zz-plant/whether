import { buildAgentGuidance } from "../agentState";
import { deriveRegimeStage } from "../regimePresentation";
import type { RuleCondition } from "../report/boundedDecisionRules";
import { comparisonBasis } from "../report/comparisonBasis";
import { buildDecisionMovementForReport } from "../report/decisionMovement";
import type { PostureStateContract } from "../report/postureStateContract";
import type { ReportData, ReportDynamics } from "../report/reportData";
import { buildCompactFreshnessMeta } from "../report/reportFormatting";
import { listScoreMovementParts } from "../report/scoreMovement";

type CliFreshnessContract = {
  updatedAt: string;
  line: string;
  maxAge: "fresh" | "stale";
  confidenceCue: string;
  degraded: boolean;
};

type CliStatusContract = {
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

type CliStatusExpandedContract = CliStatusContract & {
  view: "expanded";
  boundedDecision: {
    guardrailThreshold: string;
    reversalTrigger: string;
    flipConditionsCompact: string[];
    topDeltas: Array<{ metric: "tightness" | "risk_appetite" | "base_rate" | "curve_slope"; delta: number; direction: "up" | "down" }>;
  };
};

type CliCallContract = {
  version: "v1";
  generatedAt: string;
  freshness: CliFreshnessContract;
  call: string;
  leadershipShould: string[];
  watch: string[];
  degraded: boolean;
};

type CliChangesContract = {
  version: "v1";
  generatedAt: string;
  freshness: CliFreshnessContract;
  /** What every `from` is measured against, as a phrase: "since Aug 31", or "since last week" where the source names no date. */
  basis: string;
  /** The earlier reading itself, when the loader recorded it; null when it did not. */
  comparedWith: { recordDate: string; label: string } | null;
  /** What the change did to the decisions: which areas' pause or restart lines were crossed since `comparedWith`, or that none were. Null when nothing was compared. */
  decision: string | null;
  changed: Array<{
    metric: "tightness" | "risk_appetite" | "base_rate" | "curve_slope";
    /** What a reader sees this signal called; `metric` is the stable key. */
    label: string;
    from: number;
    to: number;
    direction: "up" | "down";
    impact: "positive" | "negative";
    /** What a score's move is made of, signed, adding up to `to - from`; empty for a signal with no split. */
    moved: Array<{ source: string; label: string; points: number }>;
  }>;
  revisit: string[];
  flip: Array<{
    condition: string;
    distance: number | null;
  }>;
  degraded: boolean;
};

type CliRegimeContract = {
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

/* `titleCase("unavailable")` reads as a trend named "Unavailable". The CLI is a
   machine contract, so it says which of the two states this is in words a
   consumer can branch on. */
const describeTrend = (directionLabel: ReportDynamics["directionLabel"]) =>
  directionLabel === "unavailable" ? "Not compared" : titleCase(directionLabel);

/* The phase reads the confidence the contract itself publishes, beside it, rather
   than the engine's raw-gap label, which could call a phase fragile under High. */
const deriveCyclePhaseLabel = (reportData: ReportData, postureState: PostureStateContract) => {
  const stage = deriveRegimeStage({
    regime: reportData.assessment.regime,
    momentum: reportData.reportDynamics.directionLabel,
    confidence: postureState.currentState.confidenceLabel,
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

/**
 * Points from the current reading to the nearest of a condition's lines, signed
 * the way the old sentence parser reported it: positive while the line is
 * ahead, negative once crossed. Null when the condition carries no numeric line.
 */
const distanceToLines = (lines: readonly RuleCondition[], reportData: ReportData): number | null => {
  const distances = lines.map((line) => {
    const current = line.metric === "tightness"
      ? reportData.assessment.scores.tightness
      : reportData.assessment.scores.riskAppetite;
    const signed = line.operator.includes("<") ? current - line.value : line.value - current;
    return Number(signed.toFixed(2));
  });
  if (distances.length === 0) return null;
  return distances.reduce((nearest, value) => (Math.abs(value) < Math.abs(nearest) ? value : nearest));
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

/*
 * The status overlaps the agent state (`lib/agentState.ts`), which was written to be the one
 * answer to decide from. Its guidance is the state's, read by the same builder and printed under
 * the names this contract had first; `regime` and `confidence` read the posture fields the
 * state's `conditions.label` and `confidence` do. It is not built from the whole state: the
 * status answers any month on the record (`asOf`) where the state is today's reading only, and
 * the state reads inputs the status never prints (the lines, the action strip, the record date),
 * so building it would add ways for the status to fail without adding anything it says.
 */
export const buildCliStatusContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliStatusContract => {
  const guidance = buildAgentGuidance({ reportData, postureState });
  return {
    version: "v1",
    generatedAt: new Date().toISOString(),
    updatedAt: reportData.treasury.fetched_at,
    freshness: buildFreshness({ reportData, confidenceLabel: postureState.currentState.confidenceLabel, degraded }),
    regime: postureState.currentState.postureLabel,
    cyclePhase: deriveCyclePhaseLabel(reportData, postureState),
    confidence: {
      label: postureState.currentState.confidenceLabel,
      score: postureState.currentState.confidencePercent,
    },
    trend: describeTrend(reportData.reportDynamics.directionLabel),
    decisionStability: buildDecisionStability(postureState),
    call: {
      summary: guidance.call,
      do: guidance.doNow,
      avoid: guidance.avoidNow,
      flipConditions: guidance.flipConditions,
    },
    degraded,
  };
};

export const buildCliStatusExpandedContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliStatusExpandedContract => {
  const status = buildCliStatusContract({ reportData, postureState, degraded });
  return {
    ...status,
    view: "expanded",
    boundedDecision: {
      guardrailThreshold: reportData.stopItems[0] ?? "Keep current approvals staged.",
      /* What would change the guidance, from its one builder (`buildWeekCallChangesIf`, via
         the posture state), and the status view's own conditions. Both read the raw lines
         until 2026-10-07, which on a held week are not what changes the guidance. */
      reversalTrigger: postureState.whatFlipsNext.flipTrigger,
      flipConditionsCompact: status.call.flipConditions.slice(0, 3),
      topDeltas: reportData.reportDynamics.changedSignals.slice(0, 3).map((signal) => ({
        metric: metricLabel[signal.key],
        delta: Number(signal.delta.toFixed(2)),
        direction: signal.delta >= 0 ? ("up" as const) : ("down" as const),
      })),
    },
  };
};

export const buildCliCallContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliCallContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  freshness: buildFreshness({ reportData, confidenceLabel: postureState.currentState.confidenceLabel, degraded }),
  /* The agent state's guidance, so `whether call` and an agent are told one sentence. */
  call: buildAgentGuidance({ reportData, postureState }).call,
  leadershipShould: reportData.startItems,
  watch: [...postureState.whatFlipsNext.thresholds],
  degraded,
});

export const buildCliChangesContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliChangesContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  freshness: buildFreshness({ reportData, confidenceLabel: postureState.currentState.confidenceLabel, degraded }),
  basis: comparisonBasis(reportData.reportDynamics.comparedWith).since,
  comparedWith: reportData.reportDynamics.comparedWith ?? null,
  decision: buildDecisionMovementForReport(reportData)?.sentence ?? null,
  changed: reportData.reportDynamics.changedSignals.map((signal) => {
    const raw = rawForKey(reportData, signal.key);
    const to = Number((typeof raw === "number" ? raw : signal.delta).toFixed(2));
    const from = Number((to - signal.delta).toFixed(2));
    return {
      metric: metricLabel[signal.key],
      label: signal.label,
      from,
      to,
      direction: signal.delta >= 0 ? ("up" as const) : ("down" as const),
      impact: impactFromSignal(signal.key, signal.delta),
      moved:
        signal.key === "tightness" || signal.key === "riskAppetite"
          ? listScoreMovementParts(signal.key, reportData.reportDynamics.movement?.[signal.key])
          : [],
    };
  }),
  revisit: reportData.stopItems,
  flip: postureState.whatFlipsNext.thresholds.map((condition, index) => ({
    condition,
    distance: distanceToLines(postureState.whatFlipsNext.thresholdLines?.[index] ?? [], reportData),
  })),
  degraded,
});

export const buildCliRegimeContract = ({ reportData, postureState, degraded }: { reportData: ReportData; postureState: PostureStateContract; degraded: boolean }): CliRegimeContract => ({
  version: "v1",
  generatedAt: new Date().toISOString(),
  regime: postureState.currentState.postureLabel,
  phase: deriveCyclePhaseLabel(reportData, postureState),
  confidence: postureState.currentState.confidenceLabel,
  trend: describeTrend(reportData.reportDynamics.directionLabel),
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
      ? "Increase willingness to commit only after two readings in a row confirm this shift."
      : "No posture shift. Keep current pacing and monitor the flip thresholds.",
});
