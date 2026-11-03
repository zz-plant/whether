import type { RegimeAssessment } from "../regimeEngine";
import type { RegimeSignalKey } from "./reportFormatting";
import { regimeSignalLabelByKey } from "./reportFormatting";
import { indicatorKindLabel } from "../indicatorClassification";
import type { ReportDynamics } from "./reportDataTypes";
import { describeSignalDirection } from "./signalClusterReading";
import { comparisonBasis } from "./comparisonBasis";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";
import { describeScoreMovement } from "./scoreMovement";
import { describeNotCountedScore, joinSentences, type ScoringBasis } from "./scoringBasis";
import type { ScoreUnits } from "../../app/components/ui/scoreCell";
import type { TrustStripProps } from "../../app/components/trustStrip";
import { couldCallChangeNextWeek, resolveDataStatusLabel } from "./trustStatus";
import { resolveNearestLineMargin, type ConfidenceInputs } from "./confidence";
import { calibrationForDistance } from "./confidenceCalibration";

/**
 * What the evidence page, the answer pages and the scenario pages draw, in the
 * reader's order: the four signals against their lines with the earlier reading
 * beside them, the two composite scores against the three lines that govern the
 * call, and the four trust facts. One derivation, so a ScoreCell on /signals, a
 * ladder on a scenario page and a paste from an answer page agree on the
 * previous value, the line and the distance.
 *
 * The earlier reading is last week's published brief, or the previous month-end
 * where there is none (`lib/report/comparisonReading.ts`), and each row's move
 * names it by date (from `comparisonBasis`) instead of calling it last week.
 * A comparison is a fact only when one happened. `buildReportDynamics`
 * records a signal's move in `changedSignals` (or `anomalySignals` when it
 * moved past the sanity bound), and says `directionLabel: "unavailable"` when
 * there was no previous reading at all — so a signal absent from both lists
 * under a real comparison moved less than the 0.01 floor, and reads as
 * unmoved, unless the earlier reading did not record it (`notCompared`); under
 * no comparison it has no previous value. `previous` is null
 * only where nothing is known, which is what the primitives require
 * (`tests/noComparisonHonesty.test.ts`). The exports, the homepage and /trust
 * read last week through `findSignalDelta` too, so a signal that did not move
 * prints the same way on every surface.
 */


type DynamicsSource = Pick<ReportDynamics, "changedSignals" | "anomalySignals" | "directionLabel" | "comparedWith" | "movement" | "notCompared">;

/**
 * Just what a signal's recorded move needs. The homepage model is handed a looser
 * `reportDynamics` than the loader's (no labels), and its callers still have to read
 * the same moves — including the ones past the weekly sanity limit, which are only in
 * `anomalySignals` and are otherwise read as a week that did not move.
 */
type SignalDeltaSource = {
  directionLabel: ReportDynamics["directionLabel"];
  changedSignals: ReadonlyArray<{ key: RegimeSignalKey; delta: number }>;
  anomalySignals?: ReadonlyArray<{ key: RegimeSignalKey; delta: number }>;
  /** Signals the earlier reading did not record: no move, not a zero one. */
  notCompared?: ReadonlyArray<RegimeSignalKey>;
};

/** `SignalDeltaSource` plus the reading the moves are against and what they are made of, where the source has them. */
export type SignalDynamicsSource = SignalDeltaSource & Partial<Pick<ReportDynamics, "comparedWith" | "movement">>;


export type SignalReferenceRow = {
  key: RegimeSignalKey;
  label: string;
  /** "Leading (predictive)" or "Lagging (confirming)"; null for an input that is neither. */
  kindLabel: string | null;
  /** Null when the series did not resolve this week. */
  value: number | null;
  previous: number | null;
  /** The signed move, when one was recorded. */
  delta: number | null;
  line: { value: number; label: string };
  units: ScoreUnits;
  /** Which way is the comfortable one, for colouring the move. */
  betterWhen: "higher" | "lower";
  /** One sentence for the move, in the reader's terms. */
  direction: { label: string; tone: "easing" | "tightening" | "unchanged" };
  /** What a score's move is made of, in a sentence; null for an input, and for a score the loader could not split. */
  movement: string | null;
  /** The watch page for this signal, where one exists. */
  watchHref: string | null;
};

/** The line at which the call itself changes; the ladder's own label for that kind. */
const CALL_CHANGE_LINE_LABEL = DECISION_CONTRACT_LABELS.watch.changeLine;
const INVERSION_LINE_LABEL = "Inverted below";
const BASE_RATE_LINE_LABEL = "Counts against you above";

