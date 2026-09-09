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
import { formatConfidenceSentence, formatSourceLine } from "./summaryFormatting";

import type { MonthlyStructured, SummaryProvenance } from "./summaryTypes";

export type MonthlySummaryProvenance = SummaryProvenance;
export type { MonthlyStructured } from "./summaryTypes";

export type MonthlySummary = {
  title: string;
  summary: string;
  regime: RegimeAssessment["regime"];
  regimeLabel: string;
  guidance: string;
  confidence: RegimeAssessment["diagnostics"]["confidence"];
  transitionWatch: boolean;
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
    "double down on retention, reduce fixed costs, and sequence delivery around revenue durability",
  VOLATILE:
    "cap concurrent experiments, stage fixed-cost approvals, and assign a named checkpoint owner",
  EXPANSION:
    "scale proven bets, invest in durable growth channels, and keep payback discipline",
};


export const getMonthlyActionGuidance = (regime: RegimeAssessment["regime"]) =>
  monthlyActionGuidance[regime];

export const getMonthlyOperatingRules = (assessment: RegimeAssessment): MonthlyStructured["operatingRules"] => {
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

export const buildMonthlyStructured = ({
  regimeLabel,
  guidance,
  confidence,
  intensity,
  transitionWatch,
  constraints,
  provenance,
  operatingRules = [],
}: {
  regimeLabel: string;
  guidance: string;
  confidence: RegimeAssessment["diagnostics"]["confidence"];
  intensity: RegimeAssessment["diagnostics"]["intensity"];
  transitionWatch: boolean;
  constraints: string[];
  provenance: MonthlySummaryProvenance;
  operatingRules?: MonthlyStructured["operatingRules"];
}): MonthlyStructured => {
  // The guidance sentence is stated once, in the planning language, which is the
  // line meant to be pasted. It used to be repeated verbatim in the posture
  // summary, the next actions, and the operating rule as well — five copies of
  // one sentence on a single card, which reads as generated because it was.
  const postureSummary = [
    formatConfidenceSentence(confidence, intensity),
    transitionWatch
      ? "The call is close to a boundary, so keep reversals cheap."
      : "The call is clear of its boundaries.",
  ];
  const boundedNextActions = [
    "Approve only work that serves the month's priority; hold the rest for the next read.",
    transitionWatch
      ? "Keep new commitments reversible until the next read confirms stability."
      : "Keep new commitments inside the current constraints.",
  ];
  const reversalConditions = [
    transitionWatch
      ? "Re-open broader scope once the next read confirms the regime is still stable."
      : "Re-open broader bets if the posture or the confidence behind it weakens.",
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
}: {
  assessment: RegimeAssessment;
  provenance: MonthlySummaryProvenance;
  recordDateLabel?: string;
}): MonthlySummary => {
  const regimeLabel = getRegimePublicLabel(assessment.regime);
  const guidance = getMonthlyActionGuidance(assessment.regime);
  const operatingRules = getMonthlyOperatingRules(assessment);
  const transitionCue = assessment.diagnostics.transitionWatch
    ? "Evidence is sitting near a regime boundary, so hold major scope changes until the next read."
    : "";
  const summary = joinSentences(
    `${regimeLabel}: ${assessment.description}`,
    `The priority this month is to ${guidance}`,
    formatConfidenceSentence(assessment.diagnostics.confidence, assessment.diagnostics.intensity),
    transitionCue,
  );
  const title = recordDateLabel
    ? `Monthly action summary — ${recordDateLabel}`
    : "Monthly action summary";
  const structured = buildMonthlyStructured({
    regimeLabel,
    guidance,
    confidence: assessment.diagnostics.confidence,
    intensity: assessment.diagnostics.intensity,
    transitionWatch: assessment.diagnostics.transitionWatch,
    constraints: assessment.constraints,
    provenance,
    operatingRules,
  });
  const copy = renderMonthlySummaryCopy({
    title,
    summary,
    provenance,
    structured,
  });

  return {
    title,
    summary,
    regime: assessment.regime,
    regimeLabel,
    guidance,
    confidence: assessment.diagnostics.confidence,
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
