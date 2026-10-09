/**
 * Meeting Slide & Notion Block Exporter for Whether.
 * Turns the weekly operating call into copyable Notion blocks,
 * rich-text HTML for Keynote/Google Slides, and 16:9 standalone SVG slide cards.
 */

import { DEFAULT_THRESHOLDS } from "../regimeEngineCore";
import { getRegimePublicLabel } from "../regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { buildScoreReferenceLines } from "./scoreReference";
import { describeConditions, formatExportConfidence, formatSourceFooter } from "./exportTerms";
import { fitLines, wrappedLines } from "../image/textFit";

/*
 * The slide's three slot labels are the page's. `callChangesIf` carries the
 * line where the call itself changes, so it prints as "Call changes if"; the
 * levels at which a pause lifts print as "Resume when". They were "Change
 * course if" and "Clears when", two more names for concepts the page already
 * names.
 */
const SLIDE_LABELS = {
  action: DECISION_CONTRACT_LABELS.action.actionNow,
  pause: DECISION_CONTRACT_LABELS.threshold.pauseIf,
  callChange: DECISION_CONTRACT_LABELS.watch.postureFlips,
  resume: DECISION_CONTRACT_LABELS.reversal.resumeWhen,
} as const;

export interface MeetingSlidePayload {
  /** The record date as displayed ("Sep 16, 2026"). */
  recordDate: string;
  /** The same date as ISO, for a filename or a timestamp; absent when the caller only has the label. */
  recordDateIso?: string;
  /** The engine key, for the badge's colour and the conditions line's meaning. */
  regime: string;
  stageLabel: string;
  actionNow: string;
  pauseIf: string;
  /** Where the call itself changes — the regime flip trigger. A stage never replaces it. */
  callChangesIf: string;
  /** A stage's discipline for lifting its hold. Present only when a stage is chosen. */
  resumeWhen?: string;
  tightness: number;
  riskAppetite: number;
  /**
   * The lines the two scores are judged against — where the call itself
   * changes (`assessment.thresholds`). Absent from an artifact-derived slide,
   * which was scored on the engine's defaults; the readings then print
   * against those, so a score never prints without its line.
   */
  lines?: { tightness: number; riskAppetite: number };
  confidence: string;
  provenance: string;
  /** The operating call itself. The snapshot path has only `actionNow`, which
   *  is why this is optional: it renders as the stance line when the two differ. */
  call?: string;
  /** The other things that would change the guidance, printed under their own name. */
  clearsWhen?: readonly string[];
  /** Where to read the whole brief. Absent when the caller has no origin. */
  url?: string;
  /** True when the reading came off a snapshot rather than a live fetch. */
  isFallback?: boolean;
}

/*
 * Every slide comes through `briefArtifactToSlidePayload` in
 * `lib/report/briefArtifact.ts`: the share panel's "Slide" format and
 * `CopyMeetingSlideButton` from the published island, and the SVG, PPTX and PDF
 * routes from a `BriefDocument`, which extends the same artifact. The adapter
 * lives there rather than here because this module is the lower layer.
 */

/**
 * The two scores against the call-change lines, as the slide, the deck files
 * and the pasted block all print them. A snapshot has no previous week, so
 * none is printed.
 */
export const slideReadingLines = (payload: MeetingSlidePayload): string[] =>
  buildScoreReferenceLines({
    scores: { tightness: payload.tightness, riskAppetite: payload.riskAppetite },
    thresholds: payload.lines
      ? { tightnessRegime: payload.lines.tightness, riskAppetiteRegime: payload.lines.riskAppetite }
      : DEFAULT_THRESHOLDS,
  });

/** The stage's resume line as every slide format prints it, or null without a stage. */
export const slideResumeLine = (payload: MeetingSlidePayload): string | null =>
  payload.resumeWhen ? `${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${payload.resumeWhen}` : null;

/** The conditions as every slide format prints them: the weather word, with what it means for money. */
export const slideConditions = (payload: MeetingSlidePayload): string => describeConditions(payload.regime);

