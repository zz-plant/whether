/**
 * Embed API — returns the weekly brief as an HTML snippet for newsletter writers.
 * Newsletter build steps call this endpoint at send time and insert the response.
 *
 * GET /api/embed?ticker=GOOGL&stage=growth&format=html
 * GET /api/embed?format=text
 */

import { NextResponse } from "next/server";
import { assembleHomePage } from "../../../lib/report/homePageAssembler";
import {
  buildWeeklyOperatorBriefCopyText,
} from "../../../lib/report/home/artifactPayload";
import { buildWeeklyTrustCueLine } from "../../../lib/report/trustStatus";

export const runtime = "edge";
export const revalidate = 900;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tickerParam = url.searchParams.get("ticker")?.trim().toUpperCase() || "";
  const stageParam = url.searchParams.get("stage")?.trim() || "";
  const format = url.searchParams.get("format") || "html";
  const ref = url.searchParams.get("ref") || "embed";

  // Build operator context from ticker/stage params
  const operatorContext = {
    companyStage: (["pre-seed", "seed", "series-a", "series-b-plus", "public"].includes(stageParam)
      ? stageParam
      : null) as "seed" | "series-a" | "public" | "growth" | null,
    rateSensitivity: null as string | null,
    ticker: tickerParam || null,
  };

  try {
    const homepage = await assembleHomePage({
      searchParams: tickerParam ? { ticker: tickerParam } : undefined,
      operatorContext: operatorContext as any,
    });

    const reportData = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
    const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "Standard";
    const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
    const actionItems = homepage.weeklyDecisionCardModel.decision.actionStripItems ?? [];
    const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];
    const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
    const operatingStanceLine = homepage.weeklyDecisionCardModel.decision.operatingStanceLine;
    const operatingCall = canonicalDecision?.operatingCall ?? operatingStanceLine;
    const actionNow = homepage.weeklyDecisionCardModel.decision.actionNowShort || homepage.weeklyDecisionCardModel.decision.immediateDecision;
    const doNowItems = actionItems.map((item) => item.areaActionNow);
    const flipTrigger = flipConditionLabels[0] || "Monitor economic indicators";
    const reversalCondition = "Two consecutive weeks of confirming signals";
    const dataFreshness = homepage.reportShell.fetchedAtLabel;

    const headerOperatorBriefCopy = buildWeeklyOperatorBriefCopyText({
      assessment: reportData.assessment,
      treasury: reportData.treasury,
      date: reportData.weeklyRecordDate,
      postureWithStageLabel: postureLabel,
      confidenceLabel,
      actionStripItems: actionItems,
      flipConditionLabels,
      canonicalDecisionCopy: canonicalDecision,
      weeklyCall: homepage.weeklyCall,
      weeklyLeadershipSummary: homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary,
    });

    const trustCue = buildWeeklyTrustCueLine({
      confidenceLabel,
      freshnessLabel: homepage.reportShell.fetchedAtLabel,
      transitionWatch: "OFF",
    });

    // Build brief data object
    const briefData = {
      operatingCall,
      actionNow,
      doNowItems,
      flipTrigger,
      reversalCondition,
      dataFreshness,
      postureLabel,
      confidenceLabel,
      regimeLabel: homepage.reportShell.statusLabel,
      recordDate: reportData.weeklyRecordDate,
      tickerLabel: tickerParam || null,
      stageLabel: stageParam || null,
      sourceLabel: homepage.reportShell.treasurySource,
      briefUrl: `https://whether.app/${tickerParam ? `?ticker=${tickerParam}` : ""}${ref ? `&ref=${ref}` : ""}`,
      attributionUrl: `https://whether.app/?ref=${ref}`,
    };

    if (format === "json") {
      return NextResponse.json({
        ...briefData,
        attribution: {
          text: "Macro brief by Whether",
          url: briefData.attributionUrl,
        },
      });
    }

    if (format === "text") {
      const text = [
        `Whether — Weekly brief${tickerParam ? ` for ${tickerParam}` : ""}`,
        `Regime: ${briefData.regimeLabel} • Confidence: ${confidenceLabel} • ${briefData.recordDate}`,
        ``,
        `Operating call: ${operatingCall}`,
        `Decision now: ${actionNow}`,
        ...(doNowItems.length > 0 ? [`Do now: ${doNowItems.join(", ")}`] : []),
        ...(flipTrigger ? [`Watch: ${flipTrigger}`] : []),
        ``,
        `Get your own weekly brief: ${briefData.attributionUrl}`,
      ].join("\n");

      return new NextResponse(text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Whether-Embed-Version": "1",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }

    // Default: HTML
    const html = buildBriefEmbedHtml(briefData);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Whether-Embed-Version": "1",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });

  } catch (error) {
    console.error("Embed API error:", error);
    const fallbackText = "Macro brief currently unavailable. Check back Monday.";
    if (format === "json") {
      return NextResponse.json({ error: fallbackText }, { status: 503 });
    }
    return new NextResponse(fallbackText, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

type BriefEmbedData = {
  operatingCall: string;
  actionNow: string;
  doNowItems: string[];
  flipTrigger: string;
  reversalCondition: string;
  dataFreshness: string;
  postureLabel: string;
  confidenceLabel: string;
  regimeLabel: string;
  recordDate: string;
  tickerLabel: string | null;
  stageLabel: string | null;
  sourceLabel: string;
  briefUrl: string;
  attributionUrl: string;
};

const buildBriefEmbedHtml = (data: BriefEmbedData): string => {
  const { operatingCall, actionNow, doNowItems, flipTrigger, postureLabel, confidenceLabel, recordDate, tickerLabel, attributionUrl } = data;
  const metaParts = [postureLabel, confidenceLabel, `As of ${recordDate}`, tickerLabel].filter(Boolean);

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0;padding:16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;color:#1e293b;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Whether — Weekly Brief</span>
    <span style="font-size:10px;color:#94a3b8;">${metaParts.join(" · ")}</span>
  </div>
  <div style="background:#f0f9ff;border-left:3px solid #38bdf8;padding:12px 14px;border-radius:6px;margin:8px 0;">
    <p style="font-size:13px;font-weight:600;color:#0284c7;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.06em;">Operating call</p>
    <p style="font-size:16px;font-weight:600;color:#0f172a;margin:0;line-height:1.4;">${operatingCall}</p>
  </div>
  <p style="font-size:14px;color:#1e293b;margin:12px 0;"><strong>Decision now:</strong> ${actionNow}</p>
  ${doNowItems.length > 0 ? `<div style="margin:8px 0;"><p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin:0 0 4px 0;">Do now</p>${doNowItems.map((item) => `<p style="font-size:13px;color:#475569;margin:2px 0;padding:4px 0;border-bottom:1px solid #f1f5f9;">${item}</p>`).join("")}</div>` : ""}
  ${flipTrigger ? `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:6px;margin:12px 0;font-size:12px;color:#78350f;"><strong style="color:#92400e;">Watch:</strong> ${flipTrigger}</div>` : ""}
  <div style="margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;">
    <span>Macro brief by <a href="${attributionUrl}" style="color:#0284c7;text-decoration:underline;font-weight:600;">Whether</a></span>
    <a href="${data.briefUrl}" style="color:#0284c7;text-decoration:underline;">Get your own →</a>
  </div>
</div>`;
};