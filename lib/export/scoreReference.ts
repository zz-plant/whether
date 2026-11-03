import { formatPoints, scoreReferenceParts } from "../../app/components/ui/scoreCell";
import { DEFAULT_THRESHOLDS, type RegimeThresholds } from "../regimeEngineCore";
import { ruleMetricLabel, type RuleConditionMetric } from "../report/boundedDecisionRules";
import { buildSharedCorridorRails, formatPointsToLine } from "../report/operatingCalls";
import type { ComparedWith, ReportDynamics } from "../report/reportDataTypes";
import { findSignalDelta, type SignalDynamicsSource } from "../report/evidenceReaderModel";
import { comparisonBasis } from "../report/comparisonBasis";
import { describeScoreMovementLine } from "../report/scoreMovement";
import { signalReadingMeaning } from "../report/signalTranslations";

/**
 * The two scores as every export prints them: value, the earlier reading, and
 * what would change the areas with how far it is — in that order, through the
 * same `scoreReferenceParts` the page's `ScoreCell` is drawn from. Before this each
 * builder printed its own shape ("Funding pressure 12 / Risk appetite 68",
 * "Signals: Funding pressure 83 · Risk Appetite 40", "79/100 (9 pts above the
 * line…)"), and none of them carried the earlier reading even where the inputs had it.
 *
 * Against a rule's rails a score names the one side that can change the areas
 * it sets: where they restart while its pause is in effect, else where they
 * pause. Without rails it names the line where conditions change. The earlier
 * reading prints only when the caller's inputs carry it, under the date they
 * say it is from; nothing here invents a comparison.
 */
type ScorePair = Record<RuleConditionMetric, number>;

/**
 * The earlier reading, per metric, and which reading it is (`comparedWith`,
 * from `ReportDynamics`). A metric is null where the surface has no earlier
 * reading for it; no `comparedWith` means the source did not date it, and the
 * paste says "last week" as it always did.
 */
type PreviousScores = Partial<Record<RuleConditionMetric, number | null>> & {
  comparedWith?: ComparedWith | null;
  /** What each score's move is made of, where the loader could split it (`ReportDynamics.movement`). */
  movement?: ReportDynamics["movement"];
};

/** `PreviousScores` with both scores present, as `previousScoresFromDynamics` returns it. */
export type PreviousReading = ScorePair & {
  comparedWith?: ComparedWith | null;
  movement?: ReportDynamics["movement"];
};

/** The line where conditions change, as a paste names it beside its number. */
const CALL_CHANGE_LINE_LABEL = "change line";

type CorridorRail = ReturnType<typeof buildSharedCorridorRails>[number];

/**
 * The side of a rail that can change the areas this week, as a verb and a
 * number: "restarts below 66 (24 pts away)" while the pause is in effect,
 * else "pauses above 76 (44 pts away)". A paste printed both sides with their
 * distances, "pause line 76 · in effect · … · restart line 66 (24 pts away)",
 * until 2026-11-03, and only one of them could move anything. Funding
 * pressure pauses high and restarts low; risk appetite the other way round
 * (`invert`). A pause in effect on a rail with no restart line says so.
 */
const describeDecidingSide = (rail: CorridorRail): string => {
  const pausesHigh = !rail.invert;
  if (rail.guardrailTripped && rail.clearsAt !== undefined) {
    return `restarts ${pausesHigh ? "below" : "above"} ${formatPoints(rail.clearsAt)} (${formatPointsToLine(rail.pointsToClear, "resume", rail.clearHolds)})`;
  }
  return `pauses ${pausesHigh ? "above" : "below"} ${formatPoints(rail.guardrail)} (${formatPointsToLine(rail.pointsToGuardrail, "pause", rail.guardrailTripped)})`;
};

const SCORE_METRICS: readonly RuleConditionMetric[] = ["tightness", "riskAppetite"];

const callChangeLine = (thresholds: Pick<RegimeThresholds, "tightnessRegime" | "riskAppetiteRegime">, metric: RuleConditionMetric) =>
  metric === "tightness" ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime;

const roundToTenth = (value: number) => Math.round(value * 10) / 10;

/**
 * The earlier scores from the week's dynamics, or null when no comparison was
 * made. `directionLabel: "unavailable"` is the loader saying there was no
 * previous reading, which is a different fact from "nothing moved"
 * (`tests/noComparisonHonesty.test.ts`); a signal absent from both lists moved
 * under the reporting floor, so the earlier reading equals this week's for it.
 *
 * The comparison behind the dynamics is last week's published brief, or the
 * previous month-end where the archive has none from the previous one to two
 * weeks (`lib/report/comparisonReading.ts`); until 2026-10-07 it was always the
 * month-end (Aug 31 for both the Sep 18 and the Sep 25 reads). The date rides
 * along as `comparedWith` so every surface that prints these scores can say
 * which (`lib/report/comparisonBasis.ts`); `docs/feature-specs-current.md`
 * §1.1.25 has the evidence.
 */
