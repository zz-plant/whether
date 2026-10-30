/**
 * Embed API — returns the weekly brief as an HTML snippet for newsletter writers.
 * Newsletter build steps call this endpoint at send time and insert the response.
 *
 * GET /api/embed?ticker=GOOGL&stage=series-b&format=html
 * GET /api/embed?format=text
 * GET /api/embed?format=page   (a whole document, for an iframe: Notion, oEmbed)
 */

import { NextResponse } from "next/server";
import { assembleHomePage } from "../../../lib/report/homePageAssembler";
import type { OperatorContext } from "../../../lib/report/operatorContext";
import { operatorStageLabel, parseOperatorStageParam } from "../../../lib/report/operatorStage";
import { parseOperatorRunwayParam } from "../../../lib/report/operatorRunway";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { formatMarginStamp, formatStripMargin, publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { formatGuidance } from "../../../lib/export/briefBuilders";
import { buildCallChangeLines, weeklyHeadline } from "../../../lib/report/reportEvidence";
import { weeklyCallChangeLines } from "../../../lib/report/weeklyCallContract";
import { siteUrl } from "../../../lib/siteUrl";
import { USE_CONSTRAINT_SUMMARY, buildUseConstraint } from "../../../lib/report/useConstraint";
import { OG_BG, OG_BORDER, OG_PANEL, OG_RULE, OG_TEXT, OG_TEXT_MUTED, OG_TEXT_SECONDARY } from "../../../lib/image/ogTheme";

export const runtime = "edge";
export const revalidate = 900;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tickerParam = url.searchParams.get("ticker")?.trim().toUpperCase() || "";
  const format = url.searchParams.get("format") || "html";
  const ref = url.searchParams.get("ref") || "embed";
  const mode = url.searchParams.get("mode") || (url.searchParams.get("view") === "call-strip" ? "call-strip" : "brief");

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

    const briefData = buildBriefEmbedData(homepage, { ticker: tickerParam, ref, companyStage });

    if (mode === "call-strip") {
      if (format === "json") {
        return NextResponse.json({
          mode: "call-strip",
          regime: briefData.regimeLabel,
          call: briefData.formattedCall,
          marginLabel: briefData.marginLabel,
          flipDistance: briefData.flipDistance,
          flipTrigger: briefData.flipTrigger,
          recordDate: briefData.recordDate,
          use: buildUseConstraint(),
          attribution: {
            text: "Macro brief by Whether",
            url: briefData.attributionUrl,
          },
        });
      }

      if (format === "text") {
        return new NextResponse(buildCallStripEmbedText(briefData), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Whether-Embed-Version": "1",
            "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=1800",
          },
        });
      }

      const html = format === "page" ? wrapEmbedPage(buildCallStripEmbedHtml(briefData)) : buildCallStripEmbedHtml(briefData);

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Whether-Embed-Version": "1",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }

    if (format === "json") {
      return NextResponse.json({
        ...briefData,
        /* The headline's action. `briefData.actionNow` is the contract's, which the
           headline stopped leading with on 2026-10-09 and which the formats read
           only for the week's direction; `formattedCall` is the whole guidance. */
        actionNow: weeklyHeadline({
          actionNow: briefData.actionNow,
          currentCall: briefData.operatingCall,
          policyOverrideActive: briefData.policyOverrideActive,
        }).action,
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
      return new NextResponse(buildBriefEmbedText(briefData), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Whether-Embed-Version": "1",
          "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=1800",
        },
      });
    }

    // Default: HTML
    const html = format === "page" ? wrapEmbedPage(buildBriefEmbedHtml(briefData)) : buildBriefEmbedHtml(briefData);

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

type HomePage = Awaited<ReturnType<typeof assembleHomePage>>;

/**
 * What every format of the embed says, from the assembled homepage. Separated
 * from the transport for the reason `buildBriefMarkdown` is: `assembleHomePage`
 * needs Next's incremental cache, which a route handler has and a test does
 * not, so a test assembles the page from a fixture and reads what this builds.
 */
