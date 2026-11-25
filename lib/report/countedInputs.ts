import { computeCurveSlope } from "../regimeEngineCore";
import type { RegimeAssessment, RegimeKey, RegimeThresholds } from "../regimeEngineCore";
import type { evaluateRegime } from "../regimeEngine";
import { getRegimePublicLabel } from "../regimePresentation";
import { classifyRegimeQuadrant } from "../regimeStateMachine";
import type { MacroSeriesId, MacroSeriesReading, TreasuryData, TreasuryYields } from "../types";
import type { CompositionSource, ScoreComposition } from "./scoreComposition";

/**
 * Which inputs count, chosen by a reader on `/signals` (2026-11-18), and what the two
 * scores and the conditions would be with that choice.
 *
 * `/trust` prints each published score as the points its inputs gave it
 * (`buildScoreComposition`). The line settings on `/signals` let a reader move the lines
 * and see the conditions move; this lets them leave an input out, or count one the
 * published score leaves out, and see the same. The inputs offered are the composition's
 * parts, in its order and under its names, so the two pages name each input once.
 *
 * Every answer is the engine's (`evaluateRegime`), run the way the composition runs it in
 * stages: on the readings in hand with the left-out ones taken away. The two scores are
 * scored apart from each other in the engine, so each is read from its own run:
 *
 * - The recent pace of rate rises is the rate history; left out, the run has none.
 * - Each market read (financial-conditions stress, stock-market volatility, and the two
 *   the published score leaves out) is a series; left out, the run does not carry it.
 *   Counted, an input outside the record is read off the engine's `offRecord` score,
 *   the one the "Not counted" line already prints.
 * - The short-term borrowing rate, left out, is scored at its line, where its ramp adds
 *   nothing.
 * - The yield curve's inversion, left out of funding pressure, is scored with the 10-year
 *   rate level with the 2-year, where it adds nothing.
 * - The yield curve, left out of risk appetite, is scored the way the engine scores a
 *   missing curve, which gives risk appetite nothing from it.
 *
 * With nothing changed the runs must give the published scores back exactly; when they
 * do not (a stored reading an earlier engine scored), there is nothing to offer and the
 * page prints no choice. The published guidance never reads this: the choice changes
 * only the sentence beside it.
 */

/** The query keys a choice travels in: the counted inputs left out, and the not-counted ones counted. */
const COUNTED_INPUT_PARAMS = { without: "without", with: "with" } as const;

export type InputChoice = { without: CompositionSource[]; with: CompositionSource[] };

const COMPOSITION_SOURCES: ReadonlySet<string> = new Set<CompositionSource>([
  "rateLevel",
  "inversion",
  "rateSpeed",
  "financialConditions",
  "curve",
  "marketStress",
  "credit",
  "startupMarket",
]);

const isCompositionSource = (value: string): value is CompositionSource => COMPOSITION_SOURCES.has(value);

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined> | undefined;

const readParam = (params: ParamSource, key: string): string | null => {
  if (!params) return null;
  if (params instanceof URLSearchParams) return params.get(key);
  const value = params[key];
  return typeof value === "string" ? value : null;
};

const readSources = (params: ParamSource, key: string): CompositionSource[] => [
  ...new Set((readParam(params, key) ?? "").split(",").map((part) => part.trim()).filter(isCompositionSource)),
];

/** The choice a URL names; unknown names are dropped. */
export const parseInputChoice = (params: ParamSource): InputChoice => ({
  without: readSources(params, COUNTED_INPUT_PARAMS.without),
  with: readSources(params, COUNTED_INPUT_PARAMS.with),
});

/** Whether a URL names a choice at all, which opens the panel that holds it. */
export const hasInputChoiceParams = (params: ParamSource) => {
  const choice = parseInputChoice(params);
  return choice.without.length > 0 || choice.with.length > 0;
};

