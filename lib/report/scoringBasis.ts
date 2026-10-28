import { RECORD_BASIS_MARKET_INPUTS, type RegimeAssessment } from "../regimeEngine";
import type { MacroSeriesId } from "../types";
import { getRegimePublicLabel } from "../regimePresentation";
import { classifyRegimeQuadrant } from "../regimeStateMachine";
import {
  buildCanonicalBoundedDecisionRules,
  decisionAreaLabel,
  decisionAreaOrder,
  isRuleConditionMet,
  ruleMetricLabel,
  type DecisionArea,
  type RuleConditionMetric,
} from "./boundedDecisionRules";
import { scoreSourceLabel } from "./scoreMovement";
import type { ScoreMovementSource } from "./reportDataTypes";

/**
 * Which inputs set a call's scores, said with the call on every surface that
 * states one: the status strip, the published brief, `/trust`, every paste and
 * the email, and `scoringBasis` in the API and MCP answers.
 *
 * Since `engine-2026-10-09` only the inputs the record scores move the
 * published scores (`RECORD_BASIS_MARKET_INPUTS`): interest rates, the yield
 * curve, the pace of rate rises and stock-market volatility, the inputs every
 * month-end on `/history` was scored from. So the record, the track record and
 * the `/calibration` study vouch for the score that sets the guidance. Before
 * it, the venture funding pace, the tech-layoff trend, the high-yield spread
 * and the Chicago Fed index moved the published scores too, and four weekly
 * briefs read Freezing whose month-end, scored on the record's inputs, read
 * Cloudy. The inputs left out are still scored and still shown (`notCounted`),
 * and when they would carry a score past a line the published score is not
 * past, that is the warning.
 */
export type ScoringBasisKey = "record" | "extended";

/**
 * Why the inputs a warning names are left out, in a reader's words (2026-10-14;
 * rephrased 2026-10-21 — "past months can't be checked with them" read as
 * translated English). "The record cannot test them" only reads to someone who
 * knows the record is the month-ends since 2012 and that these inputs are not
 * held for them; "can't be scored against past month-ends" says the same fact
 * without the insider noun. Said after the warning on the status strip and in
 * the Monday post.
 */
export const NOT_COUNTED_REASON = "They're left out because their data doesn't go back far enough to check against past months.";

/** The strip's label for the basis cell; the value is the basis's `value`. */
export const SCORING_BASIS_LABEL = "Scored on";

const BASIS_COPY: Record<ScoringBasisKey, { value: string; sentence: string }> = {
  record: { value: "The record's inputs", sentence: "Scored on the record's inputs." },
  extended: { value: "More inputs than the record", sentence: "Scored on more inputs than the record." },
};

/*
 * The engines whose published scores counted every market input. A stored
 * reading names its engine (`OperatingSnapshot.engineVersion`, a published
 * brief's `scores.engineVersion`); one that names none was scored before
 * engines were named, and counted them too.
 */
const ENGINES_BEFORE_RECORD_BASIS: ReadonlySet<string> = new Set(["engine-2026-10-06"]);

/** The basis sentence as a clause of a longer line: "scored on the record's inputs". */
export const basisClause = (sentence: string) => `${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`.replace(/\.$/, "");

/** The basis a reading was scored on, from the engine that scored it. */
export const scoringBasisForEngine = (engineVersion: string | undefined): ScoringBasisKey =>
  engineVersion === undefined || ENGINES_BEFORE_RECORD_BASIS.has(engineVersion) ? "extended" : "record";

/**
 * The basis's words alone, for a reading that names its engine and nothing
 * else: a published week, whose record stores its scores and not what the
 * inputs left out would have made them.
 */
export const describeScoringBasis = (engineVersion: string | undefined) =>
  BASIS_COPY[scoringBasisForEngine(engineVersion)];

/*
 * Each input outside the record moves one score, so what a score would gain
 * with them counted is named by that score's source in the breakdown
 * (`lib/report/scoreMovement.ts`): funding pressure's is the high-yield spread,
 * risk appetite's the startup-market reads.
 */
const NOT_COUNTED_SOURCE: Record<RuleConditionMetric, ScoreMovementSource> = {
  tightness: "credit",
  riskAppetite: "startupMarket",
};

