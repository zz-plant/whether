import type { RegimeAssessment } from "../regimeEngine";
import { resolvePublishedConfidence, type ConfidenceInputs, type ConfidenceRecord } from "../report/confidence";
import { buildWeekCallChangesIf } from "../report/reportEvidence";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";

const CONFIDENCE_COPY = {
  HIGH: "The read is solid",
  MEDIUM: "The read is workable but not settled",
  LOW: "The read is shaky",
} as const;

/** The confidence a summary stores and prints, in the archive's LOW / MEDIUM / HIGH spelling. */
export type SummaryConfidence = keyof typeof CONFIDENCE_COPY;

const SUMMARY_CONFIDENCE_BY_PUBLISHED_LABEL = {
  HIGH: "HIGH",
  MED: "MEDIUM",
  LOW: "LOW",
} as const satisfies Record<ReturnType<typeof resolvePublishedConfidence>["label"], SummaryConfidence>;

/**
 * The published confidence (`resolvePublishedConfidence`), spelled the way the
 * summary shape has always stored it.
 *
 * The summaries used to print the engine's `diagnostics.confidence`, which ranks
 * the raw gap to the nearest line, where a risk-appetite point is a 4.5x larger
 * move than a funding-pressure point. That label is the state machine's
 * confirmation gate, not a published fact, and on a week like Sep 22, 2026 it
 * said Medium while every page said High. Pass the record the reading came from
 * so a stale fallback lowers it the way it does on every other surface; an
 * archived period passes none, because it is old by design.
 */
export const resolveSummaryConfidence = (
  assessment: ConfidenceInputs,
  record?: ConfidenceRecord | null,
): SummaryConfidence =>
  SUMMARY_CONFIDENCE_BY_PUBLISHED_LABEL[resolvePublishedConfidence({ assessment, record }).label];

/**
 * Renders the published confidence as prose rather than a `Confidence: high`
 * label, which reads like a debug dump in a shared artifact.
 *
 * It used to go on ", and the signals behind it are barely moving", worded from
 * the engine's `diagnostics.intensity`. That band is not a speed: it is the raw
 * distance from the nearer score to its line, so the Oct 5, 2026 week (risk
 * appetite 2 points under its line) said "barely moving" while funding pressure
 * had risen 27 points since Aug 31. What it actually measures is said by
 * `formatConditionsChangeLine`, in the numbers every other surface prints.
 */
export const formatConfidenceSentence = (confidence: SummaryConfidence) =>
  `${CONFIDENCE_COPY[confidence]}.`;

/**
 * "Conditions change if: …", the canonical sentence (`buildWeekCallChangesIf`)
 * under its canonical label, as the published brief's Slack and email copy print
 * it: how far each score sits from the line where conditions change, in points,
 * or on a held reading the hold's own condition. It printed the lines on a held
 * reading too, beside a guidance that said a line was not what would change it.
 */
export const formatConditionsChangeLine = (assessment: RegimeAssessment) =>
  `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${buildWeekCallChangesIf(assessment)}`;

/**
 * What the weekly and monthly summaries say when conditions changed on a shock
 * crossing: a score jumped far past its line in one reading, so the change did
 * not wait for the second reading every other change does.
 *
 * Both used to print "This flip crossed its line in one jump, so no published
 * reversal condition fired", the engine's account of itself: "flip" and
 * "reversal condition" are names lib/report/AGENTS.md retired, and "its line"
 * named no line. One sentence for both, so they cannot drift apart again.
 */
export const SHOCK_CROSSING_CUE =
  "A score jumped well past the line where conditions change in a single reading, so conditions changed without the second reading that normally confirms a change. Treat the change as unconfirmed until the next reading.";

type SourceLineInput = {
  sourceLabel: string;
  sourceUrl?: string;
};

export const formatSourceLine = ({ sourceLabel, sourceUrl }: SourceLineInput) =>
  sourceUrl ? `${sourceLabel} (${sourceUrl})` : sourceLabel;

const parseIsoDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
};

export const formatQuarterLabel = (value: string) => {
  const date = parseIsoDateLabel(value);
  if (!date) {
    return null;
  }

  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${year}`;
};

export const formatYearLabel = (value: string) => {
  const date = parseIsoDateLabel(value);
  if (!date) {
    return null;
  }

  return String(date.getUTCFullYear());
};
