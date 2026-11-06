import { buildCadenceAgentHandoff, buildCadenceRouteResponse } from "../../../lib/api/cadenceRoute";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  return buildCadenceRouteResponse({
    route: "/api/weekly",
    // The record date, not `weeklyRecordDateLabel` (the week-ending Friday): the
    // summary prints it as "Updated …" and returns it as `recordDateLabel`, which
    // on Monday Oct 5, 2026 read "Oct 9, 2026", a date still in the future.
    buildSummary: ({ assessment, treasury, treasuryProvenance, recordDateLabel }) =>
      buildWeeklySummary({
        assessment,
        provenance: treasuryProvenance,
        recordDateLabel,
        record: treasury,
      }),
    buildExtraPayload: ({ reportData, summary }) => buildCadenceAgentHandoff(reportData, summary),
  });
}
