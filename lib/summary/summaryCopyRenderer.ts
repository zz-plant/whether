import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { buildComplianceStamp } from "../exportNotices";
import { formatExportConfidenceWord } from "../export/exportTerms";
import { formatSourceLine, type SummaryConfidence } from "./summaryFormatting";
import type { MonthlyStructured, SummaryProvenance, WeeklyStructured } from "./summaryTypes";

const toBullets = (items: string[]) => items.map((item) => `• ${item}`);

/*
 * The paste's confidence, and the stamp's: the published word ("Medium"), the one
 * the summary sentence above it states. Both used to print `provenance.statusLabel`,
 * the data tier ("Canonical snapshot (high confidence)"), so the Oct 5, 2026 paste
 * said Medium in its summary and high confidence under RECOMMENDATION CONFIDENCE.
 *
 * The weekly paste also listed `structured.governanceParameters` as raw codes
 * ("Rollback requirement: EXPLICIT_KILL_CRITERIA", "Approval velocity: BALANCED").
 * No reader-facing vocabulary defines those six settings, so the paste no longer
 * prints them; the structured payload still carries them for agents.
 */
export const renderWeeklySummaryCopy = ({
  title,
  summary,
  recordDateLabel,
  confidence,
  provenance,
  structured,
}: {
  title: string;
  summary: string;
  /** The reading's record date ("Oct 5, 2026"), never the week-ending Friday. */
  recordDateLabel?: string;
  confidence: SummaryConfidence;
  provenance: SummaryProvenance;
  structured: WeeklyStructured;
}) => {
  const updatedLabel = recordDateLabel ? `Updated ${recordDateLabel}` : "Updated —";
  const sourceLine = formatSourceLine(provenance);
  const confidenceWord = formatExportConfidenceWord(confidence);
  const complianceStamp = buildComplianceStamp({
    sourceLine,
    timestamp: provenance.timestampLabel,
    confidence: confidenceWord,
  });

  return [
    title,
    summary,
    "",
    "---",
    // Was "WHETHER · Capital Posture Governance": the engine's name for itself, in
    // the line a pasted brief is identified by. The category line is the site's
    // (`lib/seo.ts` `canonicalPositioningLine`), so the paste says what the site does.
    "WHETHER · Weekly operating guidance",
    "",
    updatedLabel,
    "",
    "---",
    "",
    "MARKET CLIMATE",
    "",
    structured.climate.label,
    "",
    ...structured.climate.summary,
    "",
    "",
    "Contextual, not moral: this is what the environment is rewarding right now.",
    "",
    "",
    "---",
    "",
    "RECOMMENDED MOVES FOR PRODUCT TEAMS (NOW)",
    "",
    ...toBullets(structured.recommendedMoves),
    "",
    "",
    "---",
    "",
    "EXECUTION PRIORITIES THAT TRAVEL WELL",
    "",
    ...toBullets(structured.executionPriorities),
    "",
    "",
    "---",
    "",
    "WATCHOUTS THAT BREAK EXECUTION",
    "",
    ...toBullets(structured.watchouts),
    "",
    "",
    "---",
    "",
    "PLANNING LANGUAGE TO USE",
    "",
    `> ${structured.planningLanguage}`,
    "",
    "",
    "",
    "---",
    "",
    "EXECUTION CONSTRAINTS",
    "",
    ...toBullets(structured.executionConstraints),
    "",
    "",
    "---",
    "",
    "MARGIN",
    "",
    `Margin: ${confidenceWord}`,
    "Uncertainty: this is an interpretive read, not a forecast. Check the assumptions against your own numbers before you act on it.",
    "",
    "",
    "---",
    "",
    "DATA PROVENANCE & QUALITY",
    "",
    `Source: ${sourceLine}`,
    `Timestamp: ${provenance.timestampLabel}`,
    `Data age: ${provenance.ageLabel}`,
    "",
    ...complianceStamp,
  ].join("\n");
};

export const renderMonthlySummaryCopy = ({
  title,
  summary,
  confidence,
  provenance,
  structured,
}: {
  title: string;
  summary: string;
  confidence: SummaryConfidence;
  provenance: SummaryProvenance;
  structured: MonthlyStructured;
}) => {
  const complianceStamp = buildComplianceStamp({
    sourceLine: structured.provenance.source,
    timestamp: provenance.timestampLabel,
    confidence: formatExportConfidenceWord(confidence),
  });

  return [
    title,
    summary,
    "",
    // "MONTHLY POSTURE" and "BOUNDED NEXT ACTIONS" until 2026-10-07: the section
    // holds the month's conditions word ("Freezing"), and "posture" and "bounded"
    // are engine words lib/report/AGENTS.md retired from reader copy. The
    // structured payload keeps its `posture` key for agents.
    "CONDITIONS THIS MONTH",
    "",
    structured.posture.label,
    "",
    ...toBullets(structured.posture.summary),
    "",
    "PLANNING LANGUAGE TO USE",
    "",
    `> ${structured.planningLanguage}`,
    "",
    "NEXT ACTIONS",
    "",
    ...toBullets(structured.boundedNextActions),
    "",
    "MONTHLY OPERATING RULES",
    "",
    ...toBullets(structured.operatingRules.flatMap((rule) => [
      `${DECISION_CONTRACT_LABELS.slot.action}: ${rule.action}`,
      `${DECISION_CONTRACT_LABELS.slot.threshold}: ${rule.threshold}`,
      `${DECISION_CONTRACT_LABELS.slot.reversal}: ${rule.reversal}`,
    ])),
    "",
    "RESUME LINES",
    "",
    ...toBullets(structured.reversalConditions),
    "",
    "EXECUTION CONSTRAINTS",
    "",
    ...toBullets(structured.executionConstraints),
    "",
    // A bare "Source:" heading sat above this line, so the paste read "Source:\nSource: …".
    `Source: ${structured.provenance.source}`,
    `Timestamp: ${structured.provenance.timestamp}`,
    `Data age: ${structured.provenance.dataAge}`,
    "",
    ...complianceStamp,
  ].join("\n");
};
