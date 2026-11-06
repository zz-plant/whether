import { buildCadenceAgentHandoff, buildCadenceRouteResponse } from "../../../lib/api/cadenceRoute";
import { buildMonthlySummary } from "../../../lib/summary/monthlySummary";

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
    buildExtraPayload: ({ reportData, summary }) => buildCadenceAgentHandoff(reportData, summary),
  });
}
