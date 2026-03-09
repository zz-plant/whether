import { buildComplianceStamp } from "../exportNotices";
import { formatSourceLine } from "./summaryFormatting";
import type { MonthlyStructured, SummaryProvenance, WeeklyStructured } from "./summaryTypes";
import { getRoleScopedTemplate, stakeholderRoleLabel, type StakeholderRole } from "../playbook";
import type { RegimeKey } from "../regimeEngine";

const toBullets = (items: string[]) => items.map((item) => `• ${item}`);

const renderGovernanceLines = (governance: WeeklyStructured["governanceParameters"]) => {
  if (!governance) {
    return [] as string[];
  }

  return [
    "",
    "---",
    "",
    "GOVERNANCE PARAMETER ADJUSTMENTS",
    "",
    `• Hiring threshold: ${governance.hiringThreshold}`,
    `• Payback window tolerance: ${governance.paybackWindowTolerance}`,
    `• Rollback requirement: ${governance.rollbackRequirement}`,
    `• Approval velocity: ${governance.approvalVelocity}`,
    `• Expansion scope: ${governance.expansionScope}`,
    `• Experimentation tolerance: ${governance.experimentationTolerance}`,
    "",
  ];
};



const renderRoleTemplateLines = ({
  regime,
  role,
}: {
  regime: RegimeKey;
  role: StakeholderRole;
}) => {
  const template = getRoleScopedTemplate(regime, role);

  return [
    "---",
    "",
    `ROLE TEMPLATE (${stakeholderRoleLabel[role].toUpperCase()})`,
    "",
    `• Do now: ${template.doNow}`,
    `• Avoid now: ${template.avoidNow}`,
    `• Reversal trigger: ${template.reversalTrigger}`,
    "",
  ];
};
export const renderWeeklySummaryCopy = ({
  title,
  summary,
  recordDateLabel,
  provenance,
  structured,
  regime,
  role,
}: {
  title: string;
  summary: string;
  recordDateLabel?: string;
  provenance: SummaryProvenance;
  structured: WeeklyStructured;
  regime: RegimeKey;
  role?: StakeholderRole;
}) => {
  const updatedLabel = recordDateLabel ? `Updated ${recordDateLabel}` : "Updated —";
  const resolvedRole = role ?? "founder-ceo";
  const sourceLine = formatSourceLine(provenance);
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
    "WHETHER · Capital Posture Governance",
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
    ...renderGovernanceLines(structured.governanceParameters),
    ...renderRoleTemplateLines({ regime, role: resolvedRole }),
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
  regime,
  role,
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
