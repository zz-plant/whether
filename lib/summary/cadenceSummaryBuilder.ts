import { buildComplianceStamp } from "../exportNotices";
import { formatExportConfidenceWord } from "../export/exportTerms";
import type { RegimeAssessment } from "../regimeEngine";
import { getRegimePublicLabel } from "../regimePresentation";
import type { ConfidenceRecord } from "../report/confidence";
import { joinSentences } from "../report/reportFormatting";
import { formatSourceLine, resolveSummaryConfidence } from "./summaryFormatting";

export type CadenceSummaryProvenance = {
  sourceLabel: string;
  sourceUrl?: string;
  timestampLabel: string;
  ageLabel: string;
  statusLabel: string;
};

type CadenceSummaryName = "quarterly" | "yearly";

type CadenceSummaryParams = {
  cadence: CadenceSummaryName;
  guidanceMap: Record<RegimeAssessment["regime"], string>;
  assessment: RegimeAssessment;
  provenance: CadenceSummaryProvenance;
  recordDateLabel?: string;
  periodLabel?: string;
  /** The record the reading came from, so a stale fallback lowers the stamp's confidence. */
  record?: ConfidenceRecord | null;
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

const cadenceJobLine: Record<CadenceSummaryName, string> = {
  quarterly: "The job this quarter is to",
  yearly: "The job this year is to",
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
  record,
}: CadenceSummaryParams): CadenceSummaryBase => {
  const regimeLabel = getRegimePublicLabel(assessment.regime);
  const guidance = guidanceMap[assessment.regime];
  const summary = joinSentences(
    `${regimeLabel} mode`,
    assessment.description,
    `${cadenceJobLine[cadence]} ${guidance}`,
  );
  const title = periodLabel
    ? `${cadenceTitle[cadence]} — ${periodLabel}`
    : cadenceTitle[cadence];
  const sourceLine = formatSourceLine(provenance);
  // The published confidence word, as the weekly and monthly stamps print it. This
  // printed `provenance.statusLabel` ("Canonical snapshot (high confidence)"), the
  // data tier, which is not the confidence any page publishes.
  const complianceStamp = buildComplianceStamp({
    sourceLine,
    timestamp: provenance.timestampLabel,
    confidence: formatExportConfidenceWord(resolveSummaryConfidence(assessment, record)),
  });

  const copy = [
    title,
    summary,
    "",
    "Execution constraints:",
    ...assessment.constraints.map((item) => `• ${item}`),
    "",
    // A bare "Source:" heading sat above this line, so the paste read "Source:\nSource: …".
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
