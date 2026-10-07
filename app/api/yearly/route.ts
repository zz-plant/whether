import { buildCadenceRouteResponse } from "../../../lib/api/cadenceRoute";
import { buildYearlySummary, getYearLabel } from "../../../lib/summary/yearlySummary";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  return buildCadenceRouteResponse({
    route: "/api/yearly",
    buildSummary: ({ assessment, treasuryProvenance, recordDateLabel, treasury }) => {
      const periodLabel = getYearLabel(treasury.record_date) ?? recordDateLabel;
      return buildYearlySummary({
        assessment,
        provenance: treasuryProvenance,
        recordDateLabel,
        periodLabel,
        record: treasury,
      });
    },
  });
}
