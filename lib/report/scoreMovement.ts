import type { evaluateRegime, RegimeThresholds } from "../regimeEngine";
import type { MacroSeriesReading, TreasuryData } from "../types";
import { comparisonBasis, type ComparisonBasis } from "./comparisonBasis";
import type { ScoreMovement, ScoreMovementSource } from "./reportDataTypes";

/**
 * What a score's move is made of.
 *
 * The page says funding pressure went from 63 to 90; it never said which
 * inputs account for the 27. The two readings are not built from the same
 * inputs, which is what makes the split worth stating: the earlier reading is
 * scored from interest rates alone (`evaluateRegime(snapshot, thresholds)`,
 * no rate-speed history, no market series), while today's also carries the
 * rate-speed term and the market inputs. So a move is part interest rates and
 * part inputs the earlier score never had, and a reader who is told only the
 * total takes the second part for the market moving.
 *
 * The parts are the same inputs scored in stages: rates alone, then with the
 * rate-speed term, then with the startup-market inputs, then as published (which
 * adds stock-market volatility). Each stage's score is a whole number, so the
 * parts add up to the move exactly. The order is the attribution: the startup
 * inputs count as if volatility were absent, and volatility for what it adds on
 * top, because the volatility veto caps the score and the two do not add on
 * their own.
 */
type ScorePair = { tightness: number; riskAppetite: number };

const roundToTenth = (value: number) => Math.round(value * 10) / 10;

const partsFrom = (steps: Array<[ScoreMovementSource, number]>): ScoreMovement["parts"] =>
  steps
    .map(([source, points]) => ({ source, points: roundToTenth(points) }))
    .filter((part) => part.points !== 0);

const buildScoreMovement = ({
  previous,
  ratesOnly,
  withRateSpeed,
  withoutVolatility,
  current,
  rebuilt,
}: {
  /** The earlier reading, scored the way the loader scores it: rates alone. */
  previous: ScorePair;
  /** Today's inputs scored the same way, so `ratesOnly - previous` is the rates and nothing else. */
  ratesOnly: ScorePair;
  /** Today's inputs with the rate-speed history added. */
  withRateSpeed: ScorePair;
  /** Rate speed and every market input except stock-market volatility. */
  withoutVolatility: ScorePair;
  /** The score the page shows. */
  current: ScorePair;
  /** Today's inputs scored in full from scratch; it has to equal `current` for the split to be trusted. */
  rebuilt: ScorePair;
}): Partial<Record<"tightness" | "riskAppetite", ScoreMovement>> | undefined => {
  /* A replay or a stored snapshot can carry a score this function cannot
     reproduce from the inputs in hand. Explaining it anyway would print parts
     that do not add up to the number beside them. */
  if (rebuilt.tightness !== current.tightness || rebuilt.riskAppetite !== current.riskAppetite) return undefined;

  return {
    tightness: {
      parts: partsFrom([
        ["rates", ratesOnly.tightness - previous.tightness],
        ["rateSpeed", withRateSpeed.tightness - ratesOnly.tightness],
        ["credit", current.tightness - withRateSpeed.tightness],
      ]),
    },
    riskAppetite: {
      parts: partsFrom([
        ["curve", ratesOnly.riskAppetite - previous.riskAppetite],
        ["startupMarket", withoutVolatility.riskAppetite - withRateSpeed.riskAppetite],
        ["marketStress", current.riskAppetite - withoutVolatility.riskAppetite],
      ]),
    },
  };
};

/**
 * The move in each score, split by what produced it, or undefined when the
 * split cannot be trusted. Today's inputs are scored in the same stages the
 * earlier reading was not: rates alone (which is how the earlier reading was
 * scored, so the first part is the rates and nothing else), then with the
 * rate-speed history, then with the market inputs except volatility, and in
 * full. `evaluate` is the loader's own `evaluateRegime`, so the parts come from
 * the engine's arithmetic and not from a second copy of it.
 */
export const explainScoreMovement = ({
  previous,
  current,
  treasury,
  thresholds,
  macroSeries,
  evaluate,
}: {
  previous: ScorePair;
  current: ScorePair;
  treasury: TreasuryData;
  thresholds: RegimeThresholds;
  macroSeries: MacroSeriesReading[];
  evaluate: typeof evaluateRegime;
}) => {
  const context = { baseRateHistory: treasury.oneMonthHistory };
  return buildScoreMovement({
    previous,
    current,
    ratesOnly: evaluate(treasury, thresholds).scores,
    withRateSpeed: evaluate(treasury, thresholds, [], null, context).scores,
    withoutVolatility: evaluate(
      treasury,
      thresholds,
      macroSeries.filter((series) => series.id !== "VIX_INDEX"),
      null,
      context,
    ).scores,
    rebuilt: evaluate(treasury, thresholds, macroSeries, null, context).scores,
  });
};

type ScoreMovementMetric = "tightness" | "riskAppetite";

