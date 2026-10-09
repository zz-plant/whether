import type { NormalizedSignalContribution } from "./signalFormatting";
import type { RegimeKey } from "../regimeEngine";

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
 * rate-speed term and the market inputs the record scores, so a move is not
 * only the market moving. `startupMarket` and `credit` stay in the union for
 * what the inputs outside the record would add (`ScoringBasis.notCounted`);
 * since 2026-10-09 neither is a part of a published move.
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
   * The earlier reading's conditions, when they differ from this week's: which way
   * a change of conditions went, for the headline's tone (`resolveWeeklyTone`).
   * Absent when the conditions held or nothing was compared.
   */
  previousRegime?: RegimeKey;
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
   * What every move above is measured against: last week's published brief,
   * or the previous month-end snapshot where the archive has no brief from the
   * previous one to two weeks (`lib/report/comparisonReading.ts`). Surfaces
   * print this date where they used to print "last week" (`comparisonBasis`).
   * Absent when there was no comparison, and where a source did not say which
   * reading it compared with.
   */
  comparedWith?: ComparedWith;
  /**
   * The inputs the earlier reading carries no value for, so no move is recorded
   * for them and none is printed: a row says "—", not "unchanged". Briefs
   * published before 2026-10-07 stored the two scores and not the short-term
   * rate or the recession warning gauge. Absent when every signal was compared.
   */
  notCompared?: Array<"baseRate" | "curveSlope">;
  /**
   * What the move in each score is made of, where the loader could reproduce
   * the score it shows from its inputs. Only against a month-end: that reading
   * is scored from interest rates alone, so the split says which part of a
   * move is an input it never had. Last week's brief was scored the way today's
   * reading is, so there is nothing of that kind to split out. Absent when there
   * was no comparison, and on a replay or a stored snapshot whose score cannot
   * be rebuilt here: a split that does not add up to the number on the page is
   * not printed.
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
  /** "Not compared" for a rate the earlier reading did not record (`ReportDynamics.notCompared`). */
  directionLabel: "Tightening" | "Easing" | "Unchanged" | "Not compared";
  immediateImplication: string;
};

export type WeeklyConfidencePoint = {
  recordDate: string;
  confidencePercent: number | null;
  isMissing: boolean;
};

export type ConfidenceTrendFraming = "strengthening" | "weakening" | "unstable";
