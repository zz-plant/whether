export const buildComplianceStamp = ({
  sourceLine,
  timestamp,
  confidence,
  basis,
}: {
  sourceLine: string;
  timestamp: string;
  confidence: string;
  /** Which inputs set the scores, as a sentence ("Scored on the record's inputs."), printed after the margin. */
  basis?: string;
}) => [
  /* "Margin", where this said "Confidence": the number is a distance from the change line (2026-10-09). */
  `Source: ${sourceLine} · ${timestamp} · Margin: ${confidence}${basis ? ` · ${basis.replace(/\.$/, "")}` : ""}`,
];
