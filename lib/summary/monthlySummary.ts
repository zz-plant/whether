/**
 * Monthly summary builder for consistent action guidance in the Regime Station flow.
 * Powers copy-ready cards and API responses with traceable provenance metadata.
 */
import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeOperatorLabel } from "../regimeLabels";
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
  const tightnessPause = assessment.thresholds.tightnessRegime + 6;
  const tightnessResume = Math.max(assessment.thresholds.tightnessRegime - 4, 0);
  const riskPause = Math.max(assessment.thresholds.riskAppetiteRegime - 6, 0);
  const riskResume = Math.min(assessment.thresholds.riskAppetiteRegime + 4, 100);

  if (assessment.regime === "VOLATILE") {
    return [
      {
        action: "Run no more than three concurrent experiments, each with a named rollback owner.",
        threshold: `Pause new experiments if risk appetite falls below ${riskPause.toFixed(1)}.`,
        reversal: `Reopen slots when risk appetite is above ${riskResume.toFixed(1)} and weekly direction stabilizes or improves.`,
      },
      {
        action: "Stage net-new headcount and multi-quarter vendor approvals.",
        threshold: `Pause fixed-cost approvals if cash availability rises above ${tightnessPause.toFixed(1)}.`,
        reversal: `Resume staged approvals when cash availability falls below ${tightnessResume.toFixed(1)}.`,
      },
      {
        action: "Assign one checkpoint owner to every cross-team commitment before work starts.",
        threshold: "Stop adding scope when an active commitment has no owner or rollback checkpoint.",
        reversal: "Resume scope after an owner, checkpoint date, and rollback decision are recorded.",
      },
    ];
  }

  return [{
    action: `Apply this month's priority: ${getMonthlyActionGuidance(assessment.regime)}.`,
    threshold: `Pause broader commitments if cash availability rises above ${tightnessPause.toFixed(1)} or risk appetite falls below ${riskPause.toFixed(1)}.`,
    reversal: `Reopen broader scope when cash availability is below ${tightnessResume.toFixed(1)} and risk appetite is above ${riskResume.toFixed(1)}.`,
  }];
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
  const postureSummary = [
    `The priority this month is to ${guidance}.`,
    formatConfidenceSentence(confidence, intensity),
    transitionWatch
      ? "The call is close to a boundary, so keep reversals cheap."
      : "The call is clear of its boundaries.",
  ];
  const boundedNextActions = [
    `Hold the month to one job: ${guidance}.`,
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
  const regimeLabel = getRegimeOperatorLabel(assessment.regime);
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