/** One score as the inputs outside the record would have it. */
type NotCountedScore = {
  metric: RuleConditionMetric;
  source: ScoreMovementSource;
  /** What those inputs are called: "startup-market inputs". */
  label: string;
  /** The score with them counted. */
  score: number;
  /** The published score. */
  published: number;
  /**
   * The line they would carry the score past that the published score is not
   * past: "its change line", or an area's pause or resume line. Null when they
   * would cross none, and then nothing they say changes the guidance.
   */
  line: string | null;
};

export type ScoringBasis = {
  key: ScoringBasisKey;
  /** The strip's value: "The record's inputs". */
  value: string;
  /** The sentence for a paste, the brief and the email: "Scored on the record's inputs." */
  sentence: string;
  /** Each score the inputs outside the record would move, with what they would make it. Empty on the extended basis, which counted them. */
  notCounted: NotCountedScore[];
  /** The scores among `notCounted` that would cross a line, as one sentence; null when none would. */
  warning: string | null;
  /**
   * The same warning in four words, for a phone's one-line strip, where the sentence ran
   * four lines under a page title: "startup-market inputs left out" (2026-10-27). The
   * strip links to /trust, which says the rest. Null when there is no warning.
   */
  warningShort?: string | null;
};

/*
 * The market inputs the engine scores, in the reader's words, with why each
 * one off the record basis is left out. Which side an input is on is the
 * engine's (`RECORD_BASIS_MARKET_INPUTS`); this only names it. A reason reads
 * after one name or several, so it carries both verb forms.
 */
type LeftOutReason = { one: string; many: string };

const NOT_IN_ARCHIVE: LeftOutReason = { one: "is not in the archive yet", many: "are not in the archive yet" };
const SHORT_HISTORY: LeftOutReason = {
  one: "has public history only from October 2023",
  many: "have public history only from October 2023",
};
const CURATED: LeftOutReason = {
  one: "is a curated snapshot with no history to test",
  many: "are curated snapshots with no history to test",
};

const SCORED_MARKET_INPUTS: ReadonlyArray<{ id: MacroSeriesId; name: string; whyNotCounted: LeftOutReason }> = [
  { id: "VIX_INDEX", name: "stock-market volatility (the VIX)", whyNotCounted: NOT_IN_ARCHIVE },
  { id: "CHICAGO_FCI", name: "the Chicago Fed financial conditions index", whyNotCounted: NOT_IN_ARCHIVE },
  { id: "HY_CREDIT_SPREAD", name: "the high-yield credit spread", whyNotCounted: SHORT_HISTORY },
  { id: "VC_FUNDING_VELOCITY", name: "the venture funding pace", whyNotCounted: CURATED },
  { id: "TECH_LAYOFF_TREND", name: "the tech-layoff trend", whyNotCounted: CURATED },
];

/**
 * What the record basis counts and what it shows without counting, for the
 * page that explains how the scores are built (`/trust`): interest rates, the
 * curve and the pace of rate rises always count; each market input counts when
 * the archive scores it. The ones left out come grouped by why, each group one
 * clause: "the venture funding pace and the tech-layoff trend are curated
 * snapshots with no history to test".
 */
export const describeRecordBasisInputs = () => {
  const countedMarket = SCORED_MARKET_INPUTS.filter((input) => RECORD_BASIS_MARKET_INPUTS.includes(input.id));
  const leftOut = SCORED_MARKET_INPUTS.filter((input) => !RECORD_BASIS_MARKET_INPUTS.includes(input.id));
  const reasons = [...new Set(leftOut.map((input) => input.whyNotCounted))];
  return {
    /** The market reads the record basis counts. */
    countedMarket: countedMarket.map((input) => input.name),
    /** Everything that moves the scores: the rate inputs, then the counted market reads. */
    counted: ["interest rates", "the yield curve", "the pace of rate rises", ...countedMarket.map((input) => input.name)],
    /** The market reads left out, by name. */
    shown: leftOut.map((input) => input.name),
    /** Why each is left out, one clause per reason. */
    shownBecause: reasons.map((reason) => {
      const names = leftOut.filter((input) => input.whyNotCounted === reason).map((input) => input.name);
      return `${joinAnd(names)} ${names.length === 1 ? reason.one : reason.many}`;
    }),
  };
};

