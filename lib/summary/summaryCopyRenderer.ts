import { buildComplianceStamp } from "../exportNotices";
import type { MonthlyStructured, SummaryProvenance, WeeklyStructured } from "./summaryTypes";

const toBullets = (items: string[]) => items.map((item) => `• ${item}`);

export const renderWeeklySummaryCopy = ({
  title,
  summary,
  recordDateLabel,
  provenance,
  structured,
}: {
  title: string;
  summary: string;
  recordDateLabel?: string;
  provenance: SummaryProvenance;
  structured: WeeklyStructured;
}) => {
  const updatedLabel = recordDateLabel ? `Updated ${recordDateLabel}` : "Updated —";
  const sourceLine = provenance.sourceUrl
    ? `${provenance.sourceLabel} (${provenance.sourceUrl})`
    : provenance.sourceLabel;
  const complianceStamp = buildComplianceStamp({
    sourceLine,
    timestamp: provenance.timestampLabel,
    confidence: provenance.statusLabel,
  });

  return [
    title,
    summary,
    "",
    "---",
    "WHETHER · Market Climate Station",
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
    "",
    "---",
    "",
    "RECOMMENDATION CONFIDENCE",
    "",
    `Confidence: ${provenance.statusLabel}`,
    "Uncertainty: Interpretive and probabilistic guidance; verify assumptions before acting.",
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
    "",
    "---",
    "",
    "Actions:",
    "Copy for roadmap review Check a decision Why this verdict",
  ].join("\n");
};

export const renderMonthlySummaryCopy = ({
  title,
  summary,
  provenance,
  structured,
}: {
  title: string;
  summary: string;
  provenance: SummaryProvenance;
  structured: MonthlyStructured;
}) => {
  const complianceStamp = buildComplianceStamp({
    sourceLine: structured.provenance.source,
    timestamp: provenance.timestampLabel,
    confidence: provenance.statusLabel,
  });

  return [
    title,
    summary,
    "",
    "Execution constraints:",
    ...toBullets(structured.executionConstraints),
    "",
    "Provenance:",
    `Source: ${structured.provenance.source}`,
    `Timestamp: ${structured.provenance.timestamp}`,
    `Data age: ${structured.provenance.dataAge}`,
    "",
    ...complianceStamp,
  ].join("\n");
};
