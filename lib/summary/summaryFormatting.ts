import { resolvePublishedConfidence, type ConfidenceInputs, type ConfidenceRecord } from "../report/confidence";

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

const INTENSITY_COPY = {
  STRONG: "the signals behind it are moving hard",
  STANDARD: "the signals behind it are moving at a normal clip",
  MILD: "the signals behind it are barely moving",
} as const;

/**
 * Renders confidence + intensity as prose rather than a `Confidence: high (mild
 * signal)` label pair, which reads like a debug dump in a shared artifact.
 */
export const formatConfidenceSentence = (
  confidence: SummaryConfidence,
  intensity: keyof typeof INTENSITY_COPY,
) => `${CONFIDENCE_COPY[confidence]}, and ${INTENSITY_COPY[intensity]}.`;

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
