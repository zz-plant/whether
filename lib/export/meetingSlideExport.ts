/**
 * Meeting Slide & Notion Block Exporter for Whether.
 * Turns the weekly operating call into copyable Notion blocks,
 * rich-text HTML for Keynote/Google Slides, and 16:9 standalone SVG slide cards.
 */

import { DEFAULT_THRESHOLDS } from "../regimeEngineCore";
import { MARGIN_LABEL } from "../report/reportFormatting";
import { getRegimePublicLabel, isRegimeKey } from "../regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { buildScoreReferenceLines } from "./scoreReference";
import { describeConditions, formatExportConfidence, formatSourceFooter } from "./exportTerms";
import { fitLines, wrappedLines } from "../image/textFit";
import { REGIME_HEX_COLORS } from "../regimePhaseSpace";
import { escapeHtml } from "../email/emailShell";
import {
  OG_BG,
  OG_CONDITION_INK,
  OG_LINE_CROSSED,
  OG_PANEL,
  OG_RULE,
  OG_TEXT,
  OG_TEXT_MUTED,
  OG_TEXT_SECONDARY,
} from "../image/ogTheme";

/*
 * The slide's three slot labels are the page's. `callChangesIf` carries the
 * line where the call itself changes, so it prints as "Call changes if"; the
 * levels at which a pause lifts print as "Restart when". They were "Change
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
  /**
   * The two composite readings. Optional because a frozen brief may have none:
   * records archived before scores were stored carry no scores, and inventing
   * 50/50 for them printed fabricated readings as historical fact in a
   * date-pinned deck. The reading section then says no scores were published
   * (`slideReadingLines`), and nothing renders a number the record never had.
   */
  tightness?: number;
  riskAppetite?: number;
  /**
   * The lines the two scores are judged against — where the call itself
   * changes (`assessment.thresholds`). Absent from an artifact-derived slide,
   * which was scored on the engine's defaults; the readings then print
   * against those, so a score never prints without its line.
   */
  lines?: { tightness: number; riskAppetite: number };
  confidence: string;
  provenance: string;
  /** Which inputs set the scores, as a sentence ("Scored on the record's inputs."); the footer prints it after the source. */
  basis?: string;
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
 *
 * A payload with no scores — a frozen brief archived before scores were stored
 * — prints one honest line instead of readings for numbers it never had.
 */
export const slideReadingLines = (payload: MeetingSlidePayload): string[] => {
  if (typeof payload.tightness !== "number" || typeof payload.riskAppetite !== "number") {
    return ["No scores were published with this brief."];
  }
  return buildScoreReferenceLines({
    scores: { tightness: payload.tightness, riskAppetite: payload.riskAppetite },
    thresholds: payload.lines
      ? { tightnessRegime: payload.lines.tightness, riskAppetiteRegime: payload.lines.riskAppetite }
      : DEFAULT_THRESHOLDS,
  });
};

/** The stage's restart line as every slide format prints it, or null without a stage. */
export const slideResumeLine = (payload: MeetingSlidePayload): string | null =>
  payload.resumeWhen ? `${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${payload.resumeWhen}` : null;

/** The conditions as every slide format prints them: the weather word, with what it means for money. */
export const slideConditions = (payload: MeetingSlidePayload): string => describeConditions(payload.regime);

/**
 * The condition badge's colours: its edge in the condition's fill, its word in
 * the condition's ink, as every other surface draws a condition. The badge was
 * red for Cloudy and Freezing and green for the other two until 2026-10-09, so
 * a Stormy slide carried a Sunny badge. The board deck draws the same badge.
 */
export const slideConditionColors = (payload: MeetingSlidePayload): { edge: string; ink: string } =>
  isRegimeKey(payload.regime)
    ? { edge: REGIME_HEX_COLORS[payload.regime], ink: OG_CONDITION_INK[payload.regime] }
    : { edge: OG_RULE, ink: OG_TEXT };

