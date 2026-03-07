import { buildComplianceStamp } from "../exportNotices";
import type { RegimeAssessment } from "../regimeEngine";
import { getRegimeOperatorLabel } from "../regimeLabels";
import { formatSourceLine } from "./summaryFormatting";

export type CadenceSummaryProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

export type CadenceSummaryName = "quarterly" | "yearly";

type CadenceSummaryParams = {
  cadence: CadenceSummaryName;
  guidanceMap: Record<RegimeAssessment["regime"], string>;
  assessment: RegimeAssessment;
  provenance: CadenceSummaryProvenance;
  recordDateLabel?: string;
  periodLabel?: string;
};

type CadenceSummaryBase = {
  title: string;
  summary: string;
  regime: RegimeAssessment["regime"];
  regimeLabel: string;
  guidance: string;
  constraints: string[];
  recordDateLabel: string | null;
  provenance: CadenceSummaryProvenance;
  inputs: RegimeAssessment["inputs"];
  copy: string;
};

const cadencePrefix: Record<CadenceSummaryName, string> = {
  quarterly: "This quarter",
  yearly: "This year",
};

const cadenceTitle: Record<CadenceSummaryName, string> = {
  quarterly: "Quarterly action summary",
  yearly: "Yearly action summary",
};

export const buildCadenceSummary = ({
  cadence,
  guidanceMap,
  assessment,
  provenance,
  recordDateLabel,
  periodLabel,
}: CadenceSummaryParams): CadenceSummaryBase => {
  const regimeLabel = getRegimeOperatorLabel(assessment.regime);
  const guidance = guidanceMap[assessment.regime];
  const summary = `${cadencePrefix[cadence]}, operate in ${regimeLabel} mode: ${guidance}. ${assessment.description}`;
  const title = periodLabel
    ? `${cadenceTitle[cadence]} — ${periodLabel}`
    : cadenceTitle[cadence];
  const sourceLine = formatSourceLine(provenance);
  const complianceStamp = buildComplianceStamp({
    sourceLine,
    timestamp: provenance.timestampLabel,
    confidence: provenance.statusLabel,
  });

  const copy = [
    title,
    summary,
    "",
    "Execution constraints:",
    ...assessment.constraints.map((item) => `• ${item}`),
    "",
    "Provenance:",
    `Source: ${sourceLine}`,
    `Timestamp: ${provenance.timestampLabel}`,
    `Data age: ${provenance.ageLabel}`,
    "",
    ...complianceStamp,
  ].join("\n");

  return {
    title,
    summary,
    regime: assessment.regime,
    regimeLabel,
    guidance,
    constraints: assessment.constraints,
    recordDateLabel: recordDateLabel ?? null,
    provenance,
    inputs: assessment.inputs,
    copy,
  };
};