export const buildBriefEmbedData = (
  homepage: HomePage,
  { ticker, ref, companyStage }: { ticker: string; ref: string; companyStage: ReturnType<typeof parseOperatorStageParam> },
): BriefEmbedData => {
  const reportData = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "Standard";
  /* The published band as a reader says it ("Medium confidence"). This was
     the code itself, so the widget's meta line read "Freezing · MED" and the
     text format "Confidence: MED" inside somebody else's newsletter. */
  const confidenceLabel = formatMarginStamp(homepage.weeklyDecisionCardModel.status.confidenceLabel);
  const actionItems = homepage.weeklyDecisionCardModel.decision.actionStripItems ?? [];
  const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
  const operatingStanceLine = homepage.weeklyDecisionCardModel.decision.operatingStanceLine;
  const operatingCall = canonicalDecision?.operatingCall ?? operatingStanceLine;
  const actionNow = homepage.weeklyDecisionCardModel.decision.actionNowShort || homepage.weeklyDecisionCardModel.decision.immediateDecision;
  /* Each area's line under its area's name, so the list reads as area lines
     under the one headline rather than as five more headlines. */
  const doNowItems = actionItems.map((item) => `${item.label}: ${item.areaActionNow}`);
  /*
   * Read off the same action strip `doNowItems` comes from.
   *
   * `reversalCondition` used to be the literal "Two consecutive weeks of
   * confirming signals" — the same sentence every week, for every regime, in a
   * field nothing renders and only `format=json` returns. So the one consumer
   * it had was an integrator reading it as a fact about this week's call. The
   * value was already in scope: `reversalCondition` is a non-optional sibling
   * of the `areaActionNow` on the line above, and every other surface in this
   * repo reads it.
   *
   * `flipTrigger` fell back to "Monitor economic indicators", which is advice
   * no reading produced; the field is omitted rather than filled. It then
   * printed "Watch: Funding pressure < 66" — the first of the rules' resume
   * conditions (`compactFlipConditionLabels`), falling back to the lead rule's
   * pause line. On Oct 5 that was Hiring's restart line, 24 points away, while
   * the line that changes conditions was risk appetite clearing 50, 2 points
   * away. It is now the brief's own "Conditions change if" sentence, printed
   * under that label, with a stage's restart line under its own.
   */
  const primaryAction = actionItems[0];
  const flipTrigger = homepage.weeklyCall.callChangesIf.trim() || null;
  const resumeWhen = homepage.weeklyCall.resumeWhen?.trim() || null;
  const reversalCondition = primaryAction?.reversalCondition ?? null;

  const assessment = homepage.reportResult.ok
    ? homepage.reportResult.data.assessment
    : homepage.reportResult.fallback.assessment;
  const [nearest] = [...buildCallChangeLines(assessment)].sort(
    (left, right) => (left.distance ?? Number.POSITIVE_INFINITY) - (right.distance ?? Number.POSITIVE_INFINITY),
  );
  const flipDistance = nearest?.distance ?? null;
  const rawConfidence = homepage.weeklyDecisionCardModel.status.confidenceLabel ?? "HIGH";
  const marginLabel = formatStripMargin(rawConfidence, flipDistance);
  const formattedCall = formatGuidance({
    actionNow,
    currentCall: operatingCall,
    policyOverrideActive: homepage.weeklyCall.policyOverrideActive,
  });

  return {
    operatingCall,
    actionNow,
    formattedCall,
    policyOverrideActive: homepage.weeklyCall.policyOverrideActive,
    doNowItems,
    flipTrigger,
    flipDistance,
    marginLabel,
    ...(resumeWhen ? { resumeWhen } : {}),
    reversalCondition,
    dataFreshness: homepage.reportShell.fetchedAtLabel,
    postureLabel,
    confidenceLabel,
    regimeLabel: homepage.reportShell.statusLabel,
    /* The reading's own date. `weeklyRecordDate` is the Friday of its week,
       so a Monday reading went out as "As of 2026-10-09", four days after it
       was taken and two days in the future on the day it was read. */
    recordDate: reportData.treasury.record_date,
    tickerLabel: ticker || null,
    stageLabel: companyStage ? operatorStageLabel(companyStage) : null,
    sourceLabel: homepage.reportShell.treasurySource,
    briefUrl: buildWhetherBriefUrl({ ticker, ref }),
    attributionUrl: buildWhetherBriefUrl({ ref }),
  };
};

