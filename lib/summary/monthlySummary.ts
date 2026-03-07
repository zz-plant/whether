/**
 * Monthly summary builder for consistent action guidance in the Regime Station flow.
 * Powers copy-ready cards and API responses with traceable provenance metadata.
 */
import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeOperatorLabel } from "../regimeLabels";
import { renderMonthlySummaryCopy } from "./summaryCopyRenderer";
import { formatSourceLine } from "./summaryFormatting";

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
    "balance experiments with guardrails, keep approvals reversible, and tighten cross-team handoffs",
  EXPANSION:
    "scale proven bets, invest in durable growth channels, and keep payback discipline",
};


export const getMonthlyActionGuidance = (regime: RegimeAssessment["regime"]) =>
  monthlyActionGuidance[regime];

export const buildMonthlyStructured = ({
  constraints,
  provenance,
}: {
  constraints: string[];
  provenance: MonthlySummaryProvenance;
}): MonthlyStructured => {
  const source = formatSourceLine(provenance);

  return {
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
  const transitionCue = assessment.diagnostics.transitionWatch
    ? " Signals are near a regime boundary; hold major scope changes until the next read."
    : "";
  const summary = `${regimeLabel} posture: ${assessment.description} Priority: ${guidance}. Confidence: ${assessment.diagnostics.confidence.toLowerCase()} (${assessment.diagnostics.intensity.toLowerCase()} signal).${transitionCue}`;
  const title = recordDateLabel
    ? `Monthly action summary — ${recordDateLabel}`
    : "Monthly action summary";
  const structured = buildMonthlyStructured({
    constraints: assessment.constraints,
    provenance,
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
