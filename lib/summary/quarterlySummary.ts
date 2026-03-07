/**
 * Quarterly summary builder for longer-range action guidance.
 * Mirrors monthly summary structure with quarter-specific framing.
 */
import type { RegimeAssessment } from "../regimeEngine";
import {
  buildCadenceSummary,
  type CadenceSummaryProvenance,
} from "./cadenceSummaryBuilder";

export type QuarterlySummaryProvenance = CadenceSummaryProvenance;

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
}): QuarterlySummary =>
  buildCadenceSummary({
    cadence: "quarterly",
    guidanceMap: quarterlyActionGuidance,
    assessment,
    provenance,
    recordDateLabel,
    periodLabel,
  });

export const getQuarterLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${year}`;
};
