import type { RegimeAssessment } from "../regimeEngine";
import type { RegimeSignalKey } from "./reportFormatting";
import { regimeSignalLabelByKey } from "./reportFormatting";
import { indicatorKindLabel } from "../indicatorClassification";
import type { ReportDynamics } from "./reportDataTypes";
import type { ActionStripItem } from "./operatingCalls";
import { buildSharedCorridorRails } from "./operatingCalls";
import { describeSignalDirection } from "./signalClusterReading";
import { comparisonBasis } from "./comparisonBasis";
import { describeScoreMovement } from "./scoreMovement";
import type { LadderLine } from "../../app/components/ui/scoreLadder";
import type { ScoreUnits } from "../../app/components/ui/scoreCell";
import type { TrustStripProps } from "../../app/components/trustStrip";
import { resolveDataStatusLabel } from "./trustStatus";

/**
 * What the evidence page, the answer pages and the scenario pages draw, in the
 * reader's order: the four signals against their lines with the earlier reading
 * beside them, the two composite scores against the three lines that govern the
 * call, and the four trust facts. One derivation, so a ScoreCell on /signals, a
 * ladder on a scenario page and a paste from an answer page agree on the
 * previous value, the line and the distance.
 *
 * The earlier reading is the previous monthly snapshot, and each row names it by
 * date (`previousLabel`, from `comparisonBasis`) instead of calling it last week.
 * A comparison is a fact only when one happened. `buildReportDynamics`
 * records a signal's move in `changedSignals` (or `anomalySignals` when it
 * moved past the sanity bound), and says `directionLabel: "unavailable"` when
 * there was no previous reading at all — so a signal absent from both lists
 * under a real comparison moved less than the 0.01 floor, and reads as
 * unmoved; under no comparison it has no previous value. `previous` is null
 * only where nothing is known, which is what the primitives require
 * (`tests/noComparisonHonesty.test.ts`). The exports, the homepage and /trust
 * read last week through `findSignalDelta` too, so a signal that did not move
 * prints the same way on every surface.
 */

export const SIGNAL_KEYS: readonly RegimeSignalKey[] = ["tightness", "riskAppetite", "baseRate", "curveSlope"];

type DynamicsSource = Pick<ReportDynamics, "changedSignals" | "anomalySignals" | "directionLabel" | "comparedWith" | "movement">;

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
  /** What `previous` is: the date of the reading it is from ("Aug 31"), or "Last week" where the week does not date it. */
  previousLabel: string;
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
const CALL_CHANGE_LINE_LABEL = "Change line";
const INVERSION_LINE_LABEL = "Inversion line";
const BASE_RATE_LINE_LABEL = "Pressure line";

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
const PERCENT_UNITS: ScoreUnits = { suffix: "%", scale: "", distance: "" };
const SPREAD_UNITS: ScoreUnits = { suffix: "pp", scale: "", distance: "" };

const SIGNED_WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, signDisplay: "exceptZero" });
const SIGNED_TWO = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/**
 * The recorded move for a signal, from either list it can land in: null when
 * no comparison was made, 0 when one was and the signal moved under the floor.
 */
export const findSignalDelta = (dynamics: SignalDeltaSource, key: RegimeSignalKey): number | null => {
  if (dynamics.directionLabel === "unavailable") return null;
  return (
    dynamics.changedSignals.find((signal) => signal.key === key)?.delta
    ?? dynamics.anomalySignals?.find((signal) => signal.key === key)?.delta
    ?? 0
  );
};

const previousFrom = (value: number | null, delta: number | null) =>
  value === null || delta === null ? null : value - delta;

const rowFor = (
  key: RegimeSignalKey,
  value: number | null,
  line: SignalReferenceRow["line"],
  units: ScoreUnits,
  dynamics: DynamicsSource,
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
    previousLabel: basis.label,
    delta,
    line,
    units,
    betterWhen: BETTER_WHEN[key],
    direction,
    movement: isScore ? describeScoreMovement(key, dynamics.movement?.[key], basis) : null,
    watchHref: WATCH_HREF_BY_KEY[key],
  };
};

