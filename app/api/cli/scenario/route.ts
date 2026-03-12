import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_THRESHOLDS, evaluateRegime } from "../../../../lib/regimeEngine";
import { buildScenarioContract } from "../../../../lib/cli/contracts";
import { applyScenarioOverridesToTreasury } from "../../../../lib/cli/scenarioInputs";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { getRegimeDisplayLabel } from "../../../../lib/regimePresentation";
import { CLI_QUERY_ALLOWLIST_BY_ENDPOINT, rejectUnsupportedCliQuery } from "../../../../lib/cli/queryContracts";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const parseNumber = (value: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};


export async function GET(request: NextRequest) {
  const invalidQuery = rejectUnsupportedCliQuery(request, CLI_QUERY_ALLOWLIST_BY_ENDPOINT.scenario);
  if (invalidQuery) return invalidQuery;

  const tightness = parseNumber(request.nextUrl.searchParams.get("tightness"));
  const riskAppetite = parseNumber(request.nextUrl.searchParams.get("risk-appetite"));

  if (request.nextUrl.searchParams.has("tightness") && tightness === null) {
    return NextResponse.json({ error: "Invalid tightness input." }, { status: 400 });
  }
  if (request.nextUrl.searchParams.has("risk-appetite") && riskAppetite === null) {
    return NextResponse.json({ error: "Invalid risk-appetite input." }, { status: 400 });
  }

  const reportResult = await loadReportDataSafe(undefined, { route: "/api/cli/scenario" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  const beforeLabel = getRegimeDisplayLabel({
    regime: reportData.assessment.regime,
    confidence: reportData.assessment.diagnostics.confidence,
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
    confidence: scenarioAssessment.diagnostics.confidence,
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
