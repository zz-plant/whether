/**
 * This week's reading at another short rate, everything else held where it is.
 *
 * Funding pressure's biggest input is the short rate the engine reads (the 1-month bill,
 * `getBaseRate`), and a reader meets that rate in the news as Fed moves. Two surfaces ask
 * what a move would do: the brief's conditions chart plots the reading after one, two or
 * three quarter-point Fed cuts (and a hike), and `/trust` redraws funding pressure's
 * composition at any rate on a range. Both read this module, so they cannot disagree.
 *
 * Every number here is the engine's own: the reading's treasury with the rate moved
 * one-for-one, re-scored by `evaluateRegime` with the same thresholds, market inputs and
 * rate history, as `buildScoreComposition` re-scores it in stages. The rate history is the
 * week's, so the tightening-speed term stays what it is this week, as does the curve and
 * every market input: "everything else as this week". When the stages cannot rebuild the
 * published scores from the inputs in hand (a stored reading an earlier engine scored),
 * there is no rate to move and nothing is returned.
 */
import type { evaluateRegime } from "../regimeEngine";
import {
  BASE_RATE_TIGHTNESS_MULTIPLIER,
  TIGHTNESS_BASE_RATE_POINTS,
  computeTightnessScore,
  type RegimeAssessment,
  type RegimeScores,
} from "../regimeEngineCore";
import type { MacroSeriesReading, TreasuryData, TreasuryYields } from "../types";
import type { BoundedDecisionRule } from "./boundedDecisionRules";
import { describeWholeFedSteps, FED_STEP, formatShortRate } from "./fedSteps";
import { BASE_RATE_SOURCE_LABELS } from "./regimeDescription";
import { areaChangesAt, describeAreaChanges, describeConditionsChange, type RuleChartRateMove } from "./ruleRegions";
import { buildScoreComposition, type CompositionSource, type ScoreComposition } from "./scoreComposition";

type Evaluate = typeof evaluateRegime;

type Scores = { tightness: number; riskAppetite: number };

type ReadingInputs = {
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">;
  treasury: TreasuryData;
  macroSeries: readonly MacroSeriesReading[];
  evaluate: Evaluate;
};

type MovableRate = Exclude<RegimeScores["baseRateUsed"], "MISSING">;

/* The field of the reading each base rate is read from (`getBaseRate`). */
const RATE_FIELD: Record<MovableRate, keyof TreasuryYields> = { FED: "fedFunds", "1M": "oneMonth", "3M": "threeMonth" };

/** The rate as a reader names it, without the instrument's desk name: "the 1-month rate". */
const RATE_NAME: Record<MovableRate, string> = {
  FED: "the federal funds rate",
  "1M": "the 1-month rate",
  "3M": "the 3-month rate",
};

const round2 = (value: number) => Math.round(value * 100) / 100;
const upperFirst = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
const sameScores = (left: Scores, right: Scores) => left.tightness === right.tightness && left.riskAppetite === right.riskAppetite;

const isMovable = (used: RegimeScores["baseRateUsed"]): used is MovableRate => used !== "MISSING";

/**
 * The engine at another rate, or null when there is no rate to move: the reading had no
 * short rate, or re-scoring it does not give back the published scores.
 */
const rateScorer = ({ assessment, treasury, macroSeries, evaluate }: ReadingInputs) => {
  const used = assessment.scores.baseRateUsed;
  if (!isMovable(used)) return null;
  const field = RATE_FIELD[used];
  const context = { baseRateHistory: treasury.oneMonthHistory };
  const treasuryAt = (rate: number): TreasuryData => ({ ...treasury, yields: { ...treasury.yields, [field]: rate } });
  const assessmentAt = (rate: number) => evaluate(treasuryAt(rate), assessment.thresholds, [...macroSeries], null, context);
  const rebuilt = assessmentAt(assessment.scores.baseRate).scores;
  if (!sameScores(rebuilt, assessment.scores)) return null;
  return { used, rate: assessment.scores.baseRate, name: RATE_NAME[used], treasuryAt, assessmentAt };
};

const STEP_LABELS: Record<RuleChartRateMove["key"], string> = {
  "cut-1": "After one Fed cut",
  "cut-2": "After two",
  "cut-3": "After three",
  "hike-1": "After one Fed hike",
};

