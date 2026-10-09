import { NextResponse } from "next/server";
import { assembleHomePage } from "../../../lib/report/homePageAssembler";
import { toScoringBasisPayload } from "../../../lib/report/scoringBasis";

export const runtime = "edge";
export const revalidate = 300;

export async function GET() {
  const homepage = await assembleHomePage({});
  const model = homepage.weeklyDecisionCardModel;
  const reportData = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;

  return NextResponse.json({
    tightness: model.diagnostics.currentScores.tightness,
    riskAppetite: model.diagnostics.currentScores.riskAppetite,
    regime: model.status.regimeKey ?? "EXPANSION",
    confidence: model.status.confidenceLabel,
    confidencePercent: model.status.confidencePercent,
    direction: model.decision.reportDynamics.directionLabel,
    tightnessDelta:
      model.decision.reportDynamics.changedSignals.find((s) => s.key === "tightness")?.delta ?? 0,
    riskAppetiteDelta:
      model.decision.reportDynamics.changedSignals.find((s) => s.key === "riskAppetite")?.delta ?? 0,
    distanceToFlip: model.diagnostics.regimeDistance.pointsToFlip,
    flipDimension: model.diagnostics.regimeDistance.dimensionLabel,
    fetchedAt: model.artifact.fetchedAtLabel,
    /* The reading's record date. This read `model.artifact.recordDateLabel`, which
       the card fills with the week-ending Friday, so the Oct 5, 2026 reading
       answered `recordDate: "Oct 9, 2026"`, four days after it was recorded. */
    recordDate: homepage.reportShell.recordDateLabel,
    /* Which inputs set these two scores (additive, 2026-10-09). */
    scoringBasis: toScoringBasisPayload(reportData.scoringBasis),
  });
}