const WATCH_HREF_BY_KEY: Record<RegimeSignalKey, string | null> = {
  tightness: "/signals/capital-tightness-watch",
  riskAppetite: "/signals/risk-appetite-watch",
  baseRate: null,
  curveSlope: "/signals/yield-curve-flip-watch",
};

const BETTER_WHEN: Record<RegimeSignalKey, "higher" | "lower"> = {
  tightness: "lower",
  riskAppetite: "higher",
  baseRate: "lower",
  curveSlope: "higher",
};

const SCORE_UNITS: ScoreUnits = {};
/* Two places, as the rate is quoted and as the row's header prints it. */
const PERCENT_UNITS: ScoreUnits = { suffix: "%", scale: "", distance: "", decimals: 2 };
const SPREAD_UNITS: ScoreUnits = { suffix: "pp", scale: "", distance: "", decimals: 2 };

const SIGNED_WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, signDisplay: "exceptZero" });
const SIGNED_TWO = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/**
 * The recorded move for a signal, from either list it can land in: null when
 * no comparison was made, or when the earlier reading did not record this
 * signal (last week's brief, before it stored the two rates); 0 when one was
 * and the signal moved under the floor.
 */
export const findSignalDelta = (dynamics: SignalDeltaSource, key: RegimeSignalKey): number | null => {
  if (dynamics.directionLabel === "unavailable") return null;
  if (dynamics.notCompared?.includes(key)) return null;
  return (
    dynamics.changedSignals.find((signal) => signal.key === key)?.delta
    ?? dynamics.anomalySignals?.find((signal) => signal.key === key)?.delta
    ?? 0
  );
};

/**
 * Which way conditions moved against the comparison reading, from the two
 * scores conditions are made of, each judged on its own better side: higher
 * funding pressure is worse, higher risk appetite is better. Null when nothing
 * was compared.
 *
 * Not `directionLabel`, which also counts the short-term rate and the
 * recession warning gauge as moves of their own. On Oct 5 both scores had
 * worsened since Aug 31 (funding pressure 63 to 90, risk appetite 56 to 48) and
 * the gauge had steepened 0.06pp, so `directionLabel` was "mixed" and the
 * answer pages printed "Conditions are Freezing and mixed".
 */
export const describeScoresMovement = (
  dynamics: SignalDeltaSource,
): "improving" | "worsening" | "mixed" | "holding" | null => {
  if (dynamics.directionLabel === "unavailable") return null;
  const sides = (["tightness", "riskAppetite"] as const).map((key) => {
    const delta = findSignalDelta(dynamics, key) ?? 0;
    if (delta === 0) return "flat";
    return (BETTER_WHEN[key] === "higher") === delta > 0 ? "better" : "worse";
  });
  if (sides.includes("better") && sides.includes("worse")) return "mixed";
  if (sides.includes("better")) return "improving";
  if (sides.includes("worse")) return "worsening";
  return "holding";
};

const previousFrom = (value: number | null, delta: number | null) =>
  value === null || delta === null ? null : value - delta;

const rowFor = (
  key: RegimeSignalKey,
  value: number | null,
  line: SignalReferenceRow["line"],
  units: ScoreUnits,
  dynamics: DynamicsSource,
  scoringBasis?: Pick<ScoringBasis, "notCounted">,
): SignalReferenceRow => {
  const delta = value === null ? null : findSignalDelta(dynamics, key);
  const isScore = key === "tightness" || key === "riskAppetite";
  const basis = comparisonBasis(dynamics.comparedWith);
  const direction = describeSignalDirection(
    delta,
    BETTER_WHEN[key],
    isScore ? " points" : key === "baseRate" ? "%" : "pp",
    isScore ? SIGNED_WHOLE : SIGNED_TWO,
    basis,
  );
  return {
    key,
    label: regimeSignalLabelByKey[key],
    kindLabel: indicatorKindLabel(key),
    value,
    previous: previousFrom(value, delta),
    delta,
    line,
    units,
    betterWhen: BETTER_WHEN[key],
    direction,
    movement: isScore ? joinSentences(describeScoreMovement(key, dynamics.movement?.[key], basis), describeNotCountedScore(key, scoringBasis)) : null,
    watchHref: WATCH_HREF_BY_KEY[key],
  };
};