/** "Margin: close to the line": the band under its display name (the payload field stays `confidence`). */
const slideMargin = (payload: { confidence: string }) => `Margin: ${formatExportConfidence(payload.confidence).toLowerCase()}`;

/** The margin, then the one provenance footer, as every slide format closes. */
export const slideFooterLine = (payload: MeetingSlidePayload): string =>
  `${slideMargin(payload)} · ${formatSourceFooter({
    sourceLabel: payload.provenance,
    recordDate: payload.recordDateIso ?? payload.recordDate,
    isFallback: payload.isFallback,
  })}`;

/**
 * Generates formatted Markdown / Notion Callout Block
 */
export function formatMeetingSlideMarkdown(payload: MeetingSlidePayload): string {
  return [
    `> **Whether: this week's guidance** — *${payload.recordDate}*`,
    `> **Conditions**: ${slideConditions(payload)}${payload.stageLabel ? ` · **Stage**: ${payload.stageLabel}` : ""}`,
    `>`,
    // The stance the week is called at, above the action it implies. Omitted
    // when the two are the same sentence, which is what the model returns on a
    // week with no stage-scoped action.
    ...(payload.call && payload.call.trim() !== payload.actionNow.trim()
      ? [`> **GUIDANCE**: ${payload.call}`]
      : []),
    `> 🎯 **${SLIDE_LABELS.action.toUpperCase()}**: ${payload.actionNow}`,
    `> ⚠️ **${SLIDE_LABELS.pause.toUpperCase()}**: ${payload.pauseIf}`,
    // The stage's own discipline for lifting its hold, when one is chosen.
    ...(payload.resumeWhen ? [`> ✅ **${SLIDE_LABELS.resume.toUpperCase()}**: ${payload.resumeWhen}`] : []),
    `> 🔄 **${SLIDE_LABELS.callChange.toUpperCase()}**: ${payload.callChangesIf}`,
    // The other things that would change the guidance, under the name the share
    // formats give them. They printed as the resume line here, which on a held
    // week put "why the guidance is held" under "Resume when".
    ...(payload.clearsWhen && payload.clearsWhen.length > 0
      ? [`> **${DECISION_CONTRACT_LABELS.watch.watchThisWeek.toUpperCase()}**: ${payload.clearsWhen.join("; ")}`]
      : []),
    `>`,
    // The snapshot marker travels with the numbers. A slide pasted into a deck
    // during an upstream outage has to say so on the slide, not on the page it
    // was copied from.
    ...slideReadingLines(payload).map((line) => `> *${line}*`),
    `> *${slideFooterLine(payload)}*`,
    ...(payload.url ? [`> ${payload.url}`] : []),
  ].join("\n");
}

/**
 * Generates Rich HTML for clipboard paste into Google Slides, Keynote, Notion, Docs
 */
