export const buildComplianceStamp = ({
  sourceLine,
  timestamp,
  confidence,
}: {
  sourceLine: string;
  timestamp: string;
  confidence: string;
}) => [
  /* "Margin", where this said "Confidence": the number is a distance from the change line (2026-10-09). */
  `Source: ${sourceLine} · ${timestamp} · Margin: ${confidence}`,
];
