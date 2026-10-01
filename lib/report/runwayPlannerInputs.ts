/**
 * Turns the operator's stored figures into a runway planner request, or says
 * which figures are missing.
 *
 * The planner used to open pre-filled with a fictional company and clamp an
 * emptied field to zero, so a blank runway box read as "one month, critical".
 * Here a blank is a missing input and the caller shows what to enter instead
 * of a verdict about nobody's company. Growth is the one optional figure: a
 * blank means flat, and the output says so.
 */
import { resolveProfileRunway, type OperatorProfile } from "../operatorProfile";
import { plannerStageForOperatorStage, type OperatorStage } from "./operatorStage";
import type { RunwayPlannerRequest } from "./runwayPlanner";

type RunwayPlannerRequiredField = "runwayMonths" | "monthlyBurnUsd" | "monthlyRevenueUsd";

const RUNWAY_PLANNER_REQUIRED_FIELDS: readonly RunwayPlannerRequiredField[] = [
  "runwayMonths",
  "monthlyBurnUsd",
  "monthlyRevenueUsd",
];

const FIELD_LABELS: Record<RunwayPlannerRequiredField, string> = {
  runwayMonths: "cash in the bank (or runway)",
  monthlyBurnUsd: "monthly spend",
  monthlyRevenueUsd: "monthly revenue",
};

type RunwayPlannerInputResolution =
  | { ready: true; request: RunwayPlannerRequest; growthAssumedFlat: boolean }
  /** `cashFlowPositive`: revenue covers spending, so there is no runway to plan against. */
  | { ready: false; missing: RunwayPlannerRequiredField[]; cashFlowPositive?: boolean };

/**
 * Runway is the one figure the planner can work out rather than ask for: cash
 * in the bank over spend less revenue (`resolveProfileRunway`). It counts as
 * missing until either that or a typed runway is there.
 */
export const resolveRunwayPlannerRequest = (
  profile: OperatorProfile,
  stage: OperatorStage | null,
): RunwayPlannerInputResolution => {
  const runway = resolveProfileRunway(profile);
  if (runway?.basis === "cash-flow-positive") {
    return { ready: false, missing: [], cashFlowPositive: true };
  }
  const runwayMonths = runway?.months;
  const burn = profile.monthlyBurnUsd;
  const revenue = profile.monthlyRevenueUsd;
  if (runwayMonths === undefined || burn === undefined || revenue === undefined) {
    const given: Record<RunwayPlannerRequiredField, boolean> = {
      runwayMonths: runwayMonths !== undefined,
      monthlyBurnUsd: burn !== undefined,
      monthlyRevenueUsd: revenue !== undefined,
    };
    return { ready: false, missing: RUNWAY_PLANNER_REQUIRED_FIELDS.filter((field) => !given[field]) };
  }

  return {
    ready: true,
    growthAssumedFlat: profile.monthlyGrowthPct === undefined,
    request: {
      runway: runwayMonths,
      burn,
      revenue,
      growthRate: profile.monthlyGrowthPct ?? 0,
      sector: profile.sector ?? "b2b-saas",
      stage: plannerStageForOperatorStage[stage ?? "series-a"],
    },
  };
};

const joinNaturally = (items: string[]) => {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

/** "Enter cash in the bank (or runway), monthly spend, and monthly revenue to size the plan." */
export const describeMissingRunwayInputs = (missing: RunwayPlannerRequiredField[]): string =>
  `Enter ${joinNaturally(missing.map((field) => FIELD_LABELS[field]))} to size the plan.`;

/** What the planner says instead of a plan when no cash is being spent down. */
export const CASH_FLOW_POSITIVE_PLANNER_NOTE =
  "Revenue covers your spending, so cash is not running down and there is no runway to size a raise or a cut against. The rules on the brief still apply to new commitments.";
