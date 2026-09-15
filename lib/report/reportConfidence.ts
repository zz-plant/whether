import type { TreasuryData } from "../types";
import { evaluateRegime } from "../regimeEngine";
import { resolveConfidencePercent as resolveConfidencePercentFromAssessment } from "./confidence";
import type {
  ConfidenceTrendFraming,
  WeeklyConfidencePoint,
} from "./reportDataTypes";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const resolveConfidencePercent = (assessment: ReturnType<typeof evaluateRegime>) =>
  resolveConfidencePercentFromAssessment({
    scores: assessment.scores,
    thresholds: assessment.thresholds,
  });

export const classifyConfidenceTrend = (points: WeeklyConfidencePoint[]): ConfidenceTrendFraming => {
  const values = points
    .filter((point): point is WeeklyConfidencePoint & { confidencePercent: number } => typeof point.confidencePercent === "number")
    .map((point) => point.confidencePercent);

  if (values.length < 3) {
    return "unstable";
  }

  const slope = (values[values.length - 1] - values[0]) / (values.length - 1);
  const averageStepChange =
    values.slice(1).reduce((sum, value, index) => sum + Math.abs(value - values[index]), 0)
    / (values.length - 1);

  if (averageStepChange >= 7 || Math.abs(slope) < 1.5) {
    return "unstable";
  }

  return slope > 0 ? "strengthening" : "weakening";
};

export const buildWeeklyConfidenceSeries = ({
  snapshots,
  currentSnapshot,
  thresholds,
  asOf,
  window = 8,
  resolveGovernedAssessment,
}: {
  snapshots: TreasuryData[];
  currentSnapshot?: TreasuryData;
  thresholds: ReturnType<typeof import("../thresholds").parseThresholdsFromSearchParams>;
  asOf: string;
  window?: number;
  /**
   * The governed assessment for a record date — the threaded walk's, with the
   * month's VIX haircut and market-stress veto applied — or null when the date
   * has none. A point that resolves here is the record; a bare re-evaluation of
   * the curve is the fallback, and in a stress month it measures a boundary
   * distance the record never published (February 2020: risk appetite 51 off
   * the curve, 31 in the record).
   */
  resolveGovernedAssessment?: (recordDate: string) => ReturnType<typeof evaluateRegime> | null;
}): WeeklyConfidencePoint[] => {
  const asOfTime = new Date(asOf).getTime();
  const snapshotsBeforeAsOf = [...snapshots, ...(currentSnapshot ? [currentSnapshot] : [])]
    .filter((snapshot) => {
      const timestamp = new Date(snapshot.record_date).getTime();
      return Number.isFinite(timestamp) && timestamp <= asOfTime;
    })
    .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());

  const deduped = Array.from(
    new Map(snapshotsBeforeAsOf.map((snapshot) => [snapshot.record_date, snapshot])).values(),
  );

  /**
   * The tightening-speed term reads the trailing base-rate window, and these
   * snapshots carry none (monthly cache entries) — so the window is cut from
   * the series' own one-month values, the same way the analog builder does it.
   * Without this, confidence for a tightening month measured a distance the
   * governed record never published.
   */
  const baseRateSeries = deduped.map((snapshot) => ({
    date: snapshot.record_date,
    value: snapshot.yields.oneMonth ?? null,
  }));
  const velocityWindowFor = (recordDate: string) => {
    const atMs = Date.parse(`${recordDate}T00:00:00.000Z`);
    const cutoffMs = atMs - 130 * 24 * 60 * 60 * 1000;
    return baseRateSeries.filter((point) => {
      const pointMs = Date.parse(`${point.date}T00:00:00.000Z`);
      return pointMs <= atMs && pointMs >= cutoffMs;
    });
  };

  const actualPoints = deduped.map((snapshot) => ({
    recordDate: snapshot.record_date,
    confidencePercent: resolveConfidencePercent(
      resolveGovernedAssessment?.(snapshot.record_date)
        ?? evaluateRegime(snapshot, thresholds, [], null, {
          baseRateHistory: velocityWindowFor(snapshot.record_date),
        }),
    ),
    isMissing: false,
  }));

  if (actualPoints.length === 0) {
    return [];
  }

  const withMissing: WeeklyConfidencePoint[] = [];
  for (let index = 0; index < actualPoints.length; index += 1) {
    const current = actualPoints[index];
    withMissing.push(current);

    const next = actualPoints[index + 1];
    if (!next) {
      continue;
    }

    const currentTime = new Date(current.recordDate).getTime();
    const nextTime = new Date(next.recordDate).getTime();
    const missingWeeks = Math.max(0, Math.round((nextTime - currentTime) / WEEK_MS) - 1);

    for (let step = 1; step <= missingWeeks; step += 1) {
      const missingDate = new Date(currentTime + WEEK_MS * step).toISOString().slice(0, 10);
      withMissing.push({
        recordDate: missingDate,
        confidencePercent: null,
        isMissing: true,
      });
    }
  }

  return withMissing.slice(-window);
};