/*
 * What each source is called, in the page's words (`lib/report/AGENTS.md`): the
 * base rate is "interest rates" here because the score's rate term also carries
 * the curve's inversion, and each market input is named by what feeds it.
 */
const SOURCE_LABEL: Record<ScoreMovementMetric, Partial<Record<ScoreMovementSource, string>>> = {
  tightness: {
    rates: "interest rates",
    rateSpeed: "the recent pace of rate rises",
    credit: "credit-market and financial-conditions stress",
  },
  riskAppetite: {
    curve: "the yield curve",
    startupMarket: "startup-market inputs",
    marketStress: "stock-market volatility",
  },
};

const METRIC_NAME: Record<ScoreMovementMetric, string> = {
  tightness: "funding pressure",
  riskAppetite: "risk appetite",
};

/** Parts that only today's score carries, whatever the market did: what the caveat is about. */
const isMissingFromEarlierScore = (source: ScoreMovementSource) => source !== "rates" && source !== "curve";

const signed = (points: number) => `${points > 0 ? "+" : "-"}${Math.abs(points)}`;

const joinClauses = (clauses: string[]) =>
  clauses.length <= 1 ? clauses.join("") : `${clauses.slice(0, -1).join(", ")} and ${clauses[clauses.length - 1]}`;

const clausesFor = (metric: ScoreMovementMetric, movement: ScoreMovement) =>
  movement.parts.map((part) => `${signed(part.points)} from ${SOURCE_LABEL[metric][part.source] ?? "other inputs"}`);

const earlierScore = (basis: ComparisonBasis, plural: boolean) =>
  `${basis.date ? `The ${basis.date}` : "The earlier"} ${plural ? "scores were" : "score was"} built from interest rates alone.`;

/**
 * One score's parts as data: each source with its reader name and its signed
 * points, for a consumer that wants the split rather than the sentence.
 */
export const listScoreMovementParts = (metric: ScoreMovementMetric, movement: ScoreMovement | undefined) =>
  (movement?.parts ?? []).map((part) => ({
    source: part.source,
    label: SOURCE_LABEL[metric][part.source] ?? "other inputs",
    points: part.points,
  }));

/**
 * The sentence that keeps a split honest: a part the earlier score never had
 * is not the market moving. Null when every part is rates or the curve, and
 * when there is no split to caveat.
 */
export const describeScoreMovementCaveat = (
  movement: Partial<Record<ScoreMovementMetric, ScoreMovement>> | undefined,
  basis: ComparisonBasis = comparisonBasis(),
): string | null => {
  const parts = [movement?.tightness, movement?.riskAppetite].flatMap((score) => score?.parts ?? []);
  return parts.some((part) => isMissingFromEarlierScore(part.source)) ? earlierScore(basis, true) : null;
};

/**
 * One score's move as the row under it says it: "All from interest rates.",
 * or the parts with their signs and, where a part is one the earlier score
 * did not have, the sentence that says so. Null when nothing moved.
 */
export const describeScoreMovement = (
  metric: ScoreMovementMetric,
  movement: ScoreMovement | undefined,
  basis: ComparisonBasis = comparisonBasis(),
): string | null => {
  if (!movement || movement.parts.length === 0) return null;
  const [only] = movement.parts;
  const body =
    movement.parts.length === 1 && only
      ? `All from ${SOURCE_LABEL[metric][only.source] ?? "other inputs"}.`
      : `${joinClauses(clausesFor(metric, movement))}.`;
  return movement.parts.some((part) => isMissingFromEarlierScore(part.source))
    ? `${body} ${earlierScore(basis, false)}`
    : body;
};

/**
 * Both scores' moves as one line for a paste: the export's answer to "why did
 * it move", carrying the same caveat the page's row does.
 */
export const describeScoreMovementLine = (
  movement: Partial<Record<ScoreMovementMetric, ScoreMovement>> | undefined,
  basis: ComparisonBasis = comparisonBasis(),
): string | null => {
  const metrics: ScoreMovementMetric[] = ["tightness", "riskAppetite"];
  const moved = metrics.flatMap((metric) => {
    const parts = movement?.[metric];
    return parts && parts.parts.length > 0 ? [{ metric, parts }] : [];
  });
  if (moved.length === 0) return null;

  const phrases = moved.map(({ metric, parts }) => {
    const [only] = parts.parts;
    const detail =
      parts.parts.length === 1 && only
        ? `all from ${SOURCE_LABEL[metric][only.source] ?? "other inputs"}`
        : joinClauses(clausesFor(metric, parts));
    const total = roundToTenth(parts.parts.reduce((sum, part) => sum + part.points, 0));
    return `${METRIC_NAME[metric]} ${total === 0 ? "did not change" : signed(total)} (${detail})`;
  });
  const caveat = moved.some(({ parts }) => parts.parts.some((part) => isMissingFromEarlierScore(part.source)))
    ? ` ${earlierScore(basis, true)}`
    : "";
  return `What moved the scores ${basis.since}: ${phrases.join("; ")}.${caveat}`;
};