export const previousScoresFromDynamics = (
  dynamics: SignalDynamicsSource | null | undefined,
  current: ScorePair,
): PreviousReading | null => {
  if (!dynamics || dynamics.directionLabel === "unavailable") return null;
  /* `?? 0` is safe on the two scores only: `notCompared` never names them (it
     holds the rates an earlier reading did not record), and the unavailable
     guard above already answered "no comparison". A caller that copies this
     pattern for a rate key would fabricate an unchanged move — the forecast's
     lookup goes through the shared `findSignalDelta` and keeps null instead. */
  const deltaFor = (metric: RuleConditionMetric) => findSignalDelta(dynamics, metric) ?? 0;
  return {
    tightness: roundToTenth(current.tightness - deltaFor("tightness")),
    riskAppetite: roundToTenth(current.riskAppetite - deltaFor("riskAppetite")),
    ...(dynamics.comparedWith ? { comparedWith: dynamics.comparedWith } : {}),
    ...(dynamics.movement ? { movement: dynamics.movement } : {}),
  };
};

/**
 * The line every paste carries under the two readings: what each score's move
 * is made of. Null when the week has no split to print (no comparison, or a
 * score the loader could not rebuild), so a paste never claims one.
 */
export const buildScoreMovementLine = (previous: PreviousScores | null | undefined): string | null =>
  describeScoreMovementLine(previous?.movement, comparisonBasis(previous?.comparedWith));

type ScoreReferenceInput = {
  scores: ScorePair;
  thresholds?: Pick<RegimeThresholds, "tightnessRegime" | "riskAppetiteRegime">;
  rails?: readonly CorridorRail[];
  previous?: PreviousScores | null;
};

/**
 * One score's reference as the parts it prints, in print order. A surface that
 * sets the number in its own type size (the brief card) draws the parts itself,
 * with `scoreReadingDetail` for everything after the reading;
 * `buildScoreReferenceLines` joins the same parts, so the card and the paste
 * cannot say different things about the same week.
 */
export type ScoreReadingParts = {
  metric: RuleConditionMetric;
  /** "Funding pressure" */
  label: string;
  /** "90", the number as it prints beside its label. */
  value: string;
  /** Which end of the scale the score is near: "money is hard to raise". */
  meaning: string;
  /** The paste's first segment: "Funding pressure 90 of 100 (money is hard to raise)". */
  reading: string;
  /** "was 63 on Aug 31", or "last week 63" where the source has no date; null without an earlier reading. */
  previous: string | null;
  /**
   * What would change things, and how far: against a rail the one side that
   * can ("restarts below 66 (24 pts away)", "pauses below 44 (8 pts away)"),
   * else the line where conditions change ("change line 70 · 14 pts above").
   */
  condition: string;
};

export const buildScoreReadings = ({
  scores,
  thresholds = DEFAULT_THRESHOLDS,
  rails = [],
  previous = null,
}: ScoreReferenceInput): ScoreReadingParts[] =>
  SCORE_METRICS.map((metric) => {
    const rail = rails.find((candidate) => candidate.metric === metric);
    /* The meaning rides beside the number, so a paste read by someone who has
       never seen the page still says which end of the scale is bad. */
    const meaning = signalReadingMeaning(metric, scores[metric]);
    const parts = scoreReferenceParts({
      label: ruleMetricLabel[metric],
      value: scores[metric],
      line: { value: callChangeLine(thresholds, metric), label: CALL_CHANGE_LINE_LABEL },
      previous: previous?.[metric] ?? null,
      previousDate: previous?.comparedWith?.label ?? null,
    });
    return {
      metric,
      label: ruleMetricLabel[metric],
      value: parts.value,
      meaning,
      reading: `${parts.reading} (${meaning})`,
      previous: parts.previous,
      condition: rail ? describeDecidingSide(rail) : `${parts.line} · ${parts.distance}`,
    };
  });

/** Everything a score prints after its reading: the earlier reading, then what would change things. */
export const scoreReadingDetail = (parts: Pick<ScoreReadingParts, "previous" | "condition">): string =>
  [parts.previous, parts.condition].filter((part) => part !== null).join(" · ");

/**
 * One line per score.
 *
 * `Funding pressure 90 of 100 (money is hard to raise) · was 63 on Aug 31 · restarts below 66 (24 pts away)`
 *
 * With a rail the line ends on the side that can change the areas, because
 * that is the one number a reader decides on. Without one it is the change
 * line, which is the engine's threshold in force and always known.
 */
export const buildScoreReferenceLines = (input: ScoreReferenceInput): string[] =>
  buildScoreReadings(input).map((parts) => `${parts.reading} · ${scoreReadingDetail(parts)}`);