export function formatMeetingSlideHtml(payload: MeetingSlidePayload): string {
  const isDefensive = payload.regime === "DEFENSIVE" || payload.regime === "SCARCITY";
  const badgeBg = isDefensive ? "#ef4444" : "#10b981";

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f1f5f9; padding: 24px; border-radius: 12px; border: 1px solid #1e293b; max-width: 680px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #1e293b; padding-bottom: 12px;">
    <div>
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 700;">Whether · Weekly Operating Brief</span>
      <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #ffffff;">This week's guidance${payload.stageLabel ? ` — ${payload.stageLabel}` : ""}</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Conditions: ${slideConditions(payload)}</p>
    </div>
    <div style="text-align: right;">
      <span style="background: ${badgeBg}; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${getRegimePublicLabel(payload.regime)}</span>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">${payload.recordDate}</p>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
    <tr>
      <td style="padding: 12px; background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; border-radius: 4px 8px 8px 4px; margin-bottom: 8px;">
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.08em;">1. ${SLIDE_LABELS.action}</span>
        <div style="font-size: 13px; font-weight: 600; color: #ffffff; margin-top: 2px;">${payload.actionNow}</div>
      </td>
    </tr>
    <tr><td style="height: 8px;"></td></tr>
    <tr>
      <td style="padding: 12px; background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; border-radius: 4px 8px 8px 4px; margin-bottom: 8px;">
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #f59e0b; letter-spacing: 0.08em;">2. ${SLIDE_LABELS.pause}</span>
        <div style="font-size: 13px; color: #e2e8f0; margin-top: 2px;">${payload.pauseIf}</div>
      </td>
    </tr>
    <tr><td style="height: 8px;"></td></tr>
    <tr>
      <td style="padding: 12px; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; border-radius: 4px 8px 8px 4px;">
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #10b981; letter-spacing: 0.08em;">3. ${SLIDE_LABELS.callChange}</span>
        <div style="font-size: 13px; color: #e2e8f0; margin-top: 2px;">${payload.callChangesIf}</div>${
          payload.resumeWhen
            ? `
        <span style="display: block; margin-top: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #10b981; letter-spacing: 0.08em;">${SLIDE_LABELS.resume}</span>
        <div style="font-size: 13px; color: #e2e8f0; margin-top: 2px;">${payload.resumeWhen}</div>`
            : ""
        }
      </td>
    </tr>
  </table>

  <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 10px; color: #64748b; padding-top: 8px;">
    <span style="display: flex; flex-direction: column; gap: 2px;">${slideReadingLines(payload).map((line) => `<span>${line}</span>`).join("")}</span>
    <span>${slideFooterLine(payload)}</span>
  </div>
</div>
`.trim();
}

/** A decision card's text area: the 1040px card less 32px of padding on each side. */
const CARD_TEXT_WIDTH = 976;
/**
 * Per-character widths for the slide's system sans, set above what it measures on
 * this copy. It runs wider than the Archivo faces `lib/image/textFit.ts` was measured
 * on: the 92-character call drawn at 20px/700 overran the card (2026-10-09), which puts
 * the bold average above 0.53em.
 */
const SLIDE_BOLD_EM = 0.56;
const SLIDE_TEXT_EM = 0.53;

/**
 * Generates a standalone 16:9 1200x675 SVG presentation slide
 */
export function formatMeetingSlideSvg(payload: MeetingSlidePayload): string {
  const isDefensive = payload.regime === "DEFENSIVE" || payload.regime === "SCARCITY";
  const badgeColor = isDefensive ? "#f43f5e" : "#10b981";

  // Escape XML entities
  const esc = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // SVG text does not wrap, so a card's line is wrapped here: at most two lines, one
  // size smaller at a time before anything is cut, and a cut ends at a word.
  const cardBody = (text: string, size: number, weight: number, fill: string): string => {
    const em = weight >= 700 ? SLIDE_BOLD_EM : SLIDE_TEXT_EM;
    let fontSize = size;
    let lines = wrappedLines(text, fontSize, CARD_TEXT_WIDTH, em);
    while (lines.length > 2 && fontSize > size - 3) {
      fontSize -= 1;
      lines = wrappedLines(text, fontSize, CARD_TEXT_WIDTH, em);
    }
    if (lines.length > 2) {
      lines = wrappedLines(fitLines(text, fontSize, CARD_TEXT_WIDTH, em, 2), fontSize, CARD_TEXT_WIDTH, em).slice(0, 2);
    }
    const lineHeight = Math.round(fontSize * 1.3);
    const firstBaseline = lines.length === 1 ? 72 : 62;
    const spans = lines
      .map((line, index) => `<tspan x="32"${index === 0 ? "" : ` dy="${lineHeight}"`}>${esc(line)}</tspan>`)
      .join("");
    return `<text x="32" y="${firstBaseline}" font-family="-apple-system, system-ui, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${spans}</text>`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.6"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="675" fill="url(#bg)"/>
  
  <!-- Subtle Grid Accent -->
  <circle cx="1100" cy="80" r="220" fill="#38bdf8" opacity="0.04"/>
  <circle cx="100" cy="600" r="300" fill="#10b981" opacity="0.03"/>

  <!-- Header Container -->
  <g transform="translate(80, 70)">
    <text x="0" y="0" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="700" fill="#94a3b8" letter-spacing="2">WHETHER · WEEKLY OPERATING GUIDANCE</text>
    <text x="0" y="44" font-family="-apple-system, system-ui, sans-serif" font-size="34" font-weight="800" fill="#ffffff">This week's guidance${payload.stageLabel ? ` (${esc(payload.stageLabel)})` : ""}</text>
    <text x="0" y="74" font-family="-apple-system, system-ui, sans-serif" font-size="16" font-weight="500" fill="#64748b">${esc(payload.recordDate)} · ${esc(slideConditions(payload))}</text>
    
    <!-- Regime Badge -->
    <g transform="translate(880, 10)">
      <rect x="0" y="0" width="160" height="42" rx="21" fill="${badgeColor}" fill-opacity="0.15" stroke="${badgeColor}" stroke-width="1.5"/>
      <text x="80" y="26" font-family="-apple-system, system-ui, sans-serif" font-size="15" font-weight="800" fill="${badgeColor}" text-anchor="middle" letter-spacing="1">${esc(getRegimePublicLabel(payload.regime))}</text>
    </g>
  </g>

  <!-- 3 Decision Cards -->
  <!-- Card 1: Action Now -->
  <g transform="translate(80, 190)">
    <rect width="1040" height="110" rx="12" fill="url(#cardGrad)" stroke="#334155" stroke-width="1"/>
    <rect width="6" height="110" rx="3" fill="#38bdf8"/>
    <text x="32" y="36" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="700" fill="#38bdf8" letter-spacing="1.5">1. ${SLIDE_LABELS.action.toUpperCase()}</text>
    ${cardBody(payload.actionNow, 20, 700, "#ffffff")}
  </g>

  <!-- Card 2: Pause If -->
  <g transform="translate(80, 320)">
    <rect width="1040" height="110" rx="12" fill="url(#cardGrad)" stroke="#334155" stroke-width="1"/>
    <rect width="6" height="110" rx="3" fill="#f59e0b"/>
    <text x="32" y="36" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="700" fill="#f59e0b" letter-spacing="1.5">2. ${SLIDE_LABELS.pause.toUpperCase()}</text>
    ${cardBody(payload.pauseIf, 18, 500, "#cbd5e1")}
  </g>

  <!-- Card 3: Call changes if -->
  <g transform="translate(80, 450)">
    <rect width="1040" height="110" rx="12" fill="url(#cardGrad)" stroke="#334155" stroke-width="1"/>
    <rect width="6" height="110" rx="3" fill="#10b981"/>
    <text x="32" y="36" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="700" fill="#10b981" letter-spacing="1.5">3. ${SLIDE_LABELS.callChange.toUpperCase()}</text>
    ${cardBody(payload.callChangesIf, 18, 500, "#cbd5e1")}
  </g>

  <!-- Footer: each score against its line, then the margin -->
  <g transform="translate(80, 582)">
${slideReadingLines(payload)
  .map(
    (line, index) =>
      `    <text x="0" y="${index * 18}" font-family="-apple-system, system-ui, sans-serif" font-size="13" font-weight="600" fill="#cbd5e1">${esc(line)}</text>`,
  )
  .join("\n")}
    <text x="0" y="36" font-family="-apple-system, system-ui, sans-serif" font-size="13" font-weight="600" fill="#64748b">
      <tspan fill="#f1f5f9">${esc(slideMargin(payload))}</tspan> · ${esc(slideFooterLine(payload).slice(slideMargin(payload).length + 3))}
    </text>${
      slideResumeLine(payload)
        ? `
    <text x="0" y="54" font-family="-apple-system, system-ui, sans-serif" font-size="13" font-weight="600" fill="#cbd5e1">${esc(slideResumeLine(payload) ?? "")}</text>`
        : ""
    }
  </g>
</svg>`;
}
