/**
 * Agent handoff helpers for autonomous PM assistants.
 * Provides structured payloads and prompts for downstream automation.
 */
import { buildCanonicalBoundedDecisionRules, decisionAreaLabel } from "./report/boundedDecisionRules";
import type { PostureStateContract } from "./report/postureStateContract";
import type { ReportDynamics } from "./report/reportData";
import { comparisonBasis } from "./report/comparisonBasis";
import type { RegimeAssessment } from "./regimeEngine";
import { agentSkills } from "./agentSkills";
import { getRegimePublicLabel } from "./regimePresentation";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "./types";

const buildSignals = (
  treasury: TreasuryData,
  sensors: SensorReading[]
) => {
  const baseRate = sensors.find((sensor) => sensor.id === "BASE_RATE");
  const curveSlope = sensors.find((sensor) => sensor.id === "CURVE_SLOPE");

  return [
    {
      id: baseRate?.id ?? "BASE_RATE",
      label: baseRate?.label ?? "Policy base rate",
      value: baseRate?.value ?? null,
      unit: baseRate?.unit ?? "%",
      record_date: baseRate?.record_date ?? treasury.record_date,
      fetched_at: baseRate?.fetched_at ?? treasury.fetched_at,
      source_url: baseRate?.sourceUrl ?? treasury.source,
    },
    {
      id: curveSlope?.id ?? "CURVE_SLOPE",
      label: curveSlope?.label ?? "Yield curve slope (10Y - 2Y)",
      value: curveSlope?.value ?? null,
      unit: curveSlope?.unit ?? "%",
      record_date: curveSlope?.record_date ?? treasury.record_date,
      fetched_at: curveSlope?.fetched_at ?? treasury.fetched_at,
      source_url: curveSlope?.sourceUrl ?? treasury.source,
    },
  ];
};

type AgentDecisionSupport = {
  reportDynamics: Pick<ReportDynamics, "changedSignals" | "directionLabel" | "regimeChanged" | "comparedWith">;
  actionNowShort: string;
  startItems: string[];
  stopItems: string[];
  postureState: Pick<PostureStateContract, "currentState" | "lastCommittedChangeEvent" | "whatFlipsNext">;
};

const titleCase = (value: string) => (value.length ? `${value[0].toUpperCase()}${value.slice(1)}` : value);

const scoreForSignalKey = (
  assessment: RegimeAssessment,
  key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope",
) =>
  key === "tightness"
    ? assessment.scores.tightness
    : key === "riskAppetite"
      ? assessment.scores.riskAppetite
      : key === "baseRate"
        ? assessment.scores.baseRate
        : assessment.scores.curveSlope ?? 0;

const decisionEffectForSignal = (
  key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope",
  delta: number,
) => {
  if (delta === 0) return "hold";
  if (key === "tightness" || key === "baseRate") {
    return delta > 0 ? "tighten" : "loosen";
  }
  return delta > 0 ? "loosen" : "tighten";
};

const buildDecisionRules = (assessment: RegimeAssessment) =>
  buildCanonicalBoundedDecisionRules({
    regime: assessment.regime,
    thresholds: assessment.thresholds,
    scores: {
      tightness: assessment.scores.tightness,
      riskAppetite: assessment.scores.riskAppetite,
    },
  }).map((rule) => ({
    area: rule.area,
    area_label: decisionAreaLabel(rule.area),
    recommendation: rule.recommendation,
    do_now: rule.doNow,
    avoid_now: rule.avoidNow,
    scope: rule.scope,
    pause_trigger: rule.pauseTrigger,
    resume_trigger: rule.resumeTrigger,
    flip_conditions: rule.flipConditions.map((condition) => ({
      metric: condition.metric,
      operator: condition.operator,
      value: condition.value,
      label: condition.label,
    })),
    rationale: rule.rationale,
  }));

const buildDecisionDelta = (assessment: RegimeAssessment, support: AgentDecisionSupport) => {
  const changedSignals = support.reportDynamics.changedSignals.map((signal) => {
    const to = scoreForSignalKey(assessment, signal.key);
    const normalizedTo = Number(to.toFixed(2));
    return {
      metric: signal.key,
      label: signal.label,
      from: Number((to - signal.delta).toFixed(2)),
      to: normalizedTo,
      delta: Number(signal.delta.toFixed(2)),
      direction: signal.delta >= 0 ? ("up" as const) : ("down" as const),
      decision_effect: decisionEffectForSignal(signal.key, signal.delta),
    };
  });

  /* The moves are against the previous monthly snapshot, so a week that records
     its date says "since Aug 31" where these sentences said "this week" or
     "weekly" (`comparisonBasis`); a week that does not keeps the old words. An
     agent that acts on `from` and `delta` needs to know what `from` is. */
  const basis = comparisonBasis(support.reportDynamics.comparedWith);
  /* "No material weekly signal delta" is a finding; an agent reading it will
     report it as one. Without a previous reading there is no finding to pass
     on, only the current call. */
  const summary = support.reportDynamics.directionLabel === "unavailable"
    ? `No previous reading to compare this week against. ${support.actionNowShort}`
    : support.reportDynamics.regimeChanged
      ? `Regime changed ${basis.date ? basis.since : "this week"}. ${support.actionNowShort}`
      : changedSignals.length === 0
        ? `No material ${basis.date ? `signal delta ${basis.since}` : "weekly signal delta"}. ${support.actionNowShort}`
        : `${titleCase(support.reportDynamics.directionLabel)} ${basis.date ? `signal move ${basis.since}` : "weekly signal move"}. ${support.actionNowShort}`;

  return {
    summary,
    /** The earlier reading `from` and `delta` are measured against; null where the source did not date it. */
    compared_with: support.reportDynamics.comparedWith
      ? { record_date: support.reportDynamics.comparedWith.recordDate, label: support.reportDynamics.comparedWith.label }
      : null,
    regime_changed: support.reportDynamics.regimeChanged,
    direction_label: support.reportDynamics.directionLabel,
    decision_now: support.actionNowShort,
    do_now: support.startItems,
    avoid_now: support.stopItems,
    changed_signals: changedSignals,
  };
};

