import { MARGIN_LABEL } from "./report/reportFormatting";

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
  /* "Room before a change", where this said "Confidence" until 2026-10-09 and "Margin"
     until 2026-10-28: the number is a distance from the change line. */
  `Source: ${sourceLine} · ${timestamp} · ${MARGIN_LABEL}: ${confidence}${basis ? ` · ${basis.replace(/\.$/, "")}` : ""}`,
];
