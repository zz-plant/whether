import { DEFAULT_THRESHOLDS } from "../regimeEngine";
import type { TreasuryData } from "../types";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getBaseRateFromTreasury = (treasury: TreasuryData) =>
  treasury.yields.oneMonth ?? treasury.yields.threeMonth ?? DEFAULT_THRESHOLDS.baseRateTightness;

const getCurveSlopeFromTreasury = (treasury: TreasuryData) => {
  const { tenYear, twoYear } = treasury.yields;
  return typeof tenYear === "number" && typeof twoYear === "number" ? tenYear - twoYear : -1;
};

export const applyScenarioOverridesToTreasury = ({
  treasury,
  tightness,
  riskAppetite,
}: {
  treasury: TreasuryData;
  tightness: number | null;
  riskAppetite: number | null;
}): TreasuryData => {
  if (tightness === null && riskAppetite === null) {
    return treasury;
  }

  const currentBaseRate = getBaseRateFromTreasury(treasury);
  const currentCurveSlope = getCurveSlopeFromTreasury(treasury);

  const curveSlope =
    riskAppetite === null ? currentCurveSlope : clamp(-1 + (riskAppetite / 100) * 2.5, -1, 1.5);

  const inversionPoints = curveSlope < 0 ? Math.min(25, Math.round(Math.abs(curveSlope) * 50)) : 0;
  const baseRate =
    tightness === null
      ? currentBaseRate
      : DEFAULT_THRESHOLDS.baseRateTightness +
        clamp(Math.round(tightness) - inversionPoints, 0, 90) / 180;

  const twoYear = treasury.yields.twoYear ?? 0;

  return {
    ...treasury,
    yields: {
      ...treasury.yields,
      oneMonth: baseRate,
      threeMonth: baseRate,
      twoYear,
      tenYear: twoYear + curveSlope,
    },
  };
};