/** Writes a choice into `params`, dropping a key that would be empty, so the published choice has a clean URL. */
export const writeInputChoiceParams = (params: URLSearchParams, choice: InputChoice) => {
  for (const [key, sources] of [
    [COUNTED_INPUT_PARAMS.without, choice.without],
    [COUNTED_INPUT_PARAMS.with, choice.with],
  ] as const) {
    if (sources.length > 0) params.set(key, sources.join(","));
    else params.delete(key);
  }
  return params;
};

/* The market reads behind each input the engine can be run without. */
const MARKET_INPUTS: Partial<Record<CompositionSource, readonly MacroSeriesId[]>> = {
  financialConditions: ["CHICAGO_FCI"],
  credit: ["HY_CREDIT_SPREAD"],
  marketStress: ["VIX_INDEX"],
  startupMarket: ["VC_FUNDING_VELOCITY", "TECH_LAYOFF_TREND"],
};

const withoutMarketReads = (
  macroSeries: readonly MacroSeriesReading[],
  leftOut: readonly CompositionSource[],
): MacroSeriesReading[] => {
  const ids = new Set(leftOut.flatMap((source) => MARKET_INPUTS[source] ?? []));
  return macroSeries.filter((reading) => !ids.has(reading.id));
};

/* The short-term rate at its line: the rate the engine reads first, so its ramp reads 0. */
const rateAtLine = (yields: TreasuryYields, line: number): TreasuryYields => ({ ...yields, fedFunds: line });

/* The 10-year level with the 2-year, so the inversion term reads 0; a curve with a missing
   end gets the other end's value, and one with neither is level at zero. */
const curveLevel = (yields: TreasuryYields): TreasuryYields => {
  const slope = computeCurveSlope(yields);
  if (slope !== null && slope >= 0) return yields;
  const level = yields.twoYear ?? yields.tenYear ?? 0;
  return { ...yields, twoYear: level, tenYear: level };
};

/* No 10-year reading: the engine scores a curve it cannot read as giving risk appetite nothing. */
const curveMissing = (yields: TreasuryYields): TreasuryYields => ({ ...yields, tenYear: null });

type Evaluate = typeof evaluateRegime;

type RescoreInputs = {
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">;
  treasury: TreasuryData;
  macroSeries: readonly MacroSeriesReading[];
  evaluate: Evaluate;
};

type Rescored = { tightness: number; riskAppetite: number; regime: RegimeKey };

/**
 * Both scores and the conditions with the inputs in `counted` counting and no others,
 * each score from its own engine run. Null when the published choice does not give the
 * published scores back.
 */
const rescoreWithInputs = ({
  assessment,
  treasury,
  macroSeries,
  evaluate,
  counted,
  published,
}: RescoreInputs & {
  counted: ReadonlySet<CompositionSource>;
  /** The inputs the published score counts: the guard runs them first. */
  published: ReadonlySet<CompositionSource>;
}): Rescored | null => {
  const { thresholds } = assessment;
  const score = (inputs: ReadonlySet<CompositionSource>) => {
    const leftOut = [...COMPOSITION_SOURCES].filter(isCompositionSource).filter((source) => !inputs.has(source));
    const context = inputs.has("rateSpeed") ? { baseRateHistory: treasury.oneMonthHistory } : {};
    let tightnessYields = treasury.yields;
    if (!inputs.has("rateLevel")) tightnessYields = rateAtLine(tightnessYields, thresholds.baseRateTightness);
    if (!inputs.has("inversion")) tightnessYields = curveLevel(tightnessYields);
    const riskAppetiteYields = inputs.has("curve") ? treasury.yields : curveMissing(treasury.yields);
    const macro = withoutMarketReads(macroSeries, leftOut);
    const tightnessScores = evaluate({ ...treasury, yields: tightnessYields }, thresholds, macro, null, context).scores;
    const riskAppetiteScores = evaluate({ ...treasury, yields: riskAppetiteYields }, thresholds, macro, null, context).scores;
    const tightness = inputs.has("credit") ? (tightnessScores.offRecord?.tightness ?? tightnessScores.tightness) : tightnessScores.tightness;
    const riskAppetite = inputs.has("startupMarket")
      ? (riskAppetiteScores.offRecord?.riskAppetite ?? riskAppetiteScores.riskAppetite)
      : riskAppetiteScores.riskAppetite;
    return { tightness, riskAppetite };
  };
  const check = score(published);
  if (check.tightness !== assessment.scores.tightness || check.riskAppetite !== assessment.scores.riskAppetite) return null;
  const rescored = score(counted);
  return { ...rescored, regime: classifyRegimeQuadrant({ ...rescored, thresholds }) };
};

