import { buildAgentPayload, buildAgentPrompt } from "../../../lib/agentHandoff";
import { buildCadenceRouteResponse } from "../../../lib/api/cadenceRoute";
import { buildPostureState } from "../../../lib/report/postureStateSource";
import { buildMonthlySummary } from "../../../lib/summary/monthlySummary";
import { buildSummaryHash } from "../../../lib/summary/summaryHash";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  return buildCadenceRouteResponse({
    route: "/api/monthly",
    buildSummary: ({ assessment, treasury, treasuryProvenance, recordDateLabel }) =>
      buildMonthlySummary({
        assessment,
        provenance: treasuryProvenance,
        recordDateLabel,
        record: treasury,
      }),
    buildExtraPayload: async ({ reportData, summary }) => {
      const { assessment, treasury, sensors, macroSeries, reportDynamics, actionNowShort, startItems, stopItems } = reportData;
      const postureState = await buildPostureState({
        record: treasury,
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
