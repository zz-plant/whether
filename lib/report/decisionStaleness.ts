import type { DecisionAssumptionSnapshot } from "../decisionMemory";

export type StalenessVerdict = "STAND" | "WATCH" | "RECONSIDER";
export type DecisionStalenessVerdict = StalenessVerdict;

export type StalenessDimension = "capital" | "risk";

export type MovedAssumption = {
  dimension: StalenessDimension;
  label: string;
  detail: string;
};

export type DecisionStaleness = {
  verdict: StalenessVerdict;
  moved: MovedAssumption[];
  why: string;
};

export type CurrentStalenessConditions = {
  tightness: number;
  riskAppetite: number;
};

const CAPITAL_LABEL = "Capital conditions";
const RISK_LABEL = "Demand expectations";

/**
 * Whether a recorded supporting assumption has moved outside the range that
 * held when the decision was recorded.
 *
 * The recorded range is the interval the decision relied on:
 * - capital availability held while tightness stayed at or below the recorded
 *   reading or its regime boundary, whichever is looser;
 * - demand expectations held while risk appetite stayed at or above the
 *   recorded reading or its regime boundary, whichever is tighter.
 *
 * A reading inside the range is untouched; a reading beyond it in the
 * unfavorable direction is a moved assumption. Improving conditions never
 * count as moved — a stale decision is one whose *support* eroded.
 */
const capitalMoved = (
  recorded: DecisionAssumptionSnapshot,
  current: CurrentStalenessConditions,
): boolean => current.tightness > Math.max(recorded.tightness, recorded.tightnessThreshold);

const riskMoved = (
  recorded: DecisionAssumptionSnapshot,
  current: CurrentStalenessConditions,
): boolean => current.riskAppetite < Math.min(recorded.riskAppetite, recorded.riskAppetiteThreshold);

export const buildMovedAssumptions = (
  recorded: DecisionAssumptionSnapshot,
  current: CurrentStalenessConditions,
): MovedAssumption[] => {
  const moved: MovedAssumption[] = [];

  if (capitalMoved(recorded, current)) {
    moved.push({
      dimension: "capital",
      label: CAPITAL_LABEL,
      detail: `Funding pressure rose from ${recorded.tightness} to ${current.tightness} (watch line ${recorded.tightnessThreshold}).`,
    });
  }

  if (riskMoved(recorded, current)) {
    moved.push({
      dimension: "risk",
      label: RISK_LABEL,
      detail: `Risk appetite weakened from ${recorded.riskAppetite} to ${current.riskAppetite} (watch line ${recorded.riskAppetiteThreshold}).`,
    });
  }

  return moved;
};

const composeWhy = (moved: MovedAssumption[]): string => {
  if (moved.length >= 2) {
    return `${CAPITAL_LABEL} and ${RISK_LABEL} have moved outside the range recorded when this decision was made.`;
  }
  const first = moved[0];
  if (!first) return "A supporting assumption moved outside the range recorded when this decision was made.";
  return `${first.label} moved outside the range recorded when this decision was made.`;
};

/**
 * Verdict rules (bounded):
 *   RECONSIDER  — two supporting assumptions moved outside the recorded range
 *   WATCH       — one supporting assumption moved outside the recorded range
 *   STAND       — all supporting assumptions remain inside the recorded range
 */
export const assessDecisionStaleness = (
  recorded: DecisionAssumptionSnapshot,
  current: CurrentStalenessConditions,
): DecisionStaleness => {
  const moved = buildMovedAssumptions(recorded, current);

  const verdict: StalenessVerdict =
    moved.length >= 2 ? "RECONSIDER"
      : moved.length === 1 ? "WATCH"
        : "STAND";

  return {
    verdict,
    moved,
    why: moved.length > 0 ? composeWhy(moved) : "Conditions remain inside the range recorded when this decision was made.",
  };
};

export const DecisionStalenessEngine = {
  assess: assessDecisionStaleness,
};

export const stalenessVerdictLabel = (verdict: StalenessVerdict | "no-change"): string => {
  switch (verdict) {
    case "RECONSIDER":
      return "RECONSIDER";
    case "WATCH":
      return "WATCH";
    case "STAND":
    case "no-change":
      return "STAND";
    default:
      return "STAND";
  }
};