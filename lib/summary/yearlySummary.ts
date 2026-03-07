/**
 * Yearly summary builder for annual planning guidance.
 * Mirrors monthly summary structure with year-specific framing.
 */
import type { RegimeAssessment } from "../regimeEngine";
import {
  buildCadenceSummary,
  type CadenceSummaryProvenance,
} from "./cadenceSummaryBuilder";

export type YearlySummaryProvenance = CadenceSummaryProvenance;

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
}): YearlySummary =>
  buildCadenceSummary({
    cadence: "yearly",
    guidanceMap: yearlyActionGuidance,
    assessment,
    provenance,
    recordDateLabel,
    periodLabel,
  });

export const getYearLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  return String(date.getUTCFullYear());
};
