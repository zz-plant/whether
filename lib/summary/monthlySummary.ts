/**
 * Monthly summary builder for consistent action guidance in the Regime Station flow.
 * Powers copy-ready cards and API responses with traceable provenance metadata.
 */
import type { RegimeAssessment } from "../regimeEngine";
import { buildComplianceStamp } from "../exportNotices";

export type MonthlySummaryProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

export type MonthlySummary = {
  title: string;
  summary: string;
  regime: RegimeAssessment["regime"];
  regimeLabel: string;
  guidance: string;
  constraints: string[];
  recordDateLabel: string | null;
  provenance: MonthlySummaryProvenance;
  inputs: RegimeAssessment["inputs"];
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

const getRegimeLabel = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return "Survival Mode";
    case "DEFENSIVE":
      return "Efficiency Mode";
    case "VOLATILE":
      return "Safety Mode";
    case "EXPANSION":
      return "Growth Mode";
    default:
      return regime;
  }
};

export const getMonthlyActionGuidance = (regime: RegimeAssessment["regime"]) =>
  monthlyActionGuidance[regime];

export const buildMonthlySummary = ({
  assessment,
  provenance,
  recordDateLabel,
}: {
  assessment: RegimeAssessment;
  provenance: MonthlySummaryProvenance;
  recordDateLabel?: string;
}): MonthlySummary => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const guidance = getMonthlyActionGuidance(assessment.regime);
  const summary = `${regimeLabel} posture: ${assessment.description} Priority: ${guidance}.`;
  const title = recordDateLabel
    ? `Monthly action summary — ${recordDateLabel}`
    : "Monthly action summary";
  const sourceLine = provenance.sourceUrl
    ? `${provenance.sourceLabel} (${provenance.sourceUrl})`
    : provenance.sourceLabel;
  const complianceStamp = buildComplianceStamp({
    sourceLine,
    timestamp: provenance.timestampLabel,
    confidence: provenance.statusLabel,
  });
  const copy = [
    title,
    summary,
    "",
    "Execution constraints:",
    ...assessment.constraints.map((item) => `• ${item}`),
    "",
    "Provenance:",
    `Source: ${sourceLine}`,
    `Timestamp: ${provenance.timestampLabel}`,
    `Data age: ${provenance.ageLabel}`,
    "",
    ...complianceStamp,
  ].join("\n");

  return {
    title,
    summary,
    regime: assessment.regime,
    regimeLabel,
    guidance,
    constraints: assessment.constraints,
    recordDateLabel: recordDateLabel ?? null,
    provenance,
    inputs: assessment.inputs,
    copy,
  };
};