/** Every signal, each against the line that governs it. */
export const buildSignalReferenceRows = (
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">,
  dynamics: DynamicsSource,
  /** What each score leaves out (`ReportData.scoringBasis`), said under its row after the move. */
  scoringBasis?: Pick<ScoringBasis, "notCounted">,
): SignalReferenceRow[] => {
  const { scores, thresholds } = assessment;
  return [
    rowFor("tightness", scores.tightness, { value: thresholds.tightnessRegime, label: CALL_CHANGE_LINE_LABEL }, SCORE_UNITS, dynamics, scoringBasis),
    rowFor("riskAppetite", scores.riskAppetite, { value: thresholds.riskAppetiteRegime, label: CALL_CHANGE_LINE_LABEL }, SCORE_UNITS, dynamics, scoringBasis),
    rowFor("baseRate", scores.baseRate, { value: thresholds.baseRateTightness, label: BASE_RATE_LINE_LABEL }, PERCENT_UNITS, dynamics),
    rowFor("curveSlope", scores.curveSlope, { value: 0, label: INVERSION_LINE_LABEL }, SPREAD_UNITS, dynamics),
  ];
};

/* Why the next reading could change conditions, when the margin cell beside it
   does not already say: a change waiting on its second reading. The distance to
   the nearer line is the margin cell's (`resolveNearestLineMargin`), so the two
   cells no longer state it twice, or pick different lines to state it from. */
const describeChangeReason = (assessment: { regimeTransition?: { pending?: unknown } }): string | undefined =>
  assessment.regimeTransition?.pending ? "a change is waiting on a second reading" : undefined;

/**
 * The four trust facts, the one way every reading route states them.
 *
 * Each route used to fill the strip from what it happened to hold, so one
 * reading could say High on /signals and Medium on /trust, "could change: Yes"
 * on one and No on the next, and "Live" on an answer page serving the bundled
 * snapshot. Now:
 *
 * - sources: `resolveDataStatusLabel`, the phrase table /trust and the homepage
 *   banner already share (historical, cached snapshot, partly cached, live);
 * - confidence: the published label (`resolvePublishedConfidence`, which
 *   drops a step on a stale fallback), passed in by the caller that holds it;
 * - could change: `couldCallChangeNextWeek`, the rule /brief.md and every
 *   export read through the homepage model's `transitionWatch`, with the
 *   reason beside it (`changeReason`).
 */
export const buildTrustStripProps = ({
  recordDateLabel,
  isFallback,
  isHistorical = false,
  degradedSourceCount = 0,
  confidenceLabel,
  assessment,
  scoringBasis,
  basisNote,
}: {
  recordDateLabel: string;
  isFallback: boolean;
  isHistorical?: boolean;
  /** Sources answering from a fallback (`buildDegradedSourceRows(...).length`). */
  degradedSourceCount?: number;
  confidenceLabel: TrustStripProps["confidenceLabel"];
  /** Which inputs set the scores, and what the ones left out would do (`ReportData.scoringBasis`). */
  scoringBasis?: Pick<ScoringBasis, "key" | "value" | "warning" | "warningShort">;
  /** Why the published week's conditions differ, where the basis is why (`describePublishedWeekBasis`): the homepage's alone. */
  basisNote?: string | null;
  assessment: Parameters<typeof couldCallChangeNextWeek>[0] & {
    scores?: ConfidenceInputs["scores"];
    thresholds?: { tightnessRegime: number; riskAppetiteRegime: number };
  };
}): Omit<TrustStripProps, "href" | "className"> => {
  const margin =
    assessment.scores && assessment.thresholds
      ? resolveNearestLineMargin({ scores: assessment.scores, thresholds: assessment.thresholds })
      : undefined;
  const calibration = margin ? calibrationForDistance(margin.points) : null;

  return {
    recordDateLabel,
    sourcesLive: !isHistorical && !isFallback && degradedSourceCount === 0,
    sourcesLabel: resolveDataStatusLabel({
      isHistoricalSelection: isHistorical,
      isFallbackSnapshot: isFallback,
      degradedSourceCount,
    }),
    confidenceLabel,
    ...(margin ? { margin } : {}),
    ...(calibration && calibration.months >= 5
      ? { baseRate: { held: calibration.held, months: calibration.months } }
      : {}),
    couldChangeNextWeek: couldCallChangeNextWeek(assessment),
    changeReason: couldCallChangeNextWeek(assessment) ? describeChangeReason(assessment) : undefined,
    basis: {
      key: scoringBasis?.key ?? "record",
      value: scoringBasis?.value ?? "The record's inputs",
      warning: scoringBasis?.warning ?? null,
      warningShort: scoringBasis?.warningShort ?? null,
      note: basisNote ?? null,
    },
  };
};
