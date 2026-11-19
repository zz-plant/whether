import {
  BASE_RATE_TIGHTNESS_MULTIPLIER,
  BASE_RATE_VELOCITY_LOOKBACK_DAYS,
  BASE_RATE_VELOCITY_MULTIPLIER,
  BASE_RATE_VELOCITY_POINTS,
  BASE_RATE_VELOCITY_THRESHOLD,
  CURVE_INVERSION_TIGHTNESS_MULTIPLIER,
  RISK_APPETITE_MAX_SLOPE,
  RISK_APPETITE_MIN_SLOPE,
  RISK_APPETITE_REGIME_THRESHOLD,
  TIGHTNESS_BASE_RATE_POINTS,
  TIGHTNESS_INVERSION_POINTS,
  computeTightnessScore,
  type RegimeAssessment,
} from "../regimeEngineCore";
import { MACRO_ADJUSTMENT_CONSTANTS } from "../regimeEngineDiagnostics";
import type { evaluateRegime } from "../regimeEngine";
import type { MacroSeriesId, MacroSeriesReading, TreasuryData } from "../types";
import { ruleMetricLabel, type RuleConditionMetric } from "./boundedDecisionRules";
import { BASE_RATE_SOURCE_LABELS } from "./regimeDescription";
import { scoreSourceLabel } from "./scoreMovement";
import { describeNotCountedScore, type ScoringBasis } from "./scoringBasis";

/**
 * How this week's two scores are built, input by input.
 *
 * `/trust` printed the formulas with their constants and never this week's
 * numbers, so "Rates are the biggest single input to funding pressure" (the
 * note on `/signals`) was a claim a reader could not check against the week.
 * This splits each published score into the points each input gave it, in the
 * engine's order, so the parts add up to the published score exactly; the
 * sentence a reader copies and the bars drawn beside it both read this object.
 *
 * The parts are the inputs scored in stages by the engine itself, as
 * `explainScoreMovement` does: rates alone (the rate ramp, then the curve's
 * inversion on top of it), then with the rate-speed history, then as
 * published, which adds the market reads the record scores. Each stage is a
 * whole number, so the differences are whole and sum to the score. When the
 * stages do not rebuild the published scores (a stored reading an earlier
 * engine scored), there is no split to trust and this returns null, and the
 * page prints neither the sentence nor the bars.
 *
 * The inputs the published score leaves out are not part of the sum. What they
 * would add is the scoring basis's own entry (`ScoringBasis.notCounted`), the
 * object the "Not counted: …" sentence is printed from, drawn apart from the
 * counted parts.
 */

export type CompositionSource =
  | "rateLevel"
  | "inversion"
  | "rateSpeed"
  | "financialConditions"
  | "curve"
  | "marketStress"
  | "credit"
  | "startupMarket";

type CompositionMetric = RuleConditionMetric;

export type CompositionPart = {
  source: CompositionSource;
  /** The input as a heading: "Short-term borrowing rate". */
  name: string;
  /** The input inside a sentence: "the short-term borrowing rate". */
  clause: string;
  /** The points it gave the score, signed. */
  points: number;
  /** Where it sits on the score's 0–100 scale, lower end first: the running total before it and after it. */
  from: number;
  to: number;
  /** This reading of the input: "1-month Treasury bill 4.10%". */
  reading: string;
  /** How the score weighs it: "180 points for each percentage point above 3.5%, at most 90". */
  weight: string;
  /** Where to read the input at its source. */
  sources: Array<{ label: string; url: string }>;
  /** False for the inputs the published score leaves out. */
  counted: boolean;
};

export type ScoreComposition = {
  metric: CompositionMetric;
  /** "Funding pressure". */
  label: string;
  published: number;
  /** The counted inputs in the engine's order; their points sum to `published`. */
  parts: CompositionPart[];
  /** What the inputs left out would add, from the scoring basis; null when they would add nothing. */
  notCounted: CompositionPart | null;
  /** The counted input with the most points either way, null when every part is zero: "the biggest single input". */
  largest: CompositionSource | null;
  /** The arithmetic as one copyable sentence: "Funding pressure 90 = 90 from the short-term borrowing rate + 0 from …". */
  sentence: string;
  /** "Not counted: -11 from startup-market inputs.", the line `/signals` prints under the score; null when nothing is left out. */
  notCountedSentence: string | null;
};