export type InputChoiceOption = {
  source: CompositionSource;
  /** The input as /trust's arithmetic names it: "Short-term borrowing rate". */
  name: string;
  /** The points it gave the published score, or would give it counted. */
  points: number;
  /** Whether the published score counts it. */
  published: boolean;
  /** Whether it counts in this choice. */
  counted: boolean;
};

type InputChoiceGroup = { metric: ScoreComposition["metric"]; label: string; options: InputChoiceOption[] };

export type InputChoiceModel = {
  /** Funding pressure's inputs, then risk appetite's, each in the composition's order. */
  groups: InputChoiceGroup[];
  /** The choice as the URL carries it, with any input this reading does not offer dropped. */
  choice: InputChoice;
  /** Whether the choice differs from the published one. */
  changed: boolean;
  /** The conditions with this choice. */
  regime: RegimeKey;
  /**
   * The answer, conditions first: "Freezing either way: without the yield curve, risk
   * appetite would be 0." or, with nothing changed, "Freezing with the published inputs:
   * funding pressure 90, risk appetite 44."
   */
  result: string;
};

const joinAnd = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const lowerFirst = (value: string) => `${value.charAt(0).toLowerCase()}${value.slice(1)}`;

const describeInputChoice = ({
  composition,
  assessment,
  choice,
  rescored,
  changed,
}: {
  composition: { tightness: ScoreComposition; riskAppetite: ScoreComposition };
  assessment: Pick<RegimeAssessment, "scores" | "thresholds" | "regime">;
  choice: InputChoice;
  rescored: Rescored;
  changed: boolean;
}) => {
  const published = getRegimePublicLabel(assessment.regime);
  if (!changed) {
    return `${published} with the published inputs: funding pressure ${assessment.scores.tightness}, risk appetite ${assessment.scores.riskAppetite}.`;
  }
  /* "Either way" when the choice leaves the conditions where the published scores put them;
     a week whose change waits on a second reading is judged against its own scores, so a
     choice that moves nothing is not credited with the wait. */
  const publishedQuadrant = classifyRegimeQuadrant({ ...assessment.scores, thresholds: assessment.thresholds });
  const lead =
    rescored.regime === assessment.regime || rescored.regime === publishedQuadrant
      ? `${published} either way`
      : `${getRegimePublicLabel(rescored.regime)} instead of ${published}`;
  const clauseOf = (source: CompositionSource) => {
    for (const score of [composition.tightness, composition.riskAppetite]) {
      const part = [...score.parts, ...(score.notCounted ? [score.notCounted] : [])].find((entry) => entry.source === source);
      if (part) return { clause: part.clause, metric: score.metric };
    }
    return null;
  };
  const without = choice.without.flatMap((source) => clauseOf(source) ?? []);
  const counted = choice.with.flatMap((source) => clauseOf(source) ?? []);
  const inputClauses = [
    without.length > 0 ? `without ${joinAnd(without.map((entry) => entry.clause))}` : null,
    counted.length > 0 ? `with ${joinAnd(counted.map((entry) => entry.clause))} counted` : null,
  ].filter((clause): clause is string => Boolean(clause));
  const inputs = inputClauses.join(without.length > 1 && counted.length > 0 ? ", and " : " and ");
  const touched = new Set([...without, ...counted].map((entry) => entry.metric));
  const scoreClauses = (["tightness", "riskAppetite"] as const)
    .filter((metric) => touched.has(metric))
    .map((metric) => {
      const name = lowerFirst(composition[metric].label);
      return rescored[metric] === assessment.scores[metric]
        ? `${name} would still be ${rescored[metric]}`
        : `${name} would be ${rescored[metric]}`;
    });
  return `${lead}: ${inputs}, ${scoreClauses.join(" and ")}.`;
};