const MOVES: ReadonlyArray<{ key: RuleChartRateMove["key"]; steps: number }> = [
  { key: "cut-1", steps: -1 },
  { key: "cut-2", steps: -2 },
  { key: "cut-3", steps: -3 },
  { key: "hike-1", steps: 1 },
];

/**
 * This week's reading after one, two and three quarter-point Fed cuts and one hike, each
 * moving the short rate one-for-one with everything else as this week, for the brief's
 * conditions chart (`buildRuleChartModel` judges each against the areas' rules). A step
 * that moves neither score past the step before it is left out: once a cut takes the rate
 * under the point where it adds to funding pressure, a second and third draw the same
 * picture, and a hike above the point where the rate tops out moves nothing. Empty when
 * there is no rate to move.
 */
export const buildRateMoves = (inputs: ReadingInputs): RuleChartRateMove[] => {
  const scorer = rateScorer(inputs);
  if (!scorer) return [];
  const published = inputs.assessment.scores;
  let previous: Scores = published;
  return MOVES.flatMap(({ key, steps }) => {
    const rate = Math.max(0, round2(scorer.rate + steps * FED_STEP));
    const { tightness, riskAppetite } = scorer.assessmentAt(rate).scores;
    const scores = { tightness, riskAppetite };
    /* A cut is measured against the cut before it; the hike against this week. */
    const before = steps > 0 ? published : previous;
    if (steps < 0) previous = scores;
    if (sameScores(scores, before)) return [];
    const moved = [
      tightness !== published.tightness ? `funding pressure to ${tightness}` : null,
      riskAppetite !== published.riskAppetite ? `risk appetite to ${riskAppetite}` : null,
    ].filter((part): part is string => part !== null);
    const steppedBy = describeWholeFedSteps(steps);
    return [{
      key,
      tightness,
      riskAppetite,
      label: STEP_LABELS[key],
      name: `After ${steppedBy}`,
      how: `${upperFirst(steppedBy)} would take ${scorer.name} to ${formatShortRate(rate)} and ${moved.join(" and ")}, with everything else as this week.`,
    }];
  });
};

/* The rate component tops out at this many points, at this far above where it starts. */
const RATE_SCAN_STEPS = Math.ceil((TIGHTNESS_BASE_RATE_POINTS / BASE_RATE_TIGHTNESS_MULTIPLIER) * 100);

/**
 * Whether the short rate makes the whole of funding pressure this week: the composition's
 * rate part is the published score and every other counted part gave nothing. Only then
 * does a funding-pressure value stand for one rate.
 */
const rateMakesWholeScore = (composition: ScoreComposition) =>
  composition.parts.every((part) => (part.source === "rateLevel" ? part.points === composition.published : part.points === 0));

/**
 * The short rate at which funding pressure reaches each value, for the labels beside the
 * conditions chart's funding-pressure lines; undefined (draw nothing, say nothing) unless
 * the rate makes the whole score this week (`buildScoreComposition` decides). The rate is
 * the lowest, to the hundredth, at which the engine's own rate ramp (`computeTightnessScore`,
 * the part the composition reads) reaches the value; a value at or past the ramp's top, or
 * at or under zero, has no one rate and returns null.
 */
export const fundingPressureRateLookup = ({
  composition,
  assessment,
}: {
  composition: { tightness: ScoreComposition } | null;
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">;
}): { name: string; at: (value: number) => number | null } | undefined => {
  const used = assessment.scores.baseRateUsed;
  if (!composition || !isMovable(used) || !rateMakesWholeScore(composition.tightness)) return undefined;
  const start = assessment.thresholds.baseRateTightness;
  return {
    /* "1-month rate": a label beside numbers, so without the article. */
    name: RATE_NAME[used].replace(/^the /, ""),
    at: (value) => {
      if (!(value > 0) || value >= TIGHTNESS_BASE_RATE_POINTS) return null;
      for (let step = 1; step <= RATE_SCAN_STEPS; step += 1) {
        const rate = round2(start + step / 100);
        if (computeTightnessScore(rate, 0, start) >= value) return rate;
      }
      return null;
    },
  };
};

