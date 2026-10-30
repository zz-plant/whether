/**
 * Monthly summary builder for consistent action guidance in the Regime Station flow.
 * Powers copy-ready cards and API responses with traceable provenance metadata.
 */
import type { RegimeAssessment } from "../regimeEngine";
import { formatThresholdNumber } from "../formatters";
import { getRegimePublicLabel } from "../regimePresentation";
import { buildHorizonOperatingRule, buildHorizonThresholdBands } from "./horizonOperatingRules";
import { joinSentences } from "../report/reportFormatting";
import { renderMonthlySummaryCopy } from "./summaryCopyRenderer";
import type { ConfidenceRecord } from "../report/confidence";
import {
  formatConditionsChangeLine,
  formatConfidenceSentence,
  formatSourceLine,
  resolveSummaryConfidence,
  SHOCK_CROSSING_CUE,
  type SummaryConfidence,
} from "./summaryFormatting";

import type { MonthlyStructured, SummaryProvenance } from "./summaryTypes";

type MonthlySummaryProvenance = SummaryProvenance;
export type { MonthlyStructured } from "./summaryTypes";

export type MonthlySummary = {
  title: string;
  summary: string;
  regime: RegimeAssessment["regime"];
  regimeLabel: string;
  guidance: string;
  /** The published confidence (`resolveSummaryConfidence`), not the engine's confirmation gate. */
  confidence: SummaryConfidence;
  transitionWatch: boolean;
  /** The engine's band for how far the nearer score sits from its line, in raw points. Not a speed of movement. */
  intensity: RegimeAssessment["diagnostics"]["intensity"];
  constraints: string[];
  recordDateLabel: string | null;
  provenance: MonthlySummaryProvenance;
  inputs: RegimeAssessment["inputs"];
  structured: MonthlyStructured;
  copy: string;
};

const monthlyActionGuidance: Record<RegimeAssessment["regime"], string> = {
  SCARCITY:
    "lock discretionary spend, protect runway, and require short payback windows for new bets",
  DEFENSIVE:
    "double down on retention, reduce fixed costs, and ship the work that protects revenue first",
  VOLATILE:
    "cap concurrent experiments, stage fixed-cost approvals, and assign a named checkpoint owner",
  EXPANSION:
    "scale proven bets, invest in durable growth channels, and keep payback discipline",
};

/** Saturated-financing variant: same rule as the weekly builder — when the
 *  financing read sits at its own ceiling inside expansion, the tempo word
 *  changes and nothing else does. */
const monthlyActionGuidanceSaturatedFinancing: Record<RegimeAssessment["regime"], string> = {
  ...monthlyActionGuidance,
  EXPANSION:
    "scale proven bets selectively, hold rollback criteria explicit, and keep payback discipline",
};


export const getMonthlyActionGuidance = (
  regime: RegimeAssessment["regime"],
  options: { financingSaturated?: boolean } = {},
) =>
  options.financingSaturated
    ? monthlyActionGuidanceSaturatedFinancing[regime]
    : monthlyActionGuidance[regime];

const getMonthlyOperatingRules = (assessment: RegimeAssessment): MonthlyStructured["operatingRules"] => {
  const { tightnessPause, tightnessResume, riskPause, riskResume } =
    buildHorizonThresholdBands(assessment);

  if (assessment.regime === "VOLATILE") {
    return [
      {
        action: "Run no more than three concurrent experiments, each with a named rollback owner.",
        threshold: `Pause new experiments if risk appetite falls below ${formatThresholdNumber(riskPause)}.`,
        reversal: `Reopen slots when risk appetite is above ${formatThresholdNumber(riskResume)} and weekly direction stabilizes or improves.`,
      },
      {
        action: "Stage net-new headcount and multi-quarter vendor approvals.",
        threshold: `Pause fixed-cost approvals if funding pressure rises above ${formatThresholdNumber(tightnessPause)}.`,
        reversal: `Resume staged approvals when funding pressure falls below ${formatThresholdNumber(tightnessResume)}.`,
      },
      {
        action: "Assign one checkpoint owner to every cross-team commitment before work starts.",
        threshold: "Stop adding scope when an active commitment has no owner or rollback checkpoint.",
        reversal: "Resume scope after an owner, checkpoint date, and rollback decision are recorded.",
      },
    ];
  }

  return [
    buildHorizonOperatingRule({
      assessment,
      guidance: getMonthlyActionGuidance(assessment.regime),
      horizon: "month",
    }),
  ];
};

/**
 * What re-opens paused work this month: the restart lines of the month's own
 * operating rules, off the same bands (`buildHorizonThresholdBands`), so the
 * reversal and the rules above it quote one set of numbers.
 *
 * The bullet used to read "Restart paused work once the next reading confirms
 * conditions held". In Freezing, conditions holding means still Freezing, which
 * is why the work is paused, so it told the reader to restart while frozen. The
 * restart lines are what lifts a pause, in every regime.
 */
