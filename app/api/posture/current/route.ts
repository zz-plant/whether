import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { buildHomeBriefModel } from "../../../../lib/report/homeBriefModel";
import { siteUrl } from "../../../../lib/siteUrl";
import type { PostureApiResponse } from "../../../../lib/types";
import { POSTURE_API_VERSION } from "../../../../lib/types";
import { describeConditions, describeWeeklyDirection } from "../../../../lib/export/exportTerms";
import { formatSignalReading } from "../../../../lib/report/signalTranslations";
import { comparisonBasis } from "../../../../lib/report/comparisonBasis";

export const runtime = "edge";

export { type PostureApiResponse, POSTURE_API_VERSION };

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/posture/current" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  const homeBriefModel = buildHomeBriefModel({
    assessment: reportData.assessment,
    fetchedAtLabel: reportData.fetchedAtLabel,
    historicalSelection: reportData.historicalSelection,
    historicalAnalogs: reportData.historicalAnalogs,
    lastYearComparison: reportData.lastYearComparison,
    recordDateLabel: reportData.recordDateLabel,
    regimeAlert: reportData.regimeAlert,
    reportDynamics: reportData.reportDynamics,
    regimeSeries: reportData.regimeSeries,
    statusLabel: reportData.statusLabel,
    stopItems: reportData.stopItems,
    treasury: reportData.treasury,
    treasuryProvenance: reportData.treasuryProvenance,
    actionNowShort: reportData.actionNowShort,
    guardrailThreshold: reportData.guardrailThreshold,
    flipThreshold: reportData.flipThreshold,
    reportEvidenceItems: reportData.reportEvidenceItems,
  });

  const regime = reportData.assessment.regime;
  const tightness = reportData.assessment.scores.tightness / 100;
  const direction = reportData.reportDynamics.directionLabel;
  const confidence = homeBriefModel.confidencePercent / 100;
  const week = reportData.treasury.record_date;

  /*
   * `summary` is the one field an integrator shows a person, so it is written
   * in the page's words: the weather label with its meaning, the week's
   * direction, and the funding score with its scale. It used to read
   * "Expansion posture, stable, tightness 12/100" — the engine key, the word
   * the site retired, and the internal score name. The machine fields beside
   * it keep their names; renaming them would break the published contract.
   */
  const summary = [
    `Conditions: ${describeConditions(regime)}.`,
    `${comparisonBasis(reportData.reportDynamics.comparedWith).versus}: ${describeWeeklyDirection(direction)}.`,
    `${formatSignalReading("tightness", reportData.assessment.scores.tightness)}.`,
  ].join(" ");

  const body: PostureApiResponse = {
    regime,
    tightness: Math.round(tightness * 100) / 100,
    direction,
    confidence: Math.round(confidence * 100) / 100,
    week,
    summary,
    url: siteUrl,
    version: POSTURE_API_VERSION,
  };

  /* CORS wildcard is intentional — /api/posture/current is a public API
     for programmatic consumption. No auth or cookies involved. */
  return NextResponse.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