/**
 * The inputs a reader can choose between, what the conditions are with the choice the URL
 * names, and the sentence that says so. Null when the reading has no composition, or when
 * the engine's runs cannot give the published scores back.
 */
export const buildInputChoiceModel = ({
  composition,
  assessment,
  treasury,
  macroSeries,
  evaluate,
  choice: requested,
}: RescoreInputs & {
  composition: { tightness: ScoreComposition; riskAppetite: ScoreComposition } | null;
  assessment: Pick<RegimeAssessment, "scores" | "thresholds" | "regime">;
  choice: InputChoice;
}): InputChoiceModel | null => {
  if (!composition) return null;
  const scores = [composition.tightness, composition.riskAppetite];
  const offered = scores.flatMap((score) => [
    ...score.parts.map((part) => ({ part, metric: score.metric, published: true })),
    ...(score.notCounted ? [{ part: score.notCounted, metric: score.metric, published: false }] : []),
  ]);
  const choice: InputChoice = {
    without: offered.filter((entry) => entry.published && requested.without.includes(entry.part.source)).map((entry) => entry.part.source),
    with: offered.filter((entry) => !entry.published && requested.with.includes(entry.part.source)).map((entry) => entry.part.source),
  };
  const isCounted = (source: CompositionSource, published: boolean) =>
    published ? !choice.without.includes(source) : choice.with.includes(source);
  const publishedSet = new Set(offered.filter((entry) => entry.published).map((entry) => entry.part.source));
  const countedSet = new Set(offered.filter((entry) => isCounted(entry.part.source, entry.published)).map((entry) => entry.part.source));
  const rescored = rescoreWithInputs({ assessment, treasury, macroSeries, evaluate, counted: countedSet, published: publishedSet });
  if (!rescored) return null;

  const groups: InputChoiceGroup[] = scores.map((score) => ({
    metric: score.metric,
    label: score.label,
    options: offered
      .filter((entry) => entry.metric === score.metric)
      .map((entry) => ({
        source: entry.part.source,
        name: entry.part.name,
        points: entry.part.points,
        published: entry.published,
        counted: isCounted(entry.part.source, entry.published),
      })),
  }));
  const changed = choice.without.length > 0 || choice.with.length > 0;
  return {
    groups,
    choice,
    changed,
    regime: rescored.regime,
    result: describeInputChoice({ composition, assessment, choice, rescored, changed }),
  };
};

/** The lines a reading is judged against, as `/signals` names them. */
type Lines = Pick<RegimeThresholds, "baseRateTightness" | "tightnessRegime" | "riskAppetiteRegime">;

/**
 * The line settings' answer in the closed row, the panel's one result. With the published
 * inputs it is what it was before the inputs joined the panel, the lines in force in the
 * panel's own words ("Lines now: rate 3.5% · funding pressure 70 · risk appetite 50").
 * With a choice of inputs it is that choice's answer, conditions first ("Freezing either
 * way: without the yield curve, risk appetite would be 0."), and the lines after it when
 * the reader moved them too, since the answer is judged against them.
 */
export const describeLinesAndInputsAnswer = ({
  customLines,
  inputs,
  linesText,
}: {
  customLines: boolean;
  /** Null when the reading offers no choice of inputs. */
  inputs: Pick<InputChoiceModel, "changed" | "result"> | null;
  linesText: string;
}) => {
  const lines = `Lines now: ${linesText}`;
  if (!inputs?.changed) return lines;
  return customLines ? `${inputs.result} ${lines}` : inputs.result;
};

/** Whether a reading's lines differ from the published ones. */
export const hasCustomLines = (thresholds: Lines, published: Lines) =>
  thresholds.baseRateTightness !== published.baseRateTightness ||
  thresholds.tightnessRegime !== published.tightnessRegime ||
  thresholds.riskAppetiteRegime !== published.riskAppetiteRegime;
