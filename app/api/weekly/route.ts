import { buildAgentPayload, buildAgentPrompt } from "../../../lib/agentHandoff";
import { buildCadenceRouteResponse } from "../../../lib/api/cadenceRoute";
import { buildPostureState } from "../../../lib/report/postureStateSource";
import { buildSummaryHash } from "../../../lib/summary/summaryHash";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";
import { resolveWeekGuidance } from "../../../lib/report/weeklyBriefSnapshot";

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
    buildExtraPayload: async ({ reportData, summary }) => {
      const { assessment, treasury, sensors, macroSeries, reportDynamics, startItems, stopItems } = reportData;
      const postureState = await buildPostureState({
        record: treasury,
        assessment,
        reportDynamics,
      });
      const agentPayload = buildAgentPayload(assessment, treasury, sensors, macroSeries, {
        decisionSupport: {
          reportDynamics,
          guidance: resolveWeekGuidance(reportData, postureState),
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