export type RateDialStop = {
  /** The stretch of the control this stop covers, inclusive, in hundredths of a point. */
  from: number;
  to: number;
  tightness: number;
  /** Funding pressure's parts at this rate that gave it points, in the composition's order, laid out on 0–100; a part left out gave none. */
  parts: Array<{ source: CompositionSource; points: number; from: number; to: number }>;
  /** What would move, first: "Hiring would restart. Conditions would turn Cloudy." */
  lead: string;
};

export type RateDial = {
  /** "the 1-month rate". */
  rateName: string;
  /** The rate part's reading without its value, for the part read out under the bar: "1-month Treasury bill". */
  readingLabel: string;
  /** This week's rate. */
  rate: number;
  /** The control's ends, in hundredths: at least 3.00% to 4.50%, wider to keep this week's rate a quarter point inside. */
  min: number;
  max: number;
  stops: RateDialStop[];
};

const DIAL_MIN = 3;
const DIAL_MAX = 4.5;
const DIAL_STEP = 0.01;

const floorQuarter = (value: number) => Math.floor(value / FED_STEP) * FED_STEP;
const ceilQuarter = (value: number) => Math.ceil(value / FED_STEP) * FED_STEP;

/**
 * Funding pressure at every hundredth of a point of the short rate across the `/trust`
 * control's range, as the composition bar draws it and the sentence under it names it.
 * The engine re-scores each rate in stages (`buildScoreComposition`, on the moved
 * reading); the parts depend on the rate only through the rate part, so rates whose rate
 * part is equal are scored once, and neighbouring rates with the same result are one stop.
 * Null when there is no rate to move or no composition to redraw.
 */
export const buildRateDial = ({
  rules,
  changeLines,
  regime,
  ...inputs
}: ReadingInputs & {
  rules: readonly BoundedDecisionRule[];
  changeLines: Scores;
  /** This week's published conditions. */
  regime?: string;
}): RateDial | null => {
  const scorer = rateScorer(inputs);
  if (!scorer) return null;
  const published = inputs.assessment.scores;
  const threshold = inputs.assessment.thresholds.baseRateTightness;
  const min = round2(Math.min(DIAL_MIN, floorQuarter(scorer.rate - FED_STEP)));
  const max = round2(Math.max(DIAL_MAX, ceilQuarter(scorer.rate + FED_STEP)));
  const byRatePart = new Map<number, Omit<RateDialStop, "from" | "to"> | null>();
  const scoredAt = (rate: number) => {
    const ratePart = computeTightnessScore(rate, 0, threshold);
    if (!byRatePart.has(ratePart)) {
      const assessment = scorer.assessmentAt(rate);
      const composition = buildScoreComposition({
        assessment,
        treasury: scorer.treasuryAt(rate),
        macroSeries: inputs.macroSeries,
        treasurySource: { label: "", url: undefined },
        evaluate: inputs.evaluate,
      });
      const scores = { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite };
      const conditions = describeConditionsChange({ regime, published, other: scores, changeLines });
      byRatePart.set(
        ratePart,
        composition
          ? {
              tightness: scores.tightness,
              /* Only the parts that gave points: the page carries every stop, and most parts give none. */
              parts: composition.tightness.parts.flatMap(({ source, points, from, to }) => (points === 0 ? [] : [{ source, points, from, to }])),
              lead: [`${describeAreaChanges(areaChangesAt(rules, published, scores))}.`, conditions].filter(Boolean).join(" "),
            }
          : null,
      );
    }
    return byRatePart.get(ratePart) ?? null;
  };
  const stops: RateDialStop[] = [];
  const count = Math.round((max - min) / DIAL_STEP);
  for (let index = 0; index <= count; index += 1) {
    const rate = round2(min + index * DIAL_STEP);
    const scored = scoredAt(rate);
    if (!scored) return null;
    const last = stops.at(-1);
    const sameParts = last?.parts.length === scored.parts.length
      && last.parts.every((part, partIndex) => part.source === scored.parts[partIndex]?.source && part.points === scored.parts[partIndex]?.points);
    if (last && sameParts && last.tightness === scored.tightness && last.lead === scored.lead) {
      last.to = rate;
    } else {
      stops.push({ from: rate, to: rate, ...scored });
    }
  }
  return {
    rateName: scorer.name,
    readingLabel: BASE_RATE_SOURCE_LABELS[scorer.used].replace(/^The /, ""),
    rate: round2(scorer.rate),
    min,
    max,
    stops,
  };
};