/** Whether a market input moves the published scores, for a page that marks each one. */
export const isCountedMarketInput = (id: MacroSeriesId) => RECORD_BASIS_MARKET_INPUTS.includes(id);

const joinAnd = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const upperFirst = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const listAreas = (areas: readonly DecisionArea[]) =>
  areas.length === decisionAreaOrder.length ? "every area" : joinAnd(areas.map(decisionAreaLabel));

type BasisAssessment = Pick<RegimeAssessment, "regime" | "scores" | "thresholds">;

/**
 * The line a score would cross between its published value and `counted`, in
 * the order a reader weighs them: the change line, which moves the conditions,
 * then an area's pause line, then its resume line. The area lines are the
 * published ones (`buildCanonicalBoundedDecisionRules`), judged by the
 * predicate the rules table prints with.
 */
const crossedLine = (metric: RuleConditionMetric, counted: number, assessment: BasisAssessment): string | null => {
  const published = assessment.scores[metric];
  const changeLine = metric === "tightness" ? assessment.thresholds.tightnessRegime : assessment.thresholds.riskAppetiteRegime;
  if (published > changeLine !== counted > changeLine) return "its change line";
  const rules = buildCanonicalBoundedDecisionRules({
    regime: assessment.regime,
    thresholds: assessment.thresholds,
    scores: assessment.scores,
  });
  for (const side of ["pause", "resume"] as const) {
    const areas = rules
      .filter((rule) =>
        rule[side].conditions.some(
          (condition) =>
            condition.metric === metric && isRuleConditionMet(condition, published) !== isRuleConditionMet(condition, counted),
        ),
      )
      .map((rule) => rule.area);
    if (areas.length > 0) return `the ${side} line for ${listAreas(areas)}`;
  }
  return null;
};

const describeCrossing = (entry: NotCountedScore & { line: string }) =>
  `${upperFirst(entry.label)} would put ${ruleMetricLabel[entry.metric].toLowerCase()} at ${entry.score}, ${
    entry.score < entry.published ? "below" : "above"
  } ${entry.line}`;

/**
 * A reading's basis, what the inputs it leaves out would make each score, and
 * the warning when they would move a line. `engineVersion` names the engine
 * that scored the reading: the current one for a live read, the stored one for
 * a snapshot or a published brief.
 */
export const resolveScoringBasis = ({
  engineVersion,
  assessment,
}: {
  engineVersion: string | undefined;
  assessment: BasisAssessment;
}): ScoringBasis => {
  const key = scoringBasisForEngine(engineVersion);
  const offRecord = key === "record" ? assessment.scores.offRecord : undefined;
  const notCounted: NotCountedScore[] = offRecord
    ? (["tightness", "riskAppetite"] as const).flatMap((metric) => {
        const published = assessment.scores[metric];
        const score = offRecord[metric];
        if (score === published) return [];
        const source = NOT_COUNTED_SOURCE[metric];
        return [{ metric, source, label: scoreSourceLabel(metric, source), score, published, line: crossedLine(metric, score, assessment) }];
      })
    : [];
  const crossing = notCounted.flatMap((entry) => (entry.line ? [{ ...entry, line: entry.line }] : []));
  return {
    key,
    ...BASIS_COPY[key],
    notCounted,
    warning: crossing.length > 0 ? `${crossing.map(describeCrossing).join("; ")}.` : null,
    warningShort: crossing.length > 0 ? `${[...new Set(crossing.map((entry) => entry.label))].join(" and ")} left out` : null,
  };
};

const signed = (points: number) => `${points > 0 ? "+" : "-"}${Math.abs(points)}`;

/**
 * What one score leaves out, for the row under it in the breakdown: "Not
 * counted: -11 from startup-market inputs." Null when the inputs outside the
 * record would not move it. Printed whichever reading the week compares with,
 * because it is about this reading's score, not about the move.
 */
export const describeNotCountedScore = (
  metric: RuleConditionMetric,
  basis: Pick<ScoringBasis, "notCounted"> | undefined,
): string | null => {
  const entry = basis?.notCounted.find((candidate) => candidate.metric === metric);
  return entry ? `Not counted: ${signed(entry.score - entry.published)} from ${entry.label}.` : null;
};

/** A score's move and what it leaves out, as the row under it prints them; null when neither says anything. */
export const joinSentences = (...sentences: Array<string | null | undefined>): string | null =>
  sentences.filter((sentence): sentence is string => Boolean(sentence)).join(" ") || null;