type Evaluate = typeof evaluateRegime;

const upperFirst = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
const withoutArticle = (value: string) => value.replace(/^the /, "");

const PERCENT = (value: number) => `${value.toFixed(2)}%`;
const POINTS_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const formatNumber = (value: number) => POINTS_FORMAT.format(value).replace("-", "−");
const pointsWord = (value: number) => `${formatNumber(value)} ${value === 1 ? "point" : "points"}`;

/* The curve, in words a reader without the desk shorthand can follow: where the
   10-year sits against the 2-year, in percentage points. */
const describeCurve = (slope: number | null) => {
  if (slope === null) return "No 10-year or 2-year reading, so the curve is scored as fully inverted";
  const gap = Math.abs(slope).toFixed(2);
  if (Number(gap) === 0) return "10-year rate level with the 2-year";
  return `10-year rate ${gap} points ${slope > 0 ? "above" : "below"} the 2-year`;
};

const macroReading = (macroSeries: readonly MacroSeriesReading[], id: MacroSeriesId) =>
  macroSeries.find((entry) => entry.id === id);

const macroSources = (macroSeries: readonly MacroSeriesReading[], ids: readonly MacroSeriesId[]) =>
  ids.flatMap((id) => {
    const reading = macroReading(macroSeries, id);
    return reading?.sourceUrl ? [{ label: reading.sourceLabel || reading.label, url: reading.sourceUrl }] : [];
  });

const describeMacro = (
  macroSeries: readonly MacroSeriesReading[],
  id: MacroSeriesId,
  name: string,
  format: (value: number) => string,
) => {
  const value = macroReading(macroSeries, id)?.value;
  return typeof value === "number" ? `${name} ${format(value)}` : `${name}: no reading`;
};

const adj = MACRO_ADJUSTMENT_CONSTANTS;

/* Funding pressure stops at 100, and the terms can add up past it, so a term
   that lands on the ceiling gives only the points below it. */
const TIGHTNESS_CEILING = 100;
const ceilingNote = (stageTotal: number, weight: string) =>
  stageTotal >= TIGHTNESS_CEILING ? `${weight}. The score stops at ${TIGHTNESS_CEILING}, so only the points below it count` : weight;

/** Lays the parts end to end on the 0–100 scale: a part that adds runs up from the total before it, one that subtracts runs back down. */
const placeParts = (parts: ReadonlyArray<Omit<CompositionPart, "from" | "to">>): CompositionPart[] => {
  let running = 0;
  return parts.map((part) => {
    const before = running;
    running += part.points;
    return { ...part, from: Math.min(before, running), to: Math.max(before, running) };
  });
};

const signedTerm = (points: number, index: number) => {
  if (index === 0) return formatNumber(points);
  return points < 0 ? `− ${formatNumber(Math.abs(points))}` : `+ ${formatNumber(points)}`;
};

const describeComposition = (label: string, published: number, parts: readonly CompositionPart[]) =>
  `${label} ${published} = ${parts.map((part, index) => `${signedTerm(part.points, index)} from ${part.clause}`).join(" ")}.`;

const largestSource = (parts: readonly CompositionPart[]): CompositionSource | null => {
  const largest = parts.reduce<CompositionPart | null>(
    (best, part) => (part.points !== 0 && (!best || Math.abs(part.points) > Math.abs(best.points)) ? part : best),
    null,
  );
  return largest?.source ?? null;
};

/*
 * The inputs a score leaves out, drawn apart from the sum: the basis's entry
 * for that score, its points the gap between the score with them counted and
 * the published one.
 */
