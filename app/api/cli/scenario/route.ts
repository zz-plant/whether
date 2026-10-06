import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_THRESHOLDS, evaluateRegime } from "../../../../lib/regimeEngine";
import { buildScenarioContract } from "../../../../lib/cli/contracts";
import { applyScenarioOverridesToTreasury } from "../../../../lib/cli/scenarioInputs";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { getRegimeDisplayLabel } from "../../../../lib/regimePresentation";
import { resolvePublishedConfidence } from "../../../../lib/report/confidence";
import { CLI_QUERIES, parseCliQuery } from "../../../../lib/cli/queryContracts";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // The scores are read as the agent tools read them (`numberInput`): finite, zero included.
  const query = parseCliQuery(request, CLI_QUERIES.scenario);
  if (query instanceof NextResponse) return query;

  const tightness = query.tightness ?? null;
  const riskAppetite = query["risk-appetite"] ?? null;

  const reportResult = await loadReportDataSafe(undefined, { route: "/api/cli/scenario" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  const beforeLabel = getRegimeDisplayLabel({
    regime: reportData.assessment.regime,
    confidence: resolvePublishedConfidence({ assessment: reportData.assessment, record: reportData.treasury }).label,
    momentum: reportData.reportDynamics.directionLabel,
    transitionWatch: reportData.assessment.diagnostics.transitionWatch,
  }).label;

  const scenarioTreasury = applyScenarioOverridesToTreasury({
    treasury: reportData.treasury,
    tightness,
    riskAppetite,
  });

  const scenarioAssessment = evaluateRegime(scenarioTreasury, DEFAULT_THRESHOLDS);

  const afterLabel = getRegimeDisplayLabel({
    regime: scenarioAssessment.regime,
    confidence: resolvePublishedConfidence({ assessment: scenarioAssessment, record: scenarioTreasury }).label,
    momentum: reportData.reportDynamics.directionLabel,
    transitionWatch: scenarioAssessment.diagnostics.transitionWatch,
  }).label;

  return NextResponse.json(
    buildScenarioContract({
      postureBefore: beforeLabel,
      postureAfter: afterLabel,
      inputs: {
        tightness,
        riskAppetite,
      },
    })
  );
}
