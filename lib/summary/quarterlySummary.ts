/**
 * Quarterly summary builder for longer-range action guidance.
 * Mirrors monthly summary structure with quarter-specific framing.
 */
import type { RegimeAssessment } from "../regimeEngine";

export type QuarterlySummaryProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

export type QuarterlySummary = {
  title: string;
  summary: string;
  regime: RegimeAssessment["regime"];
  regimeLabel: string;
  guidance: string;
  constraints: string[];
  recordDateLabel: string | null;
  provenance: QuarterlySummaryProvenance;
  inputs: RegimeAssessment["inputs"];
  copy: string;
};

const quarterlyActionGuidance: Record<RegimeAssessment["regime"], string> = {
  SCARCITY:
    "lock discretionary spend, extend runway, and demand tighter payback before expanding plans",
  DEFENSIVE:
    "prioritize durable revenue, reduce structural cost, and sequence bets around resilience",
  VOLATILE:
    "balance experiments with clear guardrails, keep approvals reversible, and protect core KPIs",
  EXPANSION:
    "scale the strongest plays, invest in growth engines, and keep payback discipline steady",
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

export const getQuarterlyActionGuidance = (regime: RegimeAssessment["regime"]) =>
  quarterlyActionGuidance[regime];

export const buildQuarterlySummary = ({
  assessment,
  provenance,
  recordDateLabel,
  periodLabel,
}: {
  assessment: RegimeAssessment;
  provenance: QuarterlySummaryProvenance;
  recordDateLabel?: string;
  periodLabel?: string;
}): QuarterlySummary => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const guidance = getQuarterlyActionGuidance(assessment.regime);
  const summary = `This quarter, operate in ${regimeLabel} mode: ${guidance}. ${assessment.description}`;
  const title = periodLabel
    ? `Quarterly action summary — ${periodLabel}`
    : "Quarterly action summary";
  const sourceLine = provenance.sourceUrl
    ? `${provenance.sourceLabel} (${provenance.sourceUrl})`
    : provenance.sourceLabel;
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
    `Confidence: ${provenance.statusLabel}`,
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

export const getQuarterLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${year}`;
};
