export const INTERNAL_USE_LABEL = "";

export const buildComplianceStamp = ({
  sourceLine,
  timestamp,
  confidence,
}: {
  sourceLine: string;
  timestamp: string;
  confidence: string;
}) => [
  `Source: ${sourceLine} · ${timestamp} · Confidence: ${confidence}`,
];
