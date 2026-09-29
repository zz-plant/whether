import { DECISION_CONTRACT_LABELS } from "../reportCopy";
import { formatRegimeSignalValue, type RegimeSignalKey } from "../reportFormatting";
import { classifyScoreBand, scoreBandScaleLabel } from "../signalTranslations";
import { describeInputMovement } from "../inputMovement";
import { formatPointsToLine, toThresholdDistance, type ActionStripItem, type RuleThresholdDistance } from "../operatingCalls";
import { operatingLeverToDecisionArea } from "../businessAreaMap";
import type { BoundedDecisionRule, DecisionArea } from "../boundedDecisionRules";
import type { RegimeSignalIndicator, RevisitQueueItem } from "../homeBriefModel";
import { findSignalDelta } from "../evidenceReaderModel";
import { comparisonBasis, type ComparisonBasis } from "../comparisonBasis";

/**
 * The homepage as five sections in the reader's order: the call, what changed,
 * what that changes by area, what would change the call, and what to do and
 * share. Each section is a heading and an id here, and a component under
 * app/components/home that draws one of them; the route composes them and
 * nothing else on `/` restates a section's content inside another's.
 */
export const HOME_SECTIONS = {
  call: { id: "weekly-call" },
  changed: { id: "what-changed", heading: "What changed this week" },
  consequences: { id: "what-it-changes", heading: "What that changes for you" },
  watch: { id: "what-would-change", heading: DECISION_CONTRACT_LABELS.watch.flipWatch },
  act: { id: "do-and-share", heading: "Do and share" },
} as const;

/** The three lines a score is drawn against, as the ladder primitive takes them. */
export type HomeLadderLine = { kind: "pause" | "resume" | "callChange"; value: number };

export type SignalChangeRow = {
  key: RegimeSignalKey;
  label: string;
  value: number | null;
  valueLabel: string;
  /** The earlier reading, or null when no comparison was made — never an invented flat one. */
  previous: number | null;
  previousLabel: string | null;
  delta: number | null;
  /** Which way "up" counts: funding pressure and the base rate worsen as they rise. */
  increaseIsPositive: boolean;
  /** Where on its 0–100 scale a composite score sits, in the scale's words. */
  scaleLabel?: string;
  /** The lines a composite score is judged against; absent for the two market inputs. */
  lines?: HomeLadderLine[];
  /** The unclipped pressure behind a score pinned at the top of its scale. */
  saturatedPressure?: number;
};

const INCREASE_IS_POSITIVE: Record<RegimeSignalKey, boolean> = {
  tightness: false,
  baseRate: false,
  riskAppetite: true,
  curveSlope: true,
};

const SIGNAL_ORDER: readonly RegimeSignalKey[] = ["tightness", "riskAppetite", "baseRate", "curveSlope"];

type MetricLines = Partial<Record<"tightness" | "riskAppetite", { pause?: number; resume?: number; callChange: number }>>;

export const buildSignalChangeRows = ({
  indicators,
  lines,
  dynamics,
  tightnessPressure,
  tightnessSaturated,
}: {
  indicators: readonly RegimeSignalIndicator[];
  /** The week's comparison. Last week comes from here, not from the indicator's label. */
  dynamics: Parameters<typeof findSignalDelta>[0];
  lines: MetricLines;
  tightnessPressure?: number;
  tightnessSaturated?: boolean;
}): SignalChangeRow[] => {
  const byKey = new Map(indicators.map((indicator) => [indicator.key, indicator]));
  return SIGNAL_ORDER.flatMap((key) => {
    const indicator = byKey.get(key);
    if (!indicator) return [];
    const value = indicator.rawValue;
    /* Through the same `findSignalDelta` /signals and the exports read, so a
       signal that did not move reads as unmoved (not as "no comparison"), and
       a move past the weekly sanity limit is still drawn. The indicator's own
       label drops both: it only knows `changedSignals`. */
    const delta = typeof value === "number" ? findSignalDelta(dynamics, key) : null;
    const previous = typeof value === "number" && delta !== null ? Number((value - delta).toFixed(2)) : null;
    const isScore = key === "tightness" || key === "riskAppetite";
    const metricLines = isScore ? lines[key] : undefined;
    return [{
      key,
      label: indicator.label,
      value,
      valueLabel: indicator.valueLabel,
      previous,
      previousLabel: previous === null ? null : formatRegimeSignalValue(previous, key),
      delta,
      increaseIsPositive: INCREASE_IS_POSITIVE[key],
      scaleLabel: isScore && typeof value === "number" ? scoreBandScaleLabel(classifyScoreBand(value)) : undefined,
      lines: metricLines
        ? [
            ...(typeof metricLines.pause === "number" ? [{ kind: "pause" as const, value: metricLines.pause }] : []),
            ...(typeof metricLines.resume === "number" ? [{ kind: "resume" as const, value: metricLines.resume }] : []),
            { kind: "callChange" as const, value: metricLines.callChange },
          ]
        : undefined,
      saturatedPressure:
        key === "tightness" && tightnessSaturated && typeof tightnessPressure === "number" ? tightnessPressure : undefined,
    }];
  });
};

