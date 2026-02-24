export const INTERNAL_USE_LABEL = "Internal use only";

export const INFORMATIONAL_NOTICE =
  "Informational output only; not investment, legal, tax, accounting, or employment advice.";

export const UNCERTAINTY_NOTICE =
  "Interpretive and probabilistic guidance; verify assumptions before acting.";

export const buildComplianceStamp = ({
  sourceLine,
  timestamp,
  confidence,
}: {
  sourceLine: string;
  timestamp: string;
  confidence: string;
}) => [
  "Compliance stamp:",
  `- ${INTERNAL_USE_LABEL}`,
  `- ${INFORMATIONAL_NOTICE}`,
  `- Source: ${sourceLine}`,
  `- Timestamp: ${timestamp}`,
  `- Confidence: ${confidence}`,
  `- Uncertainty: ${UNCERTAINTY_NOTICE}`,
];