/**
 * The governed transition the state machine is holding, if any. The near-band
 * `transition_watch` flag only knows distance from a line; a reading that has
 * already crossed and is waiting on the confirmation gate sits *past* the band,
 * so the watch reads OFF at the exact moment the call is most likely to flip.
 * Agents consuming `regime.key` alone would otherwise act on a call the machine
 * has already contradicted.
 */
const resolvePendingTransition = (assessment: RegimeAssessment) => {
  const transition = assessment.regimeTransition;
  if (!transition?.pending || transition.candidateState === assessment.regime) {
    return null;
  }
  return {
    candidate: transition.candidateState,
    candidate_label: getRegimePublicLabel(transition.candidateState),
    pending_count: transition.transitionPendingCount ?? 1,
    reason: transition.transitionReason,
  };
};

const buildFlipWatch = (assessment: RegimeAssessment, support: AgentDecisionSupport) => {
  const pendingTransition = resolvePendingTransition(assessment);
  const watchSummary =
    support.postureState.currentState.transitionWatch === "ON"
      ? `Transition watch is ON. ${support.postureState.whatFlipsNext.flipTrigger}`
      : `Transition watch is OFF. Primary trigger: ${support.postureState.whatFlipsNext.flipTrigger}`;
  return {
    summary: pendingTransition
      ? `Flip to ${pendingTransition.candidate_label} is pending confirmation; conditions hold at ${getRegimePublicLabel(assessment.regime)} until the next read confirms it. ${pendingTransition.reason} ${watchSummary}`
      : watchSummary,
    pending_transition: pendingTransition,
    transition_watch: support.postureState.currentState.transitionWatch,
    nearest_threshold_delta: Number(assessment.diagnostics.nearestThresholdDelta.toFixed(2)),
    boundary_contributors: assessment.diagnostics.boundaryContributors,
    weak_read_count: assessment.diagnostics.weakReadCount,
    two_weak_reads_warning: assessment.diagnostics.twoWeakReadsWarning,
    flip_trigger: support.postureState.whatFlipsNext.flipTrigger,
    thresholds: [...support.postureState.whatFlipsNext.thresholds],
    reversal_conditions: [...support.postureState.whatFlipsNext.reversalConditions],
    last_committed_change: {
      timestamp: support.postureState.lastCommittedChangeEvent.timestamp,
      from_state: support.postureState.lastCommittedChangeEvent.fromState,
      to_state: support.postureState.lastCommittedChangeEvent.toState,
      reason: support.postureState.lastCommittedChangeEvent.reason,
      source: support.postureState.lastCommittedChangeEvent.source,
    },
  };
};

export const buildAgentPayload = (
  assessment: RegimeAssessment,
  treasury: TreasuryData,
  sensors: SensorReading[],
  macros: MacroSeriesReading[],
  options?: {
    decisionSupport?: AgentDecisionSupport;
  },
) => {
  const regimeLabel = getRegimePublicLabel(assessment.regime);
  const decisionRules = buildDecisionRules(assessment);
  const decisionDelta = options?.decisionSupport
    ? buildDecisionDelta(assessment, options.decisionSupport)
    : null;
  const flipWatch = options?.decisionSupport
    ? buildFlipWatch(assessment, options.decisionSupport)
    : null;

  return {
    report_date: treasury.record_date,
    fetched_at: treasury.fetched_at,
    source: treasury.source,
    regime: {
      key: assessment.regime,
      label: regimeLabel,
      description: assessment.description,
    },
    scores: assessment.scores,
    thresholds: assessment.thresholds,
    constraints: assessment.constraints,
    data_warnings: assessment.dataWarnings,
    signals: buildSignals(treasury, sensors),
    macro_signals: macros.map((macro) => ({
      id: macro.id,
      label: macro.label,
      value: macro.value,
      unit: macro.unit,
      record_date: macro.record_date,
      fetched_at: macro.fetched_at,
      source_url: macro.sourceUrl,
    })),
    decision_rules: decisionRules,
    decision_delta: decisionDelta,
    flip_watch: flipWatch,
    skills: agentSkills,
    pm_handoff: {
      decision_focus: "Use constraints to validate roadmap, hiring, and pricing moves.",
      briefing_actions: [
        "Summarize the regime in plain English.",
        "State what changed this week and what decisions should change now.",
        "Call out constraints that block or enable new initiatives.",
        "Track flip triggers before making irreversible commitments.",
        "List open questions for the product manager.",
      ],
    },
  };
};

export const buildAgentPrompt = (
  assessment: RegimeAssessment,
  treasury: TreasuryData
) => {
  return [
    "You are an autonomous PM assistant.",
    "Follow the skills list in the JSON payload and deliver outputs in the same order.",
    "Use the JSON payload to draft:",
    "1) A 3-bullet summary of the capital posture.",
    "2) A concise decision delta: what changed this week and what changes now.",
    "3) The top 3 constraints that should shape roadmap decisions.",
    "4) A flip watchlist with the trigger, reversal conditions, and current boundary pressure.",
    "5) A short list of questions to confirm with the PM before acting.",
    "",
    `Context: Whether Weekly Brief for ${treasury.record_date} (${assessment.regime}).`,
  ].join("\n");
};
