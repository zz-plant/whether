import { NextResponse } from "next/server";
import { DEFAULT_THRESHOLDS, evaluateRegime } from "../../../../lib/regimeEngine";
import { buildScenarioContract } from "../../../../lib/cli/contracts";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { getRegimeDisplayLabel } from "../../../../lib/regimePresentation";

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tightness = parseNumber(url.searchParams.get("tightness"));
  const riskAppetite = parseNumber(url.searchParams.get("risk-appetite"));

  if (url.searchParams.has("tightness") && tightness === null) {
    return NextResponse.json({ error: "Invalid tightness input." }, { status: 400 });
  }
  if (url.searchParams.has("risk-appetite") && riskAppetite === null) {
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

  const scenarioAssessment = evaluateRegime(
    {
      ...reportData.treasury,
      tightness: tightness ?? reportData.treasury.tightness,
      risk_appetite: riskAppetite ?? reportData.treasury.risk_appetite,
    },
DEFAULT_THRESHOLDS,
  );

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
