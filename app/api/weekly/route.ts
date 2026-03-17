import { buildAgentPayload, buildAgentPrompt } from "../../../lib/agentHandoff";
import { buildCadenceRouteResponse } from "../../../lib/api/cadenceRoute";
import { buildPostureState } from "../../../lib/report/postureStateSource";
import { buildSummaryHash } from "../../../lib/summary/summaryHash";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  return buildCadenceRouteResponse({
    route: "/api/weekly",
    buildSummary: ({ assessment, treasuryProvenance, weeklyRecordDateLabel }) =>
      buildWeeklySummary({
        assessment,
        provenance: treasuryProvenance,
        recordDateLabel: weeklyRecordDateLabel,
      }),
    buildExtraPayload: async ({ reportData, summary }) => {
      const { assessment, treasury, sensors, macroSeries, reportDynamics, actionNowShort, startItems, stopItems } = reportData;
      const postureState = await buildPostureState({
        recordDate: treasury.record_date,
        assessment,
        reportDynamics,
      });
      const agentPayload = buildAgentPayload(assessment, treasury, sensors, macroSeries, {
        decisionSupport: {
          reportDynamics,
          actionNowShort,
          startItems,
          stopItems,
          postureState,
        },
      });
      const agentPrompt = buildAgentPrompt(assessment, treasury);

      return {
        structured: summary.structured,
        agentHandoff: {
          payload: agentPayload,
          prompt: agentPrompt,
        },
        summaryHash: buildSummaryHash(summary),
      };
    },
  });
}