/** Every signal, each against the line that governs it. */
export const buildSignalReferenceRows = (
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">,
  dynamics: DynamicsSource,
): SignalReferenceRow[] => {
  const { scores, thresholds } = assessment;
  return [
    rowFor("tightness", scores.tightness, { value: thresholds.tightnessRegime, label: CALL_CHANGE_LINE_LABEL }, SCORE_UNITS, dynamics),
    rowFor("riskAppetite", scores.riskAppetite, { value: thresholds.riskAppetiteRegime, label: CALL_CHANGE_LINE_LABEL }, SCORE_UNITS, dynamics),
    rowFor("baseRate", scores.baseRate, { value: thresholds.baseRateTightness, label: BASE_RATE_LINE_LABEL }, PERCENT_UNITS, dynamics),
    rowFor("curveSlope", scores.curveSlope, { value: 0, label: INVERSION_LINE_LABEL }, SPREAD_UNITS, dynamics),
  ];
};

export type CallLineLadder = {
  key: "tightness" | "riskAppetite";
  label: string;
  value: number;
  previous: number | null;
  /** What `previous` is, as `SignalReferenceRow.previousLabel` names it. */
  previousLabel: string;
  lines: LadderLine[];
};

/**
 * The two composite scores against the three lines that decide the call: the
 * pause and resume lines every area shares, and the line where the call itself
 * changes. The pause and resume lines come from the same clause data the rule
 * sentences are derived from, so the ladder cannot draw a line the sentence
 * beside it does not state; a week with no rules draws the call line alone.
 */
export const buildCallLineLadders = (
  assessment: Pick<RegimeAssessment, "scores" | "thresholds">,
  dynamics: DynamicsSource,
  actionStripItems: readonly Pick<ActionStripItem, "pauseConditions" | "resumeConditions">[],
): CallLineLadder[] => {
  const { scores, thresholds } = assessment;
  const rails = buildSharedCorridorRails(actionStripItems, scores);
  const forKey = (key: "tightness" | "riskAppetite", callChange: number): CallLineLadder => {
    const rail = rails.find((candidate) => candidate.metric === key);
    const lines: LadderLine[] = [];
    if (rail) lines.push({ kind: "pause", value: rail.guardrail });
    if (rail?.clearsAt !== undefined) lines.push({ kind: "resume", value: rail.clearsAt });
    lines.push({ kind: "callChange", value: callChange });
    const value = scores[key];
    return {
      key,
      label: regimeSignalLabelByKey[key],
      value,
      previous: previousFrom(value, findSignalDelta(dynamics, key)),
      previousLabel: comparisonBasis(dynamics.comparedWith).label,
      lines,
    };
  };
  return [forKey("tightness", thresholds.tightnessRegime), forKey("riskAppetite", thresholds.riskAppetiteRegime)];
};

/** The two engine facts "could change next week" reads, and nothing else. */
type CallChangeSource = {
  diagnostics: Pick<RegimeAssessment["diagnostics"], "transitionWatch">;
  regimeTransition?: Pick<NonNullable<RegimeAssessment["regimeTransition"]>, "pending">;
};

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
 * - could change: near a line, or a change held back for its confirming read.
 */
export const buildTrustStripProps = ({
  recordDateLabel,
  isFallback,
  isHistorical = false,
  degradedSourceCount = 0,
  confidenceLabel,
  assessment,
}: {
  recordDateLabel: string;
  isFallback: boolean;
  isHistorical?: boolean;
  /** Sources answering from a fallback (`buildDegradedSourceRows(...).length`). */
  degradedSourceCount?: number;
  confidenceLabel: TrustStripProps["confidenceLabel"];
  assessment: CallChangeSource;
}): Omit<TrustStripProps, "href" | "className"> => ({
  recordDateLabel,
  sourcesLive: !isHistorical && !isFallback && degradedSourceCount === 0,
  sourcesLabel: resolveDataStatusLabel({
    isHistoricalSelection: isHistorical,
    isFallbackSnapshot: isFallback,
    degradedSourceCount,
  }),
  confidenceLabel,
  couldChangeNextWeek: couldCallChangeNextWeek(assessment),
});

/**
 * Yes when a score sits near its line (`transitionWatch`), or when the engine
 * is holding a change back for its confirming reading — the week the call
 * changes next reading if it holds, which a distance test alone reads as No.
 */
const couldCallChangeNextWeek = (assessment: CallChangeSource) =>
  Boolean(assessment.diagnostics.transitionWatch || assessment.regimeTransition?.pending);
