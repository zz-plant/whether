/**
 * Weekly summary builders for the Whether Report, optimized for copy/paste sharing.
 */
import type { RegimeAssessment, RegimeKey } from "./regimeEngine";

export type WeeklySummary = {
  regime: RegimeKey;
  regimeLabel: string;
  actionGuidance: string;
  constraints: string[];
  recordDateLabel: string;
  fetchedAtLabel: string;
  sourceLabel: string;
  sourceUrl: string;
  summaryText: string;
};

export const getRegimeLabel = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return "Survival Mode";
    case "DEFENSIVE":
      return "Safety Mode";
    case "VOLATILE":
      return "Stability Mode";
    case "EXPANSION":
      return "Growth Mode";
    default:
      return regime;
  }
};

export const weeklyActionGuidance: Record<RegimeAssessment["regime"], string> = {
  SCARCITY: "freeze discretionary scope, protect runway, and require proof before new bets",
  DEFENSIVE: "prioritize retention, tighten costs, and ship only revenue or reliability work",
  VOLATILE: "balance experiments with safeguards, and keep spend approvals reversible",
  EXPANSION: "scale the highest-ROI bets, hire deliberately, and keep payback discipline",
};

type BuildWeeklySummaryInput = {
  assessment: RegimeAssessment;
  recordDateLabel: string;
  fetchedAtLabel: string;
  sourceLabel: string;
  sourceUrl: string;
};

export const buildWeeklySummary = ({
  assessment,
  recordDateLabel,
  fetchedAtLabel,
  sourceLabel,
  sourceUrl,
}: BuildWeeklySummaryInput): WeeklySummary => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const actionGuidance = weeklyActionGuidance[assessment.regime];
  const constraints = assessment.constraints;
  const constraintsSentence = constraints.map((item) => `• ${item}`).join(" ");
  const summaryText =
    `This week's Whether (${recordDateLabel}) is ${regimeLabel}. ` +
    `Actions: ${actionGuidance}. ` +
    `Constraints: ${constraintsSentence} ` +
    `Source: ${sourceLabel} (${sourceUrl}). ` +
    `Fetched ${fetchedAtLabel}.`;

  return {
    regime: assessment.regime,
    regimeLabel,
    actionGuidance,
    constraints,
    recordDateLabel,
    fetchedAtLabel,
    sourceLabel,
    sourceUrl,
    summaryText,
  };
};

export const buildWeeklySummaryApiHref = (
  searchParams?: Record<string, string | undefined>
) => {
  const params = new URLSearchParams();
  if (searchParams?.month) {
    params.set("month", searchParams.month);
  }
  if (searchParams?.year) {
    params.set("year", searchParams.year);
  }
  const query = params.toString();
  return `/api/weekly${query ? `?${query}` : ""}`;
};