type BriefEmbedData = {
  operatingCall: string;
  actionNow: string;
  formattedCall?: string;
  /** A held week leads with the hold's action (`weeklyHeadline`). */
  policyOverrideActive?: boolean;
  doNowItems: string[];
  /** Where conditions change: the brief's "Conditions change if" sentence. Null when the call published none. Never filler. */
  flipTrigger: string | null;
  /** Points to nearest change line */
  flipDistance?: number | null;
  /** Concise margin / flip distance label for compact views */
  marginLabel?: string;
  /** Set only when a stage is calibrated: that stage's restart line, printed under its own label. */
  resumeWhen?: string;
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

/* The change line under the brief's label, and a stage's restart line under its
   own, through the helper every surface that prints them reads. */
const embedChangeLines = ({ flipTrigger, resumeWhen }: Pick<BriefEmbedData, "flipTrigger" | "resumeWhen">) =>
  flipTrigger ? weeklyCallChangeLines({ callChangesIf: flipTrigger, resumeWhen }) : [];

/** `format=text`: the embed as plain lines a newsletter build step inserts. */
export const buildBriefEmbedText = (data: BriefEmbedData): string =>
  [
    `Whether — Weekly brief${data.tickerLabel ? ` for ${data.tickerLabel}` : ""}`,
    /* This line read "Regime: Freezing • Confidence: MED": the engine's noun
       and the confidence code, where every other surface prints the weather
       word under "Conditions" and the band as a word. */
    `Conditions: ${data.regimeLabel} • ${data.confidenceLabel} • Data as of ${data.recordDate}`,
    ``,
    /* The guidance as every other paste leads with it (`formatGuidance`): the
       week's headline action, opened by its direction. */
    `${publicDecisionLabels.call}: ${formatGuidance({ actionNow: data.actionNow, currentCall: data.operatingCall, policyOverrideActive: data.policyOverrideActive })}`,
    /* One item per line. Joined with commas, items that carry their own
       ("If you plan to raise, prepare…", "…within a week, each with a review
       date") ran into each other and the list could not be read back. */
    ...(data.doNowItems.length > 0
      ? [`${DECISION_CONTRACT_LABELS.action.doNow}:`, ...data.doNowItems.map((item) => `- ${item}`)]
      : []),
    ...embedChangeLines(data).map(({ label, value }) => `${label}: ${value}`),
    ``,
    `Get your own weekly brief: ${data.attributionUrl}`,
    USE_CONSTRAINT_SUMMARY,
  ].join("\n");

export const buildBriefEmbedHtml = (data: BriefEmbedData): string => {
  const { operatingCall, actionNow, policyOverrideActive, doNowItems, postureLabel, confidenceLabel, recordDate, tickerLabel, stageLabel, attributionUrl } = data;
  // `stageLabel` is only ever a stage the brief was actually calibrated for —
  // the route derives it from the parsed stage, not the raw parameter — so the
  // meta line can carry it without claiming a calibration that did not happen.
  const metaParts = [postureLabel, confidenceLabel, `Data as of ${recordDate}`, tickerLabel, stageLabel].filter(Boolean);
  const doNowHtml = doNowItems
    .map((item) => `<p style="font-size:13px;color:${OG_TEXT_SECONDARY};margin:2px 0;padding:4px 0;border-bottom:1px solid ${OG_BORDER};">${escapeHtml(item)}</p>`)
    .join("");
  const changeLinesHtml = embedChangeLines(data)
    .map(
      ({ label, value }) =>
        `<div style="background:${OG_PANEL};border:1px solid ${OG_RULE};padding:10px 14px;border-radius:6px;margin:12px 0;font-size:12px;color:${OG_TEXT_SECONDARY};"><strong style="color:${OG_TEXT};">${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`,
    )
    .join("");

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0;padding:16px;background:${OG_BG};border:1px solid ${OG_BORDER};border-radius:12px;color:${OG_TEXT};">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
    <span style="font-size:11px;font-weight:600;letter-spacing:0.04em;color:${OG_TEXT_MUTED};">Whether — Weekly Brief</span>
    <span style="font-size:10px;color:${OG_TEXT_MUTED};">${escapeHtml(metaParts.join(" · "))}</span>
  </div>
  <div style="background:${OG_PANEL};border:1px solid ${OG_RULE};padding:12px 14px;border-radius:6px;margin:8px 0;">
    <p style="font-size:11px;font-weight:600;color:${OG_TEXT_MUTED};margin:0 0 4px 0;letter-spacing:0.04em;">${publicDecisionLabels.call}</p>
    <p style="font-size:16px;font-weight:600;color:${OG_TEXT};margin:0;line-height:1.4;">${escapeHtml(formatGuidance({ actionNow, currentCall: operatingCall, policyOverrideActive }))}</p>
  </div>
  ${doNowItems.length > 0 ? `<div style="margin:8px 0;"><p style="font-size:11px;font-weight:600;letter-spacing:0.04em;color:${OG_TEXT_MUTED};margin:0 0 4px 0;">${DECISION_CONTRACT_LABELS.action.doNow}</p>${doNowHtml}</div>` : ""}
  ${changeLinesHtml}
  <div style="margin-top:14px;padding-top:10px;border-top:1px solid ${OG_BORDER};font-size:11px;color:${OG_TEXT_MUTED};display:flex;justify-content:space-between;">
    <span>${escapeHtml(USE_CONSTRAINT_SUMMARY)}</span>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:10px;color:${OG_TEXT_MUTED};">
    <span>Macro brief by <a href="${escapeAttribute(attributionUrl)}" style="color:${OG_TEXT};text-decoration:underline;font-weight:600;">Whether</a></span>
    <a href="${escapeAttribute(data.briefUrl)}" style="color:${OG_TEXT_SECONDARY};text-decoration:underline;">Get your own →</a>
  </div>
</div>`;
};

/**
 * The snippet as a whole document, for a frame: Notion's embed block and every
 * oEmbed consumer (`/api/oembed`) load a URL into an iframe, and a bare
 * fragment there renders in quirks mode with the browser's 8px margin. Links
 * open outside the frame, since a brief read inside someone's doc should not
 * navigate their doc away.
 */
const wrapEmbedPage = (fragment: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Whether: this week's guidance</title>
<base target="_blank">
<style>html,body{margin:0;background:transparent}</style>
</head>
<body>
${fragment}
</body>
</html>`;

export const buildCallStripEmbedHtml = (data: BriefEmbedData): string => {
  const callText = data.formattedCall ?? formatGuidance({
    actionNow: data.actionNow,
    currentCall: data.operatingCall,
    policyOverrideActive: data.policyOverrideActive,
  });
  const marginText = data.marginLabel ?? data.confidenceLabel;

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:100%;margin:0;padding:8px 12px;background:${OG_BG};border:1px solid ${OG_BORDER};border-radius:8px;color:${OG_TEXT};display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box;">
  <div style="display:flex;align-items:center;gap:10px;min-width:0;flex-wrap:wrap;">
    <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:rgba(237,240,238,0.08);color:${OG_TEXT};border:1px solid ${OG_BORDER};">${escapeHtml(data.regimeLabel)}</span>
    <span style="font-size:13px;font-weight:600;color:${OG_TEXT};line-height:1.4;">${escapeHtml(callText)}</span>
    <span style="font-size:12px;color:${OG_TEXT_MUTED};white-space:nowrap;">· ${escapeHtml(marginText)}</span>
  </div>
  <div style="font-size:10px;color:${OG_TEXT_MUTED};white-space:nowrap;margin-left:auto;">
    <a href="${escapeAttribute(data.attributionUrl)}" style="color:${OG_TEXT_SECONDARY};text-decoration:none;font-weight:600;" target="_blank" rel="noopener">Whether &rarr;</a>
  </div>
</div>`;
};

export const buildCallStripEmbedText = (data: BriefEmbedData): string => {
  const callText = data.formattedCall ?? formatGuidance({
    actionNow: data.actionNow,
    currentCall: data.operatingCall,
    policyOverrideActive: data.policyOverrideActive,
  });
  const marginText = data.marginLabel ?? data.confidenceLabel;
  return `Whether [${data.regimeLabel}]: ${callText} · ${marginText} (${data.attributionUrl})`;
};

