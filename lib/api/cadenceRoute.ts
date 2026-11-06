import { buildAgentPayload, buildAgentPrompt } from "../agentHandoff";
import { buildPostureState } from "../report/postureStateSource";
import type { ReportData, ReportDataFallback } from "../report/reportData";
import { resolveWeekGuidance } from "../report/weeklyBriefSnapshot";
import { buildSummaryHash } from "../summary/summaryHash";
import { loadReportRouteContext } from "./reportRoute";
import { buildVersionedApiEnvelope, jsonResponse } from "./edgeResponse";

type CadenceRouteData = ReportData | ReportDataFallback;

type CadenceSummary = {
  copy: string;
  provenance: unknown;
  recordDateLabel: string | null;
};

/** The weekly and monthly routes hand an agent the same reading and the same decision support. */
export const buildCadenceAgentHandoff = async (
  reportData: CadenceRouteData,
  summary: Parameters<typeof buildSummaryHash>[0] & { structured: unknown },
) => {
  const { assessment, treasury, sensors, macroSeries, reportDynamics, startItems, stopItems } = reportData;
  const postureState = await buildPostureState({ record: treasury, assessment, reportDynamics });

  return {
    structured: summary.structured,
    agentHandoff: {
      payload: buildAgentPayload(assessment, treasury, sensors, macroSeries, {
        decisionSupport: {
          reportDynamics,
          guidance: resolveWeekGuidance(reportData, postureState),
          startItems,
          stopItems,
          postureState,
        },
      }),
      prompt: buildAgentPrompt(assessment, treasury),
    },
    summaryHash: buildSummaryHash(summary),
  };
};

export const buildCadenceRouteResponse = async <TSummary extends CadenceSummary>({
  route,
  buildSummary,
  buildExtraPayload,
}: {
  route: string;
  buildSummary: (reportData: CadenceRouteData) => TSummary;
  buildExtraPayload?: (
    input: { reportData: CadenceRouteData; summary: TSummary }
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
}) => {
  const { reportData, degraded } = await loadReportRouteContext({ route });
  const summary = buildSummary(reportData);
  const extraPayload = buildExtraPayload ? await buildExtraPayload({ reportData, summary }) : {};

  return jsonResponse(
    buildVersionedApiEnvelope({
      summary,
      copy: summary.copy,
      provenance: summary.provenance,
      recordDateLabel: summary.recordDateLabel,
      degraded,
      generatedAt: new Date().toISOString(),
      version: "v1",
      ...extraPayload,
    }),
  );
};
