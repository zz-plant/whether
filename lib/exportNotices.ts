export const INTERNAL_USE_LABEL = "Internal use only";

export const buildComplianceStamp = ({
  sourceLine,
  timestamp,
  confidence,
}: {
  sourceLine: string;
  timestamp: string;
  confidence: string;
}) => [
  "Internal use only",
  `Source: ${sourceLine} · ${timestamp} · Confidence: ${confidence}`,
];