const notCountedPart = (
  metric: CompositionMetric,
  basis: Pick<ScoringBasis, "notCounted"> | undefined,
  macroSeries: readonly MacroSeriesReading[],
): CompositionPart | null => {
  const entry = basis?.notCounted.find((candidate) => candidate.metric === metric);
  if (!entry) return null;
  const points = entry.score - entry.published;
  const isStartupMarket = entry.source === "startupMarket";
  return {
    source: isStartupMarket ? "startupMarket" : "credit",
    name: upperFirst(withoutArticle(entry.label)),
    clause: entry.label,
    points,
    from: Math.min(entry.published, entry.score),
    to: Math.max(entry.published, entry.score),
    reading: isStartupMarket
      ? `${describeMacro(macroSeries, "VC_FUNDING_VELOCITY", "Venture funding pace", (value) => `${formatNumber(value)}% on the quarter`)}; ${describeMacro(
          macroSeries,
          "TECH_LAYOFF_TREND",
          "tech-layoff index",
          formatNumber,
        )}`
      : describeMacro(macroSeries, "HY_CREDIT_SPREAD", "High-yield credit spread", PERCENT),
    weight: isStartupMarket
      ? `A funding pace of ${formatNumber(adj.vcVelocitySlowdownThreshold)}% or worse would subtract up to ${adj.vcVelocityRiskAppetiteCap}, and a layoff index of ${adj.layoffPressureThreshold} or more up to ${adj.layoffRiskAppetiteCap}. Left out because their data doesn't go back far enough to check against past months`
      : `At ${adj.hySpreadStressThreshold}% or more it would add up to ${adj.hySpreadTightnessCap}. Left out because its data doesn't go back far enough to check against past months`,
    sources: macroSources(macroSeries, isStartupMarket ? ["VC_FUNDING_VELOCITY", "TECH_LAYOFF_TREND"] : ["HY_CREDIT_SPREAD"]),
    counted: false,
  };
};

/**
 * Both scores of a reading, split into what each input gave them, or null when
 * the engine's stages cannot rebuild the published scores from the inputs in
 * hand. `evaluate` is the loader's own `evaluateRegime`, so every part comes
 * from the engine's arithmetic and not from a second copy of it.
 */
