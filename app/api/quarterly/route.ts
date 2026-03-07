import { buildCadenceRouteResponse } from "../../../lib/api/cadenceRoute";
import { buildQuarterlySummary, getQuarterLabel } from "../../../lib/summary/quarterlySummary";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  return buildCadenceRouteResponse({
    route: "/api/quarterly",
    buildSummary: ({ assessment, treasuryProvenance, recordDateLabel, treasury }) => {
      const periodLabel = getQuarterLabel(treasury.record_date) ?? recordDateLabel;
      return buildQuarterlySummary({
        assessment,
        provenance: treasuryProvenance,
        recordDateLabel,
        periodLabel,
      });
    },
  });
}
