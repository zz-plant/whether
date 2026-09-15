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
import type { OperatorProfile } from "../operatorProfile";
import { plannerStageForOperatorStage, type OperatorStage } from "./operatorStage";
import type { RunwayPlannerRequest } from "./runwayPlanner";

type RunwayPlannerRequiredField = "runwayMonths" | "monthlyBurnUsd" | "monthlyRevenueUsd";

const RUNWAY_PLANNER_REQUIRED_FIELDS: readonly RunwayPlannerRequiredField[] = [
  "runwayMonths",
  "monthlyBurnUsd",
  "monthlyRevenueUsd",
];

const FIELD_LABELS: Record<RunwayPlannerRequiredField, string> = {
  runwayMonths: "runway",
  monthlyBurnUsd: "monthly burn",
  monthlyRevenueUsd: "monthly revenue",
};

type RunwayPlannerInputResolution =
  | { ready: true; request: RunwayPlannerRequest; growthAssumedFlat: boolean }
  | { ready: false; missing: RunwayPlannerRequiredField[] };

export const resolveRunwayPlannerRequest = (
  profile: OperatorProfile,
  stage: OperatorStage | null,
): RunwayPlannerInputResolution => {
  const missing = RUNWAY_PLANNER_REQUIRED_FIELDS.filter((field) => profile[field] === undefined);
  if (missing.length > 0) {
    return { ready: false, missing };
  }

  return {
    ready: true,
    growthAssumedFlat: profile.monthlyGrowthPct === undefined,
    request: {
      runway: profile.runwayMonths!,
      burn: profile.monthlyBurnUsd!,
      revenue: profile.monthlyRevenueUsd!,
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

/** "Enter runway, monthly burn, and monthly revenue to size the plan." */
export const describeMissingRunwayInputs = (missing: RunwayPlannerRequiredField[]): string =>
  `Enter ${joinNaturally(missing.map((field) => FIELD_LABELS[field]))} to size the plan.`;
