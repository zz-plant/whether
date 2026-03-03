export interface SignalStats {
  mean: number;
  stdDev: number;
}

export type DirectionalMode = "HIGHER_IS_TIGHTER" | "HIGHER_IS_LOOSER";

const MIN_STD_DEV = 1e-9;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const computeZScore = (value: number, stats: SignalStats) => {
  const safeStdDev = Math.max(Math.abs(stats.stdDev), MIN_STD_DEV);
  return (value - stats.mean) / safeStdDev;
};

export const directionalNormalize = (zScore: number, direction: DirectionalMode) => {
  return direction === "HIGHER_IS_TIGHTER" ? zScore : -zScore;
};

export const clipZScore = (zScore: number, zClip: number) => {
  return clamp(zScore, -Math.abs(zClip), Math.abs(zClip));
};

export const computeCompositeScore = (first: number, firstWeight: number, second: number, secondWeight: number) => {
  return first * firstWeight + second * secondWeight;
};

export const computeVolatility = (values: number[]) => {
  if (values.length <= 1) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};