export const buildScoreComposition = ({
  assessment,
  treasury,
  macroSeries,
  treasurySource,
  scoringBasis,
  evaluate,
}: {
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">;
  treasury: TreasuryData;
  macroSeries: readonly MacroSeriesReading[];
  /** Where the Treasury rates are read: the source board's own link and label. */
  treasurySource: { label: string; url: string | undefined };
  scoringBasis?: Pick<ScoringBasis, "notCounted">;
  evaluate: Evaluate;
}): { tightness: ScoreComposition; riskAppetite: ScoreComposition } | null => {
  const { thresholds, scores: published } = assessment;
  const context = { baseRateHistory: treasury.oneMonthHistory };
  const ratesOnly = evaluate(treasury, thresholds).scores;
  const withRateSpeed = evaluate(treasury, thresholds, [], null, context).scores;
  const rebuilt = evaluate(treasury, thresholds, [...macroSeries], null, context).scores;
  if (rebuilt.tightness !== published.tightness || rebuilt.riskAppetite !== published.riskAppetite) return null;

  /* The rate ramp alone: the same scorer with a curve that is not inverted, so the inversion term reads 0. */
  const baseRateForScore = ratesOnly.baseRateUsed === "MISSING" ? thresholds.baseRateTightness : ratesOnly.baseRate;
  const rateLevel = computeTightnessScore(baseRateForScore, 0, thresholds.baseRateTightness);
  const rateSources = treasurySource.url ? [{ label: treasurySource.label, url: treasurySource.url }] : [];
  const saturationRate = thresholds.baseRateTightness + TIGHTNESS_BASE_RATE_POINTS / BASE_RATE_TIGHTNESS_MULTIPLIER;
  const rateLabel = BASE_RATE_SOURCE_LABELS[ratesOnly.baseRateUsed].replace(/^The /, "");

  const tightnessParts = placeParts([
    {
      source: "rateLevel",
      name: "Short-term borrowing rate",
      clause: "the short-term borrowing rate",
      points: rateLevel,
      reading:
        ratesOnly.baseRateUsed === "MISSING"
          ? `No short-term rate on record, so it is scored at ${thresholds.baseRateTightness}%`
          : `${upperFirst(rateLabel)} ${PERCENT(ratesOnly.baseRate)}`,
      weight: `${BASE_RATE_TIGHTNESS_MULTIPLIER} points for each percentage point above ${thresholds.baseRateTightness}%, at most ${TIGHTNESS_BASE_RATE_POINTS}, which it reaches at ${saturationRate.toFixed(1)}%`,
      sources: rateSources,
      counted: true,
    },
    {
      source: "inversion",
      name: "Yield curve's inversion",
      clause: "the yield curve's inversion",
      points: ratesOnly.tightness - rateLevel,
      reading: describeCurve(ratesOnly.curveSlope),
      weight: ceilingNote(
        ratesOnly.tightness,
        `${CURVE_INVERSION_TIGHTNESS_MULTIPLIER} points for each percentage point the 10-year rate sits below the 2-year, at most ${TIGHTNESS_INVERSION_POINTS}; none while it sits above`,
      ),
      sources: rateSources,
      counted: true,
    },
    {
      source: "rateSpeed",
      name: upperFirst(withoutArticle(scoreSourceLabel("tightness", "rateSpeed"))),
      clause: scoreSourceLabel("tightness", "rateSpeed"),
      points: withRateSpeed.tightness - ratesOnly.tightness,
      reading:
        typeof withRateSpeed.baseRateVelocityDelta === "number"
          ? `Short-term rate ${withRateSpeed.baseRateVelocityDelta >= 0 ? "up" : "down"} ${Math.abs(withRateSpeed.baseRateVelocityDelta).toFixed(2)} points over ${BASE_RATE_VELOCITY_LOOKBACK_DAYS} days`
          : `Not enough rate history in this reading to measure ${BASE_RATE_VELOCITY_LOOKBACK_DAYS} days`,
      weight: ceilingNote(
        withRateSpeed.tightness,
        `${BASE_RATE_VELOCITY_MULTIPLIER} points for each percentage point the rate rose over ${BASE_RATE_VELOCITY_LOOKBACK_DAYS} days beyond ${BASE_RATE_VELOCITY_THRESHOLD}, at most ${BASE_RATE_VELOCITY_POINTS}`,
      ),
      sources: rateSources,
      counted: true,
    },
    {
      source: "financialConditions",
      name: upperFirst(withoutArticle(scoreSourceLabel("tightness", "financialConditions"))),
      clause: scoreSourceLabel("tightness", "financialConditions"),
      points: published.tightness - withRateSpeed.tightness,
      reading: describeMacro(macroSeries, "CHICAGO_FCI", "Chicago Fed index", formatNumber),
      weight: ceilingNote(published.tightness, `At ${adj.chicagoFciTighteningThreshold} or above it adds up to ${adj.chicagoFciTightnessCap}`),
      sources: macroSources(macroSeries, ["CHICAGO_FCI"]),
      counted: true,
    },
  ]);

  const riskAppetiteParts = placeParts([
    {
      source: "curve",
      name: upperFirst(withoutArticle(scoreSourceLabel("riskAppetite", "curve"))),
      clause: scoreSourceLabel("riskAppetite", "curve"),
      points: ratesOnly.riskAppetite,
      reading: describeCurve(ratesOnly.curveSlope),
      weight: `0 with the 10-year rate ${pointsWord(Math.abs(RISK_APPETITE_MIN_SLOPE))} below the 2-year, 100 with it ${pointsWord(RISK_APPETITE_MAX_SLOPE)} above, and a straight line between`,
      sources: rateSources,
      counted: true,
    },
    {
      source: "marketStress",
      name: upperFirst(withoutArticle(scoreSourceLabel("riskAppetite", "marketStress"))),
      clause: scoreSourceLabel("riskAppetite", "marketStress"),
      points: published.riskAppetite - withRateSpeed.riskAppetite,
      reading: describeMacro(macroSeries, "VIX_INDEX", "The VIX", formatNumber),
      weight: `At ${adj.vixShockThreshold} or above it subtracts up to ${adj.vixRiskAppetiteCap}; a ${adj.vixVetoMeanWindow}-reading average of ${adj.vixMarketStressVetoMean} or more caps the score at ${RISK_APPETITE_REGIME_THRESHOLD}`,
      sources: macroSources(macroSeries, ["VIX_INDEX"]),
      counted: true,
    },
  ]);

  const compose = (metric: CompositionMetric, parts: CompositionPart[]): ScoreComposition => {
    const label = ruleMetricLabel[metric];
    return {
      metric,
      label,
      published: published[metric],
      parts,
      notCounted: notCountedPart(metric, scoringBasis, macroSeries),
      largest: largestSource(parts),
      sentence: describeComposition(label, published[metric], parts),
      notCountedSentence: describeNotCountedScore(metric, scoringBasis),
    };
  };

  return { tightness: compose("tightness", tightnessParts), riskAppetite: compose("riskAppetite", riskAppetiteParts) };
};