const getMonthlyRestartLine = (assessment: RegimeAssessment) => {
  const { tightnessResume, riskResume } = buildHorizonThresholdBands(assessment);

  if (assessment.regime === "VOLATILE") {
    return `Reopen paused experiments when risk appetite is above ${formatThresholdNumber(riskResume)}, and paused fixed-cost approvals when funding pressure falls below ${formatThresholdNumber(tightnessResume)}.`;
  }

  return `Restart paused work when funding pressure is below ${formatThresholdNumber(tightnessResume)} and risk appetite is above ${formatThresholdNumber(riskResume)}.`;
};

/** An archived month carries no scores, so its restart line has no numbers to quote. */
const RESTART_LINE_WITHOUT_SCORES = "Restart paused work only once the restart lines in the operating rules hold.";

export const buildMonthlyStructured = ({
  regimeLabel,
  guidance,
  confidence,
  transitionWatch,
  constraints,
  provenance,
  operatingRules = [],
  restartWhen = RESTART_LINE_WITHOUT_SCORES,
}: {
  regimeLabel: string;
  guidance: string;
  confidence: SummaryConfidence;
  transitionWatch: boolean;
  constraints: string[];
  provenance: MonthlySummaryProvenance;
  operatingRules?: MonthlyStructured["operatingRules"];
  /** The restart lines that re-open paused work (`getMonthlyRestartLine`). */
  restartWhen?: string;
}): MonthlyStructured => {
  // The guidance sentence is stated once, in the planning language, which is the
  // line meant to be pasted. It used to be repeated verbatim in the posture
  // summary, the next actions, and the operating rule as well — five copies of
  // one sentence on a single card, which reads as generated because it was.
  const postureSummary = [
    formatConfidenceSentence(confidence),
    transitionWatch
      ? "Conditions are close to a change line, so keep commitments cheap to undo."
      : "Conditions are clear of their change lines.",
  ];
  const boundedNextActions = [
    "Approve only work that serves the month's priority; hold the rest for the next read.",
    transitionWatch
      ? "Keep new commitments reversible until the next read confirms stability."
      : "Keep new commitments inside the current constraints.",
  ];
  const reversalConditions = [
    transitionWatch
      ? restartWhen
      : "Re-check the plan if conditions weaken or a score nears its change line.",
    "Re-check the plan as soon as any execution constraint starts to bind.",
  ];
  const source = formatSourceLine(provenance);
  const planningLanguage = transitionWatch
    ? `Plan the month to ${guidance} — and keep scope reversible until the next read confirms stability.`
    : `Plan the month to ${guidance}, and keep execution inside the current constraints.`;

  return {
    posture: {
      label: regimeLabel,
      summary: postureSummary,
    },
    planningLanguage,
    boundedNextActions,
    operatingRules,
    reversalConditions,
    executionConstraints: constraints,
    provenance: {
      source,
      timestamp: provenance.timestampLabel,
      dataAge: provenance.ageLabel,
    },
  };
};

export const buildMonthlySummary = ({
  assessment,
  provenance,
  recordDateLabel,
  record,
}: {
  assessment: RegimeAssessment;
  provenance: MonthlySummaryProvenance;
  recordDateLabel?: string;
  /** The record the reading came from, so a stale fallback lowers the published confidence. */
  record?: ConfidenceRecord | null;
}): MonthlySummary => {
  const regimeLabel = getRegimePublicLabel(assessment.regime);
  const confidence = resolveSummaryConfidence(assessment, record);
  const financingSaturated = assessment.scores.tightnessSaturated === true;
  const guidance = getMonthlyActionGuidance(assessment.regime, { financingSaturated });
  const operatingRules = getMonthlyOperatingRules(assessment);
  const transitionCue = assessment.diagnostics.transitionWatch
    ? "A score is sitting near the line where conditions change, so hold major scope changes until the next reading."
    : "";
  // The weekly summary's sentence (`SHOCK_CROSSING_CUE`), which says why it replaced "This flip crossed its line…".
  const shockCue = assessment.diagnostics.shockCrossing ? SHOCK_CROSSING_CUE : "";
  const summary = joinSentences(
    `${regimeLabel}: ${assessment.description}`,
    `The priority this month is to ${guidance}`,
    formatConfidenceSentence(confidence),
    formatConditionsChangeLine(assessment),
    transitionCue,
    shockCue,
  );
  const title = recordDateLabel
    ? `Monthly action summary — ${recordDateLabel}`
    : "Monthly action summary";
  const structured = buildMonthlyStructured({
    regimeLabel,
    guidance,
    confidence,
    transitionWatch: assessment.diagnostics.transitionWatch,
    constraints: assessment.constraints,
    provenance,
    operatingRules,
    restartWhen: getMonthlyRestartLine(assessment),
  });
  const copy = renderMonthlySummaryCopy({
    title,
    summary,
    confidence,
    provenance,
    structured,
  });

  return {
    title,
    summary,
    regime: assessment.regime,
    regimeLabel,
    guidance,
    confidence,
    transitionWatch: assessment.diagnostics.transitionWatch,
    intensity: assessment.diagnostics.intensity,
    constraints: assessment.constraints,
    recordDateLabel: recordDateLabel ?? null,
    provenance,
    inputs: assessment.inputs,
    structured,
    copy,
  };
};
