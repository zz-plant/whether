import rawTimeMachineCache from "../../data/time_machine_cache.json";

type TimeMachineLikeSnapshot = {
  record_date?: string;
  yields?: {
    oneMonth?: number | null;
    threeMonth?: number | null;
    twoYear?: number | null;
    tenYear?: number | null;
  };
};

type TreasuryPolicyHistoryPoint = {
  recordDate: string;
  baseRate: number | null;
  curveSlope: number | null;
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

export const getTreasuryPolicyHistory = ({
  asOf,
  months,
}: {
  asOf: string;
  months: number;
}) => {
  const asOfTimestamp = parseRecordDate(asOf);
  if (asOfTimestamp === null) {
    return [];
  }

  const historicalPoints = treasuryPolicyHistory.filter((point) => {
    const pointTimestamp = parseRecordDate(point.recordDate);
    return pointTimestamp !== null && pointTimestamp < asOfTimestamp;
  });

  return historicalPoints.slice(-Math.max(months, 1));
};