/*
 * The stance the week is called at, above the action it implies; null when the
 * two are the same sentence, which is what the model returns on a week with no
 * stage-scoped action.
 */
const slideGuidance = (payload: MeetingSlidePayload): string | null =>
  payload.call && payload.call.trim() !== payload.actionNow.trim() ? payload.call : null;

/*
 * The other things that would change the guidance, under the name the share
 * formats give them. They printed as the restart line once, which on a held week
 * put "why the guidance is held" under "Restart when".
 */
const slideWatchLine = (payload: MeetingSlidePayload): string | null =>
  payload.clearsWhen && payload.clearsWhen.length > 0 ? payload.clearsWhen.join("; ") : null;

/** "Room before a change: close to the line": the band under its display name (the payload field stays `confidence`). */
const slideMargin = (payload: { confidence: string }) => `${MARGIN_LABEL}: ${formatExportConfidence(payload.confidence).toLowerCase()}`;

/** The margin, then the one provenance footer, as every slide format closes. */
export const slideFooterLine = (payload: MeetingSlidePayload): string =>
  `${slideMargin(payload)} · ${formatSourceFooter({
    sourceLabel: payload.provenance,
    recordDate: payload.recordDateIso ?? payload.recordDate,
    isFallback: payload.isFallback,
    ...(payload.basis ? { scoringBasis: { sentence: payload.basis } } : {}),
  })}`;

/**
 * Generates formatted Markdown / Notion Callout Block
 */
