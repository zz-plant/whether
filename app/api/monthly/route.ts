import { buildAgentPayload, buildAgentPrompt } from "../../../lib/agentHandoff";
import { buildCadenceRouteResponse } from "../../../lib/api/cadenceRoute";
import { buildMonthlySummary } from "../../../lib/summary/monthlySummary";
import { buildSummaryHash } from "../../../lib/summary/summaryHash";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  return buildCadenceRouteResponse({
    route: "/api/monthly",
    buildSummary: ({ assessment, treasuryProvenance, recordDateLabel }) =>
      buildMonthlySummary({
        assessment,
        provenance: treasuryProvenance,
        recordDateLabel,
      }),
    buildExtraPayload: ({ reportData, summary }) => {
      const { assessment, treasury, sensors, macroSeries } = reportData;
      const agentPayload = buildAgentPayload(assessment, treasury, sensors, macroSeries);
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
