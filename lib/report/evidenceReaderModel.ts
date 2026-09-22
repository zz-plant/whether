import type { RegimeAssessment } from "../regimeEngine";
import type { RegimeSignalKey } from "./reportFormatting";
import { regimeSignalLabelByKey } from "./reportFormatting";
import { indicatorKindLabel } from "../indicatorClassification";
import type { ReportDynamics } from "./reportDataTypes";
import type { ActionStripItem } from "./operatingCalls";
import { buildSharedCorridorRails } from "./operatingCalls";
import { describeSignalDirection } from "./signalClusterReading";
import type { LadderLine } from "../../app/components/ui/scoreLadder";
import type { ScoreUnits } from "../../app/components/ui/scoreCell";
import type { TrustStripProps } from "../../app/components/trustStrip";

/**
 * What the evidence page, the answer pages and the scenario pages draw, in the
 * reader's order: the four signals against their lines with last week beside
 * them, the two composite scores against the three lines that govern the call,
 * and the four trust facts. One derivation, so a ScoreCell on /signals, a
 * ladder on a scenario page and a paste from an answer page agree on the
 * previous value, the line and the distance.
 *
 * "Last week" is a fact only when a comparison happened. `buildReportDynamics`
 * records a signal's move in `changedSignals` (or `anomalySignals` when it
 * moved past the sanity bound), and says `directionLabel: "unavailable"` when
 * there was no previous reading at all — so a signal absent from both lists
 * under a real comparison moved less than the 0.01 floor, and under no
 * comparison has no previous value. `previous` is null in both of the cases
 * where nothing is known, which is what the primitives require
 * (`tests/noComparisonHonesty.test.ts`).
 */

export const SIGNAL_KEYS: readonly RegimeSignalKey[] = ["tightness", "riskAppetite", "baseRate", "curveSlope"];

type DynamicsSource = Pick<ReportDynamics, "changedSignals" | "anomalySignals" | "directionLabel">;

type AssessmentSource = Pick<RegimeAssessment, "scores" | "thresholds" | "diagnostics">;

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
  /** The watch page for this signal, where one exists. */
  watchHref: string | null;
};

/** The line at which the call itself changes; the ladder's own label for that kind. */
const CALL_CHANGE_LINE_LABEL = "Call changes";
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

/** The recorded move for a signal, from either list it can land in. */
export const findSignalDelta = (dynamics: DynamicsSource, key: RegimeSignalKey): number | null => {
  if (dynamics.directionLabel === "unavailable") return null;
  return (
    dynamics.changedSignals.find((signal) => signal.key === key)?.delta
    ?? dynamics.anomalySignals.find((signal) => signal.key === key)?.delta
    ?? null
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
  const direction = describeSignalDirection(
    delta,
    BETTER_WHEN[key],
    isScore ? " points" : key === "baseRate" ? "%" : "pp",
    isScore ? SIGNED_WHOLE : SIGNED_TWO,
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
      lines,
    };
  };
  return [forKey("tightness", thresholds.tightnessRegime), forKey("riskAppetite", thresholds.riskAppetiteRegime)];
};

/** The four trust facts, from what every reading route already has. */
export const buildTrustStripProps = ({
  recordDateLabel,
  isFallback,
  isHistorical = false,
  confidence,
  couldChangeNextWeek,
}: {
  recordDateLabel: string;
  isFallback: boolean;
  isHistorical?: boolean;
  confidence: RegimeAssessment["diagnostics"]["confidence"] | "MED";
  couldChangeNextWeek: boolean;
}): Omit<TrustStripProps, "href" | "className"> => ({
  recordDateLabel,
  sourcesLive: !isFallback && !isHistorical,
  sourcesLabel: isHistorical ? "Historical snapshot" : isFallback ? "Cached snapshot" : "All sources live",
  confidenceLabel: confidence === "MEDIUM" ? "MED" : confidence,
  couldChangeNextWeek,
});

/** `buildTrustStripProps` from an assessment, for the routes that carry one. */
export const trustStripFromAssessment = (
  assessment: AssessmentSource,
  args: { recordDateLabel: string; isFallback: boolean; isHistorical?: boolean },
) =>
  buildTrustStripProps({
    ...args,
    confidence: assessment.diagnostics.confidence,
    couldChangeNextWeek: assessment.diagnostics.transitionWatch,
  });
