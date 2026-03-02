/**
 * Yearly summary builder for annual planning guidance.
 * Mirrors monthly summary structure with year-specific framing.
 */
import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeOperatorLabel } from "../regimeLabels";
import { buildComplianceStamp } from "../exportNotices";

export type YearlySummaryProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

export type YearlySummary = {
  title: string;
  summary: string;
  regime: RegimeAssessment["regime"];
  regimeLabel: string;
  guidance: string;
  constraints: string[];
  recordDateLabel: string | null;
  provenance: YearlySummaryProvenance;
  inputs: RegimeAssessment["inputs"];
  copy: string;
};

const yearlyActionGuidance: Record<RegimeAssessment["regime"], string> = {
  SCARCITY:
    "commit only to survival priorities, extend runway, and reset plans around cash preservation",
  DEFENSIVE:
    "anchor the roadmap on retention, reliability, and margin resilience",
  VOLATILE:
    "keep the plan flexible, sequence bets with exit ramps, and protect the core business",
  EXPANSION:
    "commit to growth investments, scale core winners, and maintain payback discipline",
};


export const getYearlyActionGuidance = (regime: RegimeAssessment["regime"]) =>
  yearlyActionGuidance[regime];

export const buildYearlySummary = ({
  assessment,
  provenance,
  recordDateLabel,
  periodLabel,
}: {
  assessment: RegimeAssessment;
  provenance: YearlySummaryProvenance;
  recordDateLabel?: string;
  periodLabel?: string;
}): YearlySummary => {
  const regimeLabel = getRegimeOperatorLabel(assessment.regime);
  const guidance = getYearlyActionGuidance(assessment.regime);
  const summary = `This year, operate in ${regimeLabel} mode: ${guidance}. ${assessment.description}`;
  const title = periodLabel ? `Yearly action summary — ${periodLabel}` : "Yearly action summary";
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

export const getYearLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  return String(date.getUTCFullYear());
};