/**
 * Both scores' not-counted lines as one, for a paste: "Not counted: risk
 * appetite -11 from startup-market inputs." Null when neither score leaves
 * anything out.
 */
export const describeNotCountedLine = (basis: Pick<ScoringBasis, "notCounted"> | undefined): string | null => {
  const entries = basis?.notCounted ?? [];
  return entries.length > 0
    ? `Not counted: ${joinAnd(
        entries.map((entry) => `${ruleMetricLabel[entry.metric].toLowerCase()} ${signed(entry.score - entry.published)} from ${entry.label}`),
      )}.`
    : null;
};

/**
 * The clause a conditions-change alert adds when the inputs left out would
 * have kept the conditions where they were: the change is the record basis
 * at work, and a reader told only "Freezing to Cloudy" takes it for the
 * market. Null when those inputs would not have held the earlier conditions.
 */
export const describeChangeTheRecordMade = ({
  previousRegime,
  assessment,
}: {
  previousRegime: RegimeAssessment["regime"];
  assessment: Pick<RegimeAssessment, "regime" | "scores" | "thresholds">;
}): string | null => {
  const offRecord = assessment.scores.offRecord;
  if (!offRecord || previousRegime === assessment.regime) return null;
  if (classifyRegimeQuadrant({ ...offRecord, thresholds: assessment.thresholds }) !== previousRegime) return null;
  const inputs = (["tightness", "riskAppetite"] as const)
    .filter((metric) => offRecord[metric] !== assessment.scores[metric])
    .map((metric) => scoreSourceLabel(metric, NOT_COUNTED_SOURCE[metric]));
  return `${upperFirst(joinAnd(inputs))}, which the guidance leaves out because they can't be scored against past month-ends, would have kept conditions ${getRegimePublicLabel(previousRegime)}.`;
};

/**
 * The basis as the API and MCP answers carry it, in `scoringBasis`, beside
 * every field they already had: the key to branch on, the sentence a reader
 * sees, the warning, and each score the inputs left out would move, with the
 * line they would cross.
 */
export const toScoringBasisPayload = (basis: ScoringBasis) => ({
  key: basis.key,
  label: basis.sentence.replace(/\.$/, ""),
  warning: basis.warning,
  notCounted: basis.notCounted.map((entry) => ({
    score: entry.metric,
    inputs: entry.label,
    value: entry.score,
    published: entry.published,
    line: entry.line,
  })),
});

/**
 * Why a published week's conditions differ from the live reading's, when the
 * basis is the reason: the week was frozen by an engine that counted inputs
 * outside the record, and those inputs alone put its conditions where it
 * published them. `rescored` is the week's stored inputs scored by the current
 * engine (`scoreStoredInputs`). Null when the conditions agree, when the week
 * was scored on the record's inputs, or when its own inputs on the record's
 * basis would have published the same conditions, since then the difference is
 * the market's, and the page's comparison already says it.
 */
export const describePublishedWeekBasis = ({
  live,
  published,
  rescored,
}: {
  live: Pick<RegimeAssessment, "regime">;
  published: { regime: RegimeAssessment["regime"]; weekLabel: string; engineVersion: string | undefined };
  rescored: Pick<RegimeAssessment, "scores" | "thresholds"> | null;
}): string | null => {
  if (!rescored?.scores.offRecord || scoringBasisForEngine(published.engineVersion) !== "extended") return null;
  if (published.regime === live.regime) return null;
  const { thresholds } = rescored;
  const onRecord = classifyRegimeQuadrant({ ...rescored.scores, thresholds });
  const counted = classifyRegimeQuadrant({ ...rescored.scores.offRecord, thresholds });
  if (onRecord === counted || counted !== published.regime) return null;
  const inputs = (["tightness", "riskAppetite"] as const)
    .filter((metric) => rescored.scores.offRecord?.[metric] !== rescored.scores[metric])
    .map((metric) => scoreSourceLabel(metric, NOT_COUNTED_SOURCE[metric]));
  return `The brief published for the week of ${published.weekLabel} read ${getRegimePublicLabel(published.regime)} only because it counted ${joinAnd(inputs)}, which can't be scored against past month-ends.`;
};
