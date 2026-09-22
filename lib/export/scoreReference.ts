import { formatScoreReference } from "../../app/components/ui/scoreCell";
import { DEFAULT_THRESHOLDS, type RegimeThresholds } from "../regimeEngineCore";
import { ruleMetricLabel, type RuleConditionMetric } from "../report/boundedDecisionRules";
import { buildSharedCorridorRails, formatPointsToLine } from "../report/operatingCalls";
import type { ReportDynamics } from "../report/reportDataTypes";
import { findSignalDelta } from "../report/evidenceReaderModel";

/**
 * The two scores as every export prints them: value, the line each is judged
 * against, the distance to it, and last week — in that order, through the
 * same `formatScoreReference` the page's `ScoreCell` uses. Before this each
 * builder printed its own shape ("Funding pressure 12 / Risk appetite 68",
 * "Signals: Funding pressure 83 · Risk Appetite 40", "79/100 (9 pts above the
 * line…)"), and none of them carried last week even where the inputs had it.
 *
 * The line is the pause line when the export knows one (a rule's rails), else
 * the line where the call itself changes. Last week prints only when the
 * caller's inputs carry it; nothing here invents a comparison.
 */
export type ScorePair = Record<RuleConditionMetric, number>;

/** Last week's readings, per metric; null where the surface has no previous week for that metric. */
type PreviousScores = Partial<Record<RuleConditionMetric, number | null>>;

/** What each of the three lines is called in a paste. */
const SCORE_LINE_LABELS = {
  pause: "pause line",
  resume: "resume line",
  callChange: "call changes at",
} as const;

type CorridorRail = ReturnType<typeof buildSharedCorridorRails>[number];

const SCORE_METRICS: readonly RuleConditionMetric[] = ["tightness", "riskAppetite"];

const callChangeLine = (thresholds: Pick<RegimeThresholds, "tightnessRegime" | "riskAppetiteRegime">, metric: RuleConditionMetric) =>
  metric === "tightness" ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime;

const roundToTenth = (value: number) => Math.round(value * 10) / 10;

/**
 * Last week's scores from the week's dynamics, or null when no comparison was
 * made. `directionLabel: "unavailable"` is the loader saying there was no
 * previous reading, which is a different fact from "nothing moved"
 * (`tests/noComparisonHonesty.test.ts`); a signal absent from both lists moved
 * under the reporting floor, so last week equals this week for it.
 */
export const previousScoresFromDynamics = (
  dynamics: Pick<ReportDynamics, "directionLabel" | "changedSignals" | "anomalySignals"> | null | undefined,
  current: ScorePair,
): ScorePair | null => {
  if (!dynamics || dynamics.directionLabel === "unavailable") return null;
  const deltaFor = (metric: RuleConditionMetric) => findSignalDelta(dynamics, metric) ?? 0;
  return {
    tightness: roundToTenth(current.tightness - deltaFor("tightness")),
    riskAppetite: roundToTenth(current.riskAppetite - deltaFor("riskAppetite")),
  };
};

/**
 * One line per score.
 *
 * `Funding pressure 12 of 100 · pause line 76 · 64 pts below · last week 15 · resume line 66 (already met)`
 *
 * With a rail the reference line is the pause line and the resume line follows
 * with its own distance, because "how close to re-opening" is the second thing
 * a reader decides on. Without one it is the call-change line, which is the
 * engine's threshold in force and always known.
 */
export const buildScoreReferenceLines = ({
  scores,
  thresholds = DEFAULT_THRESHOLDS,
  rails = [],
  previous = null,
}: {
  scores: ScorePair;
  thresholds?: Pick<RegimeThresholds, "tightnessRegime" | "riskAppetiteRegime">;
  rails?: readonly CorridorRail[];
  previous?: PreviousScores | null;
}): string[] =>
  SCORE_METRICS.map((metric) => {
    const rail = rails.find((candidate) => candidate.metric === metric);
    const line = rail
      ? { value: rail.guardrail, label: SCORE_LINE_LABELS.pause }
      : { value: callChangeLine(thresholds, metric), label: SCORE_LINE_LABELS.callChange };
    const reference = formatScoreReference({
      label: ruleMetricLabel[metric],
      value: scores[metric],
      line,
      previous: previous?.[metric] ?? null,
    });
    const resume =
      rail && rail.clearsAt !== undefined
        ? ` · ${SCORE_LINE_LABELS.resume} ${rail.clearsAt} (${formatPointsToLine(rail.pointsToClear, "resume", rail.clearHolds)})`
        : "";
    return `${reference}${resume}`;
  });