export function formatMeetingSlideMarkdown(payload: MeetingSlidePayload): string {
  const guidance = slideGuidance(payload);
  const watch = slideWatchLine(payload);
  return [
    `> **Whether: this week's guidance** — *${payload.recordDate}*`,
    `> **Conditions**: ${slideConditions(payload)}${payload.stageLabel ? ` · **Stage**: ${payload.stageLabel}` : ""}`,
    `>`,
    ...(guidance ? [`> **GUIDANCE**: ${guidance}`] : []),
    // Labels only (2026-10-09): a target, a warning sign, a tick and a cycle
    // arrow sat in front of them, four pictures restating four words.
    `> **${SLIDE_LABELS.action.toUpperCase()}**: ${payload.actionNow}`,
    `> **${SLIDE_LABELS.pause.toUpperCase()}**: ${payload.pauseIf}`,
    // The stage's own discipline for lifting its hold, when one is chosen.
    ...(payload.resumeWhen ? [`> **${SLIDE_LABELS.resume.toUpperCase()}**: ${payload.resumeWhen}`] : []),
    `> **${SLIDE_LABELS.callChange.toUpperCase()}**: ${payload.callChangesIf}`,
    ...(watch ? [`> **${DECISION_CONTRACT_LABELS.watch.watchThisWeek.toUpperCase()}**: ${watch}`] : []),
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
 *
 * The rich half of the same clipboard write as the Markdown above, and the half
 * Slides and Notion paste, so it carries every line the Markdown does: it left
 * out the guidance, the watch line and the link. Text is escaped, since the
 * watch line holds comparisons ("Funding pressure < 66").
 */
export function formatMeetingSlideHtml(payload: MeetingSlidePayload): string {
  const { edge: badgeEdge, ink: badgeInk } = slideConditionColors(payload);
  const guidance = slideGuidance(payload);
  const watch = slideWatchLine(payload);
  const esc = escapeHtml;

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${OG_BG}; color: ${OG_TEXT}; padding: 24px; border-radius: 12px; border: 1px solid ${OG_RULE}; max-width: 680px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid ${OG_RULE}; padding-bottom: 12px;">
    <div>
      <span style="font-size: 12px; color: ${OG_TEXT_MUTED}; font-weight: 600;">Whether · Weekly operating guidance</span>
      <h2 style="margin: 4px 0 0 0; font-size: 18px; color: ${OG_TEXT};">This week's guidance${payload.stageLabel ? ` — ${esc(payload.stageLabel)}` : ""}</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: ${OG_TEXT_MUTED};">Conditions: ${esc(slideConditions(payload))}</p>
    </div>
    <div style="text-align: right;">
      <span style="border: 1px solid ${badgeEdge}; color: ${badgeInk}; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${esc(getRegimePublicLabel(payload.regime))}</span>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: ${OG_TEXT_MUTED};">${esc(payload.recordDate)}</p>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">${
    guidance
      ? `
    <tr>
      <td style="padding: 8px 0;">
        <span style="font-size: 12px; font-weight: 700; color: ${OG_TEXT};">Guidance</span>
        <div style="font-size: 13px; color: ${OG_TEXT_SECONDARY}; margin-top: 2px;">${esc(guidance)}</div>
      </td>
    </tr>`
      : ""
  }
    <tr>
      <td style="padding: 8px 0;">
        <span style="font-size: 12px; font-weight: 700; color: ${OG_TEXT};">${SLIDE_LABELS.action}</span>
        <div style="font-size: 13px; font-weight: 600; color: ${OG_TEXT}; margin-top: 2px;">${esc(payload.actionNow)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 8px 0;">
        <span style="font-size: 12px; font-weight: 700; color: ${OG_LINE_CROSSED};">${SLIDE_LABELS.pause}</span>
        <div style="font-size: 13px; color: ${OG_TEXT_SECONDARY}; margin-top: 2px;">${esc(payload.pauseIf)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 8px 0;">
        <span style="font-size: 12px; font-weight: 700; color: ${OG_TEXT};">${SLIDE_LABELS.callChange}</span>
        <div style="font-size: 13px; color: ${OG_TEXT_SECONDARY}; margin-top: 2px;">${esc(payload.callChangesIf)}</div>${
          payload.resumeWhen
            ? `
        <span style="display: block; margin-top: 8px; font-size: 12px; font-weight: 700; color: ${OG_TEXT};">${SLIDE_LABELS.resume}</span>
        <div style="font-size: 13px; color: ${OG_TEXT_SECONDARY}; margin-top: 2px;">${esc(payload.resumeWhen)}</div>`
            : ""
        }
      </td>
    </tr>${
      watch
        ? `
    <tr>
      <td style="padding: 8px 0;">
        <span style="font-size: 12px; font-weight: 700; color: ${OG_TEXT};">${DECISION_CONTRACT_LABELS.watch.watchThisWeek}</span>
        <div style="font-size: 13px; color: ${OG_TEXT_SECONDARY}; margin-top: 2px;">${esc(watch)}</div>
      </td>
    </tr>`
        : ""
    }
  </table>

  <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 10px; color: ${OG_TEXT_MUTED}; padding-top: 8px;">
    <span style="display: flex; flex-direction: column; gap: 2px;">${slideReadingLines(payload).map((line) => `<span>${esc(line)}</span>`).join("")}</span>
    <span>${esc(slideFooterLine(payload))}</span>
  </div>${
    payload.url
      ? `
  <p style="margin: 8px 0 0 0; font-size: 10px;"><a href="${esc(payload.url)}" style="color: ${OG_TEXT_MUTED};">${esc(payload.url)}</a></p>`
      : ""
  }
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
  const { edge: badgeColor, ink: badgeInk } = slideConditionColors(payload);

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

  /* Flat (2026-10-09): one background fill and one card fill. The slide had a
     diagonal background gradient, a gradient on every card, and two faint
     sky and emerald discs behind the header ("Subtle Grid Accent") that a
     projector shows as smudges. The header reads in sentence case, as the
     site's category line does, not in letter-spaced capitals. The three
     cards are parallel, so they carry no numbers, and each card's colour is
     its label's alone: a coloured bar down its edge drew the same thing twice.
     Labels are the ink except the pause label, which is the front red the site
     prints a pause line in; the condition badge is the condition's own colour. */
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <rect width="1200" height="675" fill="${OG_BG}"/>

  <!-- Header -->
  <g transform="translate(80, 70)">
    <text x="0" y="0" font-family="-apple-system, system-ui, sans-serif" font-size="15" font-weight="600" fill="${OG_TEXT_MUTED}">Whether · Weekly operating guidance</text>
    <text x="0" y="44" font-family="-apple-system, system-ui, sans-serif" font-size="34" font-weight="800" fill="${OG_TEXT}">This week's guidance${payload.stageLabel ? ` (${esc(payload.stageLabel)})` : ""}</text>
    <text x="0" y="74" font-family="-apple-system, system-ui, sans-serif" font-size="16" font-weight="500" fill="${OG_TEXT_MUTED}">${esc(payload.recordDate)} · ${esc(slideConditions(payload))}</text>
    
    <!-- Regime Badge -->
    <g transform="translate(880, 10)">
      <rect x="0" y="0" width="160" height="42" rx="21" fill="${badgeColor}" fill-opacity="0.15" stroke="${badgeColor}" stroke-width="1.5"/>
      <text x="80" y="26" font-family="-apple-system, system-ui, sans-serif" font-size="15" font-weight="800" fill="${badgeInk}" text-anchor="middle" letter-spacing="1">${esc(getRegimePublicLabel(payload.regime))}</text>
    </g>
  </g>

  <!-- Action now -->
  <g transform="translate(80, 190)">
    <rect width="1040" height="110" rx="12" fill="${OG_PANEL}" stroke="${OG_RULE}" stroke-width="1"/>
    <text x="32" y="36" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="700" fill="${OG_TEXT}">${SLIDE_LABELS.action}</text>
    ${cardBody(payload.actionNow, 20, 700, OG_TEXT)}
  </g>

  <!-- Pause if -->
  <g transform="translate(80, 320)">
    <rect width="1040" height="110" rx="12" fill="${OG_PANEL}" stroke="${OG_RULE}" stroke-width="1"/>
    <text x="32" y="36" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="700" fill="${OG_LINE_CROSSED}">${SLIDE_LABELS.pause}</text>
    ${cardBody(payload.pauseIf, 18, 500, OG_TEXT_SECONDARY)}
  </g>

  <!-- Conditions change if -->
  <g transform="translate(80, 450)">
    <rect width="1040" height="110" rx="12" fill="${OG_PANEL}" stroke="${OG_RULE}" stroke-width="1"/>
    <text x="32" y="36" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="700" fill="${OG_TEXT}">${SLIDE_LABELS.callChange}</text>
    ${cardBody(payload.callChangesIf, 18, 500, OG_TEXT_SECONDARY)}
  </g>

  <!-- Footer: each score against its line, then the margin -->
  <g transform="translate(80, 582)">
${slideReadingLines(payload)
  .map(
    (line, index) =>
      `    <text x="0" y="${index * 18}" font-family="-apple-system, system-ui, sans-serif" font-size="13" font-weight="600" fill="${OG_TEXT_SECONDARY}">${esc(line)}</text>`,
  )
  .join("\n")}
    <text x="0" y="36" font-family="-apple-system, system-ui, sans-serif" font-size="13" font-weight="600" fill="${OG_TEXT_MUTED}">
      <tspan fill="${OG_TEXT}">${esc(slideMargin(payload))}</tspan> · ${esc(slideFooterLine(payload).slice(slideMargin(payload).length + 3))}
    </text>${
      slideResumeLine(payload)
        ? `
    <text x="0" y="54" font-family="-apple-system, system-ui, sans-serif" font-size="13" font-weight="600" fill="${OG_TEXT_SECONDARY}">${esc(slideResumeLine(payload) ?? "")}</text>`
        : ""
    }
  </g>
</svg>`;
}
