/**
 * Embed API — returns the weekly brief as an HTML snippet for newsletter writers.
 * Newsletter build steps call this endpoint at send time and insert the response.
 *
 * GET /api/embed?ticker=GOOGL&stage=series-b&format=html
 * GET /api/embed?format=text
 */

import { NextResponse } from "next/server";
import { assembleHomePage } from "../../../lib/report/homePageAssembler";
import type { OperatorContext } from "../../../lib/report/operatorContext";
import { operatorStageLabel, parseOperatorStageParam } from "../../../lib/report/operatorStage";
import { parseOperatorRunwayParam } from "../../../lib/report/operatorRunway";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { siteUrl } from "../../../lib/siteUrl";
import { USE_CONSTRAINT_SUMMARY, buildUseConstraint } from "../../../lib/report/useConstraint";

export const runtime = "edge";
export const revalidate = 900;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tickerParam = url.searchParams.get("ticker")?.trim().toUpperCase() || "";
  const format = url.searchParams.get("format") || "html";
  const ref = url.searchParams.get("ref") || "embed";

  // One parse, used for both the calibration and the label. Splitting them is
  // what let `stage=growth` — a value the picker offered and `isOperatorStage`
  // rejects — produce a stage-agnostic brief wearing a "growth" badge.
  const companyStage = parseOperatorStageParam(url.searchParams.get("stage"));

  const operatorContext: OperatorContext = {
    companyStage,
    companyRunway: parseOperatorRunwayParam(url.searchParams.get("runway")),
    ticker: tickerParam || null,
  };

  try {
    const homepage = await assembleHomePage({
      searchParams: tickerParam ? { ticker: tickerParam } : undefined,
      operatorContext,
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
    /*
     * Both of these are read off the same action strip `doNowItems` comes from.
     *
     * `reversalCondition` used to be the literal "Two consecutive weeks of
     * confirming signals" — the same sentence every week, for every regime, in a
     * field nothing renders and only `format=json` returns. So the one consumer
     * it had was an integrator reading it as a fact about this week's call. The
     * value was already in scope: `reversalCondition` and `triggerThreshold` are
     * non-optional siblings of the `areaActionNow` on the line above, and every
     * other surface in this repo reads them.
     *
     * `flipTrigger` fell back to "Monitor economic indicators", which is advice
     * no reading produced. An empty list means the call has no flip condition to
     * publish; the field is omitted rather than filled.
     */
    const primaryAction = actionItems[0];
    const flipTrigger = flipConditionLabels[0] ?? primaryAction?.triggerThreshold ?? null;
    const reversalCondition = primaryAction?.reversalCondition ?? null;
    const dataFreshness = homepage.reportShell.fetchedAtLabel;

    const briefUrl = buildWhetherBriefUrl({ ticker: tickerParam, ref });
    const attributionUrl = buildWhetherBriefUrl({ ref });

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
      stageLabel: companyStage ? operatorStageLabel(companyStage) : null,
      sourceLabel: homepage.reportShell.treasurySource,
      briefUrl,
      attributionUrl,
    };

    if (format === "json") {
      return NextResponse.json({
        ...briefData,
        /* Attribution was already here. What was missing is the constraint:
           the embed is the one surface that renders inside somebody else's
           page, where their framing replaces ours — which is exactly the
           reading the Acceptable Use Policy forbids (§3.4). */
        use: buildUseConstraint(),
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
        ...(doNowItems.length > 0 ? [`${DECISION_CONTRACT_LABELS.action.doNow}: ${doNowItems.join(", ")}`] : []),
        ...(flipTrigger ? [`Watch: ${flipTrigger}`] : []),
        ``,
        `Get your own weekly brief: ${briefData.attributionUrl}`,
        USE_CONSTRAINT_SUMMARY,
      ].join("\n");

      return new NextResponse(text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Whether-Embed-Version": "1",
          "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=1800",
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
  /** Null when the call published no flip condition. Never filler. */
  flipTrigger: string | null;
  /** Null when the call published no reversal condition. Never filler. */
  reversalCondition: string | null;
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

/*
 * The origin comes from `resolveSiteUrl`, not a literal.
 *
 * Every embed carries these two links into somebody else's page, so a hardcoded
 * origin means the preview lane's embeds advertise production — the one surface
 * you would use preview to check is the one preview cannot check. This is the
 * rule `tests/feedRoute.test.ts` already guards for the feed, where the literal
 * and the configured default are the same string and only a source read tells
 * them apart; `app/api-docs/page.tsx` already builds the same snippet correctly.
 */
export const buildWhetherBriefUrl = ({ ticker, ref }: { ticker?: string | null; ref?: string | null }): string => {
  const url = new URL(`${siteUrl}/`);
  const normalizedTicker = ticker?.trim();
  const normalizedRef = ref?.trim();

  if (normalizedTicker) {
    url.searchParams.set("ticker", normalizedTicker);
  }

  if (normalizedRef) {
    url.searchParams.set("ref", normalizedRef);
  }

  return url.toString();
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeAttribute = escapeHtml;

export const buildBriefEmbedHtml = (data: BriefEmbedData): string => {
  const { operatingCall, actionNow, doNowItems, flipTrigger, postureLabel, confidenceLabel, recordDate, tickerLabel, stageLabel, attributionUrl } = data;
  // `stageLabel` is only ever a stage the brief was actually calibrated for —
  // the route derives it from the parsed stage, not the raw parameter — so the
  // meta line can carry it without claiming a calibration that did not happen.
  const metaParts = [postureLabel, confidenceLabel, `As of ${recordDate}`, tickerLabel, stageLabel].filter(Boolean);
  const doNowHtml = doNowItems
    .map((item) => `<p style="font-size:13px;color:rgba(255,255,255,0.6);margin:2px 0;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">${escapeHtml(item)}</p>`)
    .join("");

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0;padding:16px;background:#0d0f12;border:1px solid rgba(255,255,255,0.06);border-radius:12px;color:rgba(255,255,255,0.9);">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
    <span style="font-size:11px;font-weight:600;letter-spacing:0.04em;color:rgba(255,255,255,0.5);">Whether — Weekly Brief</span>
    <span style="font-size:10px;color:rgba(255,255,255,0.3);">${escapeHtml(metaParts.join(" · "))}</span>
  </div>
  <div style="background:rgba(56,189,248,0.08);border-left:3px solid rgba(56,189,248,0.4);padding:12px 14px;border-radius:6px;margin:8px 0;">
    <p style="font-size:11px;font-weight:600;color:rgba(125,211,252,0.9);margin:0 0 4px 0;letter-spacing:0.04em;">Operating call</p>
    <p style="font-size:16px;font-weight:600;color:rgba(255,255,255,0.9);margin:0;line-height:1.4;">${escapeHtml(operatingCall)}</p>
  </div>
  <p style="font-size:14px;color:rgba(255,255,255,0.7);margin:12px 0;"><strong style="color:rgba(255,255,255,0.8);">Decision now:</strong> ${escapeHtml(actionNow)}</p>
  ${doNowItems.length > 0 ? `<div style="margin:8px 0;"><p style="font-size:11px;font-weight:600;letter-spacing:0.04em;color:rgba(255,255,255,0.4);margin:0 0 4px 0;">${DECISION_CONTRACT_LABELS.action.doNow}</p>${doNowHtml}</div>` : ""}
  ${flipTrigger ? `<div style="background:rgba(245,158,11,0.08);border-left:3px solid rgba(245,158,11,0.4);padding:10px 14px;border-radius:6px;margin:12px 0;font-size:12px;color:rgba(252,211,77,0.8);"><strong style="color:rgba(251,191,36,0.9);">Watch:</strong> ${escapeHtml(flipTrigger)}</div>` : ""}
  <div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.04);font-size:11px;color:rgba(255,255,255,0.3);display:flex;justify-content:space-between;">
    <span>${escapeHtml(USE_CONSTRAINT_SUMMARY)}</span>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:10px;color:rgba(255,255,255,0.45);">
    <span>Macro brief by <a href="${escapeAttribute(attributionUrl)}" style="color:rgba(56,189,248,0.8);text-decoration:underline;font-weight:600;">Whether</a></span>
    <a href="${escapeAttribute(data.briefUrl)}" style="color:rgba(56,189,248,0.6);text-decoration:underline;">Get your own →</a>
  </div>
</div>`;
};
