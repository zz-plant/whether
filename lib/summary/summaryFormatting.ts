const CONFIDENCE_COPY = {
  HIGH: "The read is solid",
  MEDIUM: "The read is workable but not settled",
  LOW: "The read is shaky",
} as const;

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
  confidence: keyof typeof CONFIDENCE_COPY,
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
