import rawTimeMachineCache from "../../data/time_machine_cache.json";
import type { TreasuryPolicyHistoryPoint } from "../regimeEnginePolicy";

type TimeMachineLikeSnapshot = {
  record_date?: string;
  yields?: {
    oneMonth?: number | null;
    threeMonth?: number | null;
    twoYear?: number | null;
    tenYear?: number | null;
  };
};

const parseRecordDate = (value: string) => {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const treasuryPolicyHistory = (rawTimeMachineCache as TimeMachineLikeSnapshot[])
  .map((snapshot) => {
    const recordDate = snapshot.record_date ?? "";
    const yields = snapshot.yields ?? {};
    const twoYear = yields.twoYear ?? null;
    const tenYear = yields.tenYear ?? null;

    return {
      recordDate,
      baseRate: yields.oneMonth ?? yields.threeMonth ?? null,
      curveSlope:
        typeof tenYear === "number" && typeof twoYear === "number"
          ? tenYear - twoYear
          : null,
    } satisfies TreasuryPolicyHistoryPoint;
  })
  .filter((point) => parseRecordDate(point.recordDate) !== null)
  .sort(
    (left, right) =>
      (parseRecordDate(left.recordDate) ?? Number.NEGATIVE_INFINITY) -
      (parseRecordDate(right.recordDate) ?? Number.NEGATIVE_INFINITY),
  );

/**
 * The month-end rate history the policy composites standardize against, from
 * the bundled Time Machine cache: the default the engine's composition layer
 * (`evaluateRegime`) hands the scorer. The scorer itself takes the history as
 * an argument and imports no data, so what it reads is visible at the call.
 */
export const TREASURY_POLICY_HISTORY: readonly TreasuryPolicyHistoryPoint[] = treasuryPolicyHistory;
