import { buildComplianceStamp } from "../exportNotices";
import type { RegimeAssessment } from "../regimeEngine";
import { getRegimePublicLabel } from "../regimePresentation";
import { joinSentences } from "../report/reportFormatting";
import { formatSourceLine } from "./summaryFormatting";

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

/**
 * The sentence a quarterly or yearly summary leads with: the conditions, what
 * they mean, and the period's job. The archive index rebuilds it for a period
 * whose readings mostly sat in other conditions than its closing reading did
 * (`scripts/generatePostureArchiveIndex.ts`), so both say it the same way.
 */
export const buildCadenceSummarySentence = (
  cadence: CadenceSummaryName,
  regime: RegimeAssessment["regime"],
  description: string,
  guidance: string,
) => joinSentences(`${getRegimePublicLabel(regime)} mode`, description, `${cadenceJobLine[cadence]} ${guidance}`);

export const buildCadenceSummary = ({
  cadence,
  guidanceMap,
  assessment,
  provenance,
  recordDateLabel,
  periodLabel,
}: CadenceSummaryParams): CadenceSummaryBase => {
  const regimeLabel = getRegimePublicLabel(assessment.regime);
  const guidance = guidanceMap[assessment.regime];
  const summary = buildCadenceSummarySentence(cadence, assessment.regime, assessment.description, guidance);
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
    "Source:",
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