/**
 * The sentence over the table: how the two scores moved, from the same deltas
 * the rows print. A degraded read hands the page zero deltas, and saying
 * "neither score moved" on one would be the manufactured-stable claim
 * tests/noComparisonHonesty.test.ts exists to keep off the page.
 *
 * The move is measured against the earlier reading the week's dynamics name
 * (`comparisonBasis`), so it says "since Aug 31" where it used to say "this
 * week": the reading behind these deltas is the last month-end. A caller
 * with no date keeps "this week".
 */
const NO_COMPARISON_SENTENCE = "No previous week to compare the scores against.";

const INPUT_MOVEMENT_SENTENCE: Record<ReturnType<typeof describeInputMovement>, (window: string) => string> = {
  "steady inputs": (window) => `Neither score moved much ${window}.`,
  "tightening inputs": (window) => `The scores moved toward tighter money ${window}.`,
  "easing inputs": (window) => `The scores moved toward easier money ${window}.`,
  "mixed inputs": (window) => `The two scores moved in opposite directions ${window}.`,
};

export const describeWeeklyMovement = ({
  tightnessDelta,
  riskAppetiteDelta,
  comparisonUnavailable,
  basis = comparisonBasis(),
}: {
  tightnessDelta: number;
  riskAppetiteDelta: number;
  comparisonUnavailable: boolean;
  basis?: ComparisonBasis;
}) =>
  comparisonUnavailable
    ? NO_COMPARISON_SENTENCE
    : INPUT_MOVEMENT_SENTENCE[describeInputMovement(tightnessDelta, riskAppetiteDelta)](
        basis.date ? basis.since : "this week",
      );

export type HomeAreaRow = {
  area: DecisionArea;
  rule: string;
  pause?: { line: string; distance: string };
  resume?: { line: string; distance: string };
  /** The area-specific re-check the week's move put on it, if any. */
  changed?: string;
  /** Non-numeric conditions the rule states beside its lines. */
  pauseQualifier?: string;
  resumeQualifier?: string;
};

const lineSlot = (distance: RuleThresholdDistance | undefined, kind: "pause" | "resume") =>
  distance ? { line: distance.label, distance: formatPointsToLine(distance.pointsToLine, kind, distance.satisfied) } : undefined;

const nearest = (distances: RuleThresholdDistance[]) =>
  [...distances].sort((left, right) => left.pointsToLine - right.pointsToLine)[0];

/**
 * One row per area, whichever source the week carries. The action strip is
 * the stage-scoped rule set the brief prints; the canonical rules are what it
 * is built from, and stand in when the strip is absent. Both name the same
 * five areas, and the table sorts them into `decisionAreaOrder` itself.
 */
export const buildHomeAreaRows = ({
  actionStripItems,
  decisionRules,
  revisitQueue,
  scores,
}: {
  actionStripItems?: readonly ActionStripItem[];
  decisionRules: readonly BoundedDecisionRule[];
  revisitQueue: readonly RevisitQueueItem[];
  scores: { tightness: number; riskAppetite: number };
}): HomeAreaRow[] => {
  const recheckByArea = new Map(revisitQueue.map((item) => [item.id, item.recheck]));

  if (actionStripItems && actionStripItems.length > 0) {
    return actionStripItems.map((item) => {
      const area = operatingLeverToDecisionArea[item.lever];
      return {
        area,
        rule: item.areaActionNow,
        pause: lineSlot(item.nearestPause, "pause"),
        resume: lineSlot(item.nearestResume, "resume"),
        changed: recheckByArea.get(area),
        pauseQualifier: item.pauseQualifier,
        resumeQualifier: item.resumeQualifier,
      };
    });
  }

  return decisionRules.map((rule) => ({
    area: rule.area,
    rule: rule.doNow[0] ?? rule.recommendation,
    pause: lineSlot(nearest(rule.pause.conditions.map((condition) => toThresholdDistance(condition, scores))), "pause"),
    resume: lineSlot(nearest(rule.resume.conditions.map((condition) => toThresholdDistance(condition, scores))), "resume"),
    changed: recheckByArea.get(rule.area),
    pauseQualifier: rule.pause.qualifier,
    resumeQualifier: rule.resume.qualifier,
  }));
};
