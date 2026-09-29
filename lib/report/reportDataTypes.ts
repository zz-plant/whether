import type { NormalizedSignalContribution } from "./signalFormatting";

export type LastYearComparison = {
  current: {
    recordDate: string;
    regime: string;
    tightness: number;
    riskAppetite: number;
    curveSlope: number | null;
    baseRate: number;
  };
  prior: {
    recordDate: string;
    regime: string;
    tightness: number;
    riskAppetite: number;
    curveSlope: number | null;
    baseRate: number;
  };
};

export type AnalogScoreDimensions = {
  postureMatch: number;
  trendDirection: number;
  confidence: number;
  distanceToFlip: number;
};

export type HistoricalAnalog = {
  recordDate: string;
  score: number;
  dimensions: AnalogScoreDimensions;
  implication: string;
};

/** The earlier reading a week's moves are measured against (`lib/report/comparisonBasis.ts`). */
export type ComparedWith = {
  /** The earlier reading's record date, ISO. */
  recordDate: string;
  /** How that date prints in a column head or a sentence: "Aug 31". */
  label: string;
};

/**
 * What a score's move is made of (`lib/report/scoreMovement.ts`). The earlier
 * reading is scored from interest rates alone; today's also carries the
 * rate-speed term and the market inputs, so a move is not only the market
 * moving.
 */
export type ScoreMovementSource = "rates" | "curve" | "rateSpeed" | "credit" | "startupMarket" | "marketStress";

export type ScoreMovement = {
  /** Points each source added to the score, signed, in the order they are named. Zeros are left out. */
  parts: Array<{ source: ScoreMovementSource; points: number }>;
};

export type ReportDynamics = {
  changedSignals: Array<{
    key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
    label: string;
    delta: number;
  }>;
  anomalySignals: Array<{
    key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
    label: string;
    delta: number;
    reason: string;
  }>;
  totalSignalChanges: number;
  regimeChanged: boolean;
  /**
   * Which way the week moved — or `"unavailable"` when there was no previous
   * reading to compare against, which is not the same fact as "nothing moved".
   *
   * Both no-previous constructions used to say `"stable"`: `buildReportDynamics`
   * with `previous: null`, and the fallback dynamics the loader builds when the
   * live read fails. Downstream that became "Conditions held steady this week.
   * Last week's calls stand." on the homepage and "No worse than last week" on
   * the social card — two affirmative claims about a comparison nobody made,
   * published on exactly the path where the product knows least.
   */
  directionLabel: "improving" | "deteriorating" | "mixed" | "stable" | "unavailable";
  /**
   * What every move above is measured against. The loader compares with the
   * previous Time Machine snapshot, which is monthly, so this is usually the
   * last month-end and not last week; surfaces print this date where they
   * used to print "last week" (`comparisonBasis`). Absent when there was no
   * comparison, and where a source did not say which reading it compared with.
   */
  comparedWith?: ComparedWith;
  /**
   * What the move in each score is made of, where the loader could reproduce
   * the score it shows from its inputs. Absent when there was no comparison,
   * and on a replay or a stored snapshot whose score cannot be rebuilt here:
   * a split that does not add up to the number on the page is not printed.
   */
  movement?: Partial<Record<"tightness" | "riskAppetite", ScoreMovement>>;
  signalContributions?: NormalizedSignalContribution[];
};

export type ReportEvidenceItem = {
  key: ReportDynamics["changedSignals"][number]["key"];
  title: string;
  lastUpdated?: string | null;
  supportingBullets: string[];
  confidenceLabel: string;
  directionLabel: "Tightening" | "Easing" | "Unchanged";
  immediateImplication: string;
};

export type WeeklyConfidencePoint = {
  recordDate: string;
  confidencePercent: number | null;
  isMissing: boolean;
};

export type ConfidenceTrendFraming = "strengthening" | "weakening" | "unstable";
