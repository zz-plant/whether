import { buildAgentPayload, buildAgentPrompt } from "./agentHandoff";
import { loadReportData } from "./report/reportData";
import { buildSummaryHash } from "./summary/summaryHash";
import { buildMonthlySummary } from "./summary/monthlySummary";
import { buildQuarterlySummary, getQuarterLabel } from "./summary/quarterlySummary";
import { buildWeeklySummary } from "./summary/weeklySummary";
import { buildYearlySummary, getYearLabel } from "./summary/yearlySummary";

export const supportedAgentCadences = ["weekly", "monthly", "quarterly", "yearly"] as const;

export type AgentCadence = (typeof supportedAgentCadences)[number];

export const isAgentCadence = (value: string): value is AgentCadence =>
  (supportedAgentCadences as readonly string[]).includes(value);

export const buildAgentInterfaceResponse = async (cadence: AgentCadence) => {
  const { assessment, macroSeries, sensors, treasury, treasuryProvenance, recordDateLabel } =
    await loadReportData();

  const summary =
    cadence === "weekly"
      ? buildWeeklySummary({
          assessment,
          provenance: treasuryProvenance,
          recordDateLabel,
        })
      : cadence === "monthly"
        ? buildMonthlySummary({
            assessment,
            provenance: treasuryProvenance,
            recordDateLabel,
          })
        : cadence === "quarterly"
          ? buildQuarterlySummary({
              assessment,
              provenance: treasuryProvenance,
              recordDateLabel,
              periodLabel: getQuarterLabel(treasury.record_date) ?? recordDateLabel,
            })
          : buildYearlySummary({
              assessment,
              provenance: treasuryProvenance,
              recordDateLabel,
              periodLabel: getYearLabel(treasury.record_date) ?? recordDateLabel,
            });

  const agentPayload = buildAgentPayload(assessment, treasury, sensors, macroSeries);
  const agentPrompt = buildAgentPrompt(assessment, treasury);

  return {
    cadence,
    summary,
    copy: summary.copy,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
    agentHandoff: {
      payload: agentPayload,
      prompt: agentPrompt,
    },
    summaryHash: cadence === "weekly" || cadence === "monthly" ? buildSummaryHash(summary) : null,
    generatedAt: new Date().toISOString(),
    version: "v1",
  };
};
