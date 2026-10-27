/**
 * Offline, editable visual references and templates. These never read a report,
 * snapshot, clock or network. Core concept mappings own every semantic glyph.
 * The generator supplies Archivo to librsvg for PNGs; SVG text stays editable
 * and falls back to Arial when Archivo is not installed in the consuming tool.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { cloneElement, type ReactElement } from "react";
import { REGIME_LABELS, REGIME_ORDER, REGIME_WEATHER_RATIONALES } from "../regimePresentation";
import { REGIME_HEX_COLORS } from "../regimePhaseSpace";
import { decisionAreaLabel, decisionAreaOrder } from "../report/boundedDecisionRules";
import { type LineState } from "../report/operatingCalls";
import { DECISION_CONTRACT_LABELS } from "../report/reportCopy";
import { resolveDataStatusLabel } from "../report/trustStatus";
import type { RegimeKey } from "../types";
import { AreaIcon, ConditionIcon, LineStateIcon } from "../../app/components/ui/conceptIcons";
import { OG_BG, OG_PANEL, OG_TEXT, OG_TEXT_SECONDARY, OG_TEXT_MUTED, OG_BORDER, OG_CONDITION_INK, OG_LINE_CROSSED, OG_LINE_CROSSED_MARK } from "./ogTheme";

type AssetTheme = "dark" | "light";
type Palette = {
  bg: string;
  panel: string;
  ink: string;
  secondary: string;
  muted: string;
  rule: string;
  line: string;
  lineMark: string;
  conditionInk: Record<RegimeKey, string>;
};

/** Non-CSS formats mirror the roles in tokens.css, like the existing OG theme. */
export const VISUAL_ASSET_THEMES: Record<AssetTheme, Palette> = {
  dark: { bg: OG_BG, panel: OG_PANEL, ink: OG_TEXT, secondary: OG_TEXT_SECONDARY, muted: OG_TEXT_MUTED, rule: OG_BORDER, line: OG_LINE_CROSSED, lineMark: OG_LINE_CROSSED_MARK, conditionInk: OG_CONDITION_INK },
  light: {
    bg: "#f1f4f3", panel: "#ffffff", ink: "#121719", secondary: "#384145", muted: "#525c60", rule: "rgba(18, 23, 25, 0.10)", line: "#b4232a", lineMark: "#d13b37",
    conditionInk: { EXPANSION: "#7a5800", DEFENSIVE: "#74552a", VOLATILE: "#4a4fc0", SCARCITY: "#1d5585" },
  },
};

type VisualAsset = {
  id: string;
  theme: AssetTheme;
  group: "conditions" | "areas" | "lines" | "status" | "charts" | "diagrams" | "frames" | "motion";
  title: string;
  alt: string;
  width: number;
  height: number;
  example: boolean;
  rasterize: boolean;
  svg: string;
};

const xml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (x: number, y: number, value: string, size: number, fill: string, weight = 400, anchor = "start") =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${xml(value)}</text>`;
const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, width = 2, dash?: string) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
const box = (x: number, y: number, width: number, height: number, p: Palette, radius = 10) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${p.panel}" stroke="${p.rule}" stroke-width="2"/>`;
/** A glyph element from the shared concept components, placed by `cloneElement`. */
type ConceptGlyphElement = ReactElement<{
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  color?: string;
}>;
/* The shared concept components own the glyph mappings; placement, size and ink
   arrive as the same props the kit used to set on the raw icons. */
const icon = (glyph: ConceptGlyphElement, x: number, y: number, size: number, color: string) =>
  renderToStaticMarkup(cloneElement(glyph, { x, y, width: size, height: size, color }));
const wrapped = (x: number, y: number, value: string, size: number, fill: string, max = 38, gap = size * 1.4) => {
  const lines: string[] = [];
  for (const word of value.split(" ")) {
    const last = lines[lines.length - 1];
    if (!last || last.length + word.length + 1 > max) lines.push(word);
    else lines[lines.length - 1] = `${last} ${word}`;
  }
  return lines.map((value, i) => text(x, y + i * gap, value, size, fill)).join("");
};
const arrow = (x1: number, y1: number, x2: number, y2: number, color: string) =>
  line(x1, y1, x2, y2, color) + `<path d="M${x2 - 7} ${y2 - 6}l7 6-7 6" fill="none" stroke="${color}" stroke-width="2"/>`;

function header(title: string, width: number, p: Palette, subtitle = "Illustrative template · no current reading") {
  return text(64, 64, "Whether", 28, p.ink, 700)
    + text(width - 64, 64, "Template", 22, p.muted, 400, "end")
    + text(64, 139, title, 48, p.ink, 700)
    + text(64, 184, subtitle, 24, p.muted);
}
const footer = (width: number, height: number, p: Palette, note = "Replace placeholders with a cited reading before sharing.") =>
  line(64, height - 80, width - 64, height - 80, p.rule)
  + text(64, height - 39, note, 20, p.muted)
  + text(width - 64, height - 39, "whether.work", 20, p.muted, 400, "end");

function svg(asset: Omit<VisualAsset, "svg">, body: string, p: Palette, transparent = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${asset.width}" height="${asset.height}" viewBox="0 0 ${asset.width} ${asset.height}" role="img" aria-labelledby="${asset.theme}-${asset.id}-title ${asset.theme}-${asset.id}-desc">
<title id="${asset.theme}-${asset.id}-title">${xml(asset.title)}</title>
<desc id="${asset.theme}-${asset.id}-desc">${xml(asset.alt)}</desc>
<g font-family="Archivo, Arial, sans-serif" font-variant-numeric="tabular-nums">
${transparent ? "" : `<rect width="100%" height="100%" fill="${p.bg}"/>`}
${body}
</g>
</svg>
`;
}

const LINE_LABELS: Record<LineState, string> = { crossed: "Pause line crossed", near: "Near pause line", clear: "Pause line clear" };

/** All output is static reference material, with examples explicitly marked. */
export function createVisualAssets(): VisualAsset[] {
  const assets: VisualAsset[] = [];
  for (const theme of ["dark", "light"] as const) {
    const p = VISUAL_ASSET_THEMES[theme];
    const add = (id: string, group: VisualAsset["group"], title: string, alt: string, width: number, height: number, body: string, example = false, rasterize = false, transparent = false) => {
      const metadata = { id, theme, group, title, alt, width, height, example, rasterize };
      assets.push({ ...metadata, svg: svg(metadata, body, p, transparent) });
    };

    for (const regime of REGIME_ORDER) {
      const name = REGIME_LABELS[regime];
      const ink = p.conditionInk[regime];
      add(`condition-${regime.toLowerCase()}-glyph`, "conditions", `${name} glyph`, `${name} condition reference: the canonical weather glyph beside its name. ${REGIME_WEATHER_RATIONALES[regime]}`, 360, 128,
        icon(<ConditionIcon regime={regime} />, 24, 40, 48, ink) + text(94, 76, name, 32, ink, 600), false, false, true);
      add(`condition-${regime.toLowerCase()}-tile`, "conditions", `${name} condition tile`, `${name} condition reference tile. ${REGIME_WEATHER_RATIONALES[regime]} This is a definition, not a current reading.`, 560, 320,
        box(1, 1, 558, 318, p) + text(32, 44, "Condition reference", 18, p.muted)
        + icon(<ConditionIcon regime={regime} />, 32, 78, 56, ink) + text(108, 123, name, 48, ink, 700)
        + wrapped(32, 191, REGIME_WEATHER_RATIONALES[regime], 27, p.secondary, 33)
        + line(32, 282, 528, 282, REGIME_HEX_COLORS[regime], 4), false, true);
    }
    for (const area of decisionAreaOrder) {
      const name = decisionAreaLabel(area);
      add(`area-${area}-glyph`, "areas", `${name} glyph`, `${name} operating area reference: the canonical area glyph beside its public label, in neutral ink.`, 400, 128,
        icon(<AreaIcon area={area} />, 24, 40, 48, p.ink) + text(94, 76, name, 32, p.ink, 600), false, false, true);
      add(`area-${area}-tile`, "areas", `${name} area tile`, `${name} reusable operating area tile, in neutral ink. This reference names the area without prescribing a current action.`, 560, 260,
        box(1, 1, 558, 258, p) + text(32, 44, "Operating area", 18, p.muted)
        + icon(<AreaIcon area={area} />, 32, 83, 56, p.ink) + text(112, 127, name, 44, p.ink, 700)
        + text(32, 210, "Action · pause line · resume line", 24, p.secondary), false, true);
    }
    for (const state of ["crossed", "near", "clear"] as const) {
      const ink = state === "clear" ? p.ink : p.line;
      const label = LINE_LABELS[state];
      add(`line-${state}-glyph`, "lines", `${label} glyph`, `${label} reference, pairing the canonical line state glyph with explicit words.`, 500, 128,
        icon(<LineStateIcon state={state} />, 24, 42, 44, ink) + text(92, 76, label, 30, ink, 600), false, false, true);
      const border = state === "crossed" ? p.lineMark : state === "clear" ? p.secondary : p.rule;
      add(`line-${state}-stamp`, "lines", `${label} stamp`, `${label} reusable line state template. Crossed and near use the line ink; clear uses neutral ink.`, 560, 160,
        `<rect x="1" y="1" width="558" height="158" rx="2" fill="${p.panel}" stroke="${border}" stroke-width="2"/>`
        + icon(<LineStateIcon state={state} />, 28, 33, 42, ink) + text(92, 65, label, 30, ink, 600)
        + text(28, 127, "Status label template", 20, p.muted), true, true);
    }
    const statusInputs = [
      ["live", {}],
      ["partly-cached", { degradedSourceCount: 1 }],
      ["cached", { isFallbackSnapshot: true }],
      ["historical", { isHistoricalSelection: true }],
    ] as const;
    for (const [id, input] of statusInputs) {
      const label = resolveDataStatusLabel(input);
      // The existing caveat is a diamond (feedback.css), not a line-state ring.
      const marker = id === "live" ? "" : `<rect x="32" y="43" width="12" height="12" transform="rotate(45 38 49)" fill="none" stroke="${p.ink}" stroke-width="2"/>`;
      add(`status-${id}`, "status", `${label} label`, `${label} status label template, shown in neutral ink. The caveat diamond qualifies cached and historical states; no current source health is asserted.`, 560, 144,
        box(1, 1, 558, 142, p, 2) + marker + text(id === "live" ? 28 : 62, 60, label, 30, p.ink, 600)
        + text(28, 113, "Status label template", 20, p.muted), true, true);
    }

    const planeWidth = 1400;
    let plane = header("The four conditions", planeWidth, p, "Condition reference template · quadrant meanings, without a reading");
    const quadrants: Array<[RegimeKey, number, number]> = [["EXPANSION", 100, 240], ["DEFENSIVE", 700, 240], ["VOLATILE", 100, 520], ["SCARCITY", 700, 520]];
    for (const [regime, x, y] of quadrants) {
      const ink = p.conditionInk[regime];
      plane += `<rect x="${x}" y="${y}" width="600" height="280" fill="${REGIME_HEX_COLORS[regime]}" fill-opacity="0.09"/>`
        + icon(<ConditionIcon regime={regime} />, x + 40, y + 40, 46, ink) + text(x + 106, y + 76, REGIME_LABELS[regime], 42, ink, 700)
        + wrapped(x + 40, y + 138, REGIME_WEATHER_RATIONALES[regime], 26, p.secondary, 36);
    }
    plane += line(700, 240, 700, 800, p.muted, 2, "8 8") + line(100, 520, 1300, 520, p.muted, 2, "8 8")
      + text(100, 225, "Willing investors", 20, p.muted) + text(100, 830, "Wary investors", 20, p.muted)
      + text(100, 874, "Cheap money", 22, p.secondary) + text(1300, 874, "Pricey money", 22, p.secondary, 400, "end")
      + text(700, 913, "Funding pressure →", 26, p.ink, 600, "middle")
      + `<text x="45" y="520" transform="rotate(-90 45 520)" text-anchor="middle" font-size="24" fill="${p.ink}">Risk appetite →</text>`
      + footer(planeWidth, 1040, p, "Quadrant reference; published calls also require persistence.");
    add("conditions-plane", "charts", "Four condition plane", "Condition reference template. Funding pressure increases to the right and risk appetite increases upward. Sunny is cheap money with willing investors; Cloudy is pricey money with willing investors; Stormy is cheap money with wary investors; Freezing is pricey money with wary investors. No current reading is plotted.", planeWidth, 1040, plane, true, true);

    let key = header("Conditions at a glance", 1400, p, "Reference template · four definitions, one vocabulary");
    REGIME_ORDER.forEach((regime, i) => {
      const y = 266 + i * 122;
      key += icon(<ConditionIcon regime={regime} />, 72, y - 36, 44, p.conditionInk[regime]) + text(140, y, REGIME_LABELS[regime], 36, p.conditionInk[regime], 600)
        + text(410, y, REGIME_WEATHER_RATIONALES[regime], 29, p.secondary) + line(72, y + 38, 1328, y + 38, p.rule);
    });
    add("conditions-key", "charts", "Condition definition key", "Reference template listing all four canonical conditions beside their weather glyphs and definitions; it states no current condition.", 1400, 840, key + footer(1400, 840, p, "Definitions describe money conditions; the weekly call supplies the action."), true, true);

    const rail = (y: number, label: string, reading: number, pause: number, resume: number, inverted = false) => {
      const xpos = (v: number) => 130 + (inverted ? 100 - v : v) * 9.4;
      let body = text(80, y - 150, label, 30, p.ink, 600) + line(130, y, 1070, y, p.secondary, 4);
      for (const v of [0, 20, 40, 60, 80, 100]) body += line(xpos(v), y - 6, xpos(v), y + 6, p.secondary) + text(xpos(v), y + 37, String(v), 19, p.muted, 400, "middle");
      body += line(xpos(pause), y - 45, xpos(pause), y + 8, p.lineMark, 3)
        + icon(<LineStateIcon state="crossed" />, xpos(pause) - 12, y - 79, 24, p.line)
        + text(xpos(pause) + 18, y - 93, `Pause ${pause}`, 23, p.line, 600)
        + line(xpos(resume), y - 45, xpos(resume), y + 8, p.secondary, 3)
        + icon(<LineStateIcon state="clear" />, xpos(resume) - 12, y - 79, 24, p.ink)
        + text(xpos(resume) - 18, y - 93, `Resume ${resume}`, 23, p.ink, 600, "end")
        + `<circle cx="${xpos(reading)}" cy="${y}" r="9" fill="${p.ink}" stroke="${p.bg}" stroke-width="3"/>`
        + text(xpos(reading), y + 78, `Example ${reading}`, 24, p.ink, 600, "middle");
      return body;
    };
    add("threshold-ladder", "charts", "Pause and resume ladder", "Illustrative threshold template on a 0–100 score scale. Example funding pressure is 72; pause above 70 and resume below 60. These values demonstrate layout and are not current guidance.", 1200, 700,
      header("Put the reading and both lines on one scale", 1200, p) + rail(396, "Funding pressure · scale 0–100", 72, 70, 60)
      + text(80, 555, "Illustrative rule: pause above 70; resume below 60.", 26, p.secondary)
      + footer(1200, 700, p, "Illustrative example only; use your agreed lines and cited reading."), true, true);
    add("paired-thresholds", "charts", "Two thresholds with the same orientation", "Illustrative paired threshold template on 0–100 scales. Funding pressure rises toward trouble: example 72, pause above 70, resume below 60. Risk appetite falls toward trouble: example 50, pause below 35, resume above 45. The lower scale is visibly reversed, so trouble sits on the right in both rows.", 1200, 1000,
      header("Keep trouble on the same side", 1200, p) + rail(380, "Funding pressure · higher is tighter", 72, 70, 60)
      + rail(700, "Risk appetite · lower is tighter · scale reversed", 50, 35, 45, true)
      + text(80, 850, "Illustrative rules · pressure rises; appetite falls.", 26, p.secondary)
      + footer(1200, 1000, p, "Both scales show 0–100; each keeps its own pause and resume lines."), true, true);

    const timelineStates: RegimeKey[] = ["SCARCITY", "DEFENSIVE", "DEFENSIVE", "VOLATILE", "EXPANSION", "EXPANSION"];
    let timeline = header("A condition timeline", 1400, p, "Illustrative example · a fictional sequence of six weeks");
    timelineStates.forEach((regime, i) => {
      const x = 80 + i * 207;
      timeline += `<rect x="${x}" y="276" width="207" height="78" fill="${REGIME_HEX_COLORS[regime]}"/>`
        + text(x + 103.5, 247, `Week ${i + 1}`, 24, p.muted, 400, "middle")
        + icon(<ConditionIcon regime={regime} />, x + 84, 393, 38, p.conditionInk[regime])
        + text(x + 103.5, 477, REGIME_LABELS[regime], 29, p.conditionInk[regime], 600, "middle");
    });
    add("condition-timeline", "charts", "Condition timeline template", "Illustrative timeline template with six fictional equal-width weeks: Freezing, Cloudy, Cloudy, Stormy, Sunny and Sunny. Weather glyphs and words accompany every color. It is not an archive or a current forecast.", 1400, 675, timeline + footer(1400, 675, p, "Fictional sequence to show the layout; no archived or forecast weeks."), true, true);

    const values = [22, 31, 28, 49, 61, 75];
    const trendX = (i: number) => 140 + i * 180;
    const trendY = (v: number) => 635 - v * 3.8;
    let trend = header("A reading against an agreed line", 1200, p);
    for (const value of [0, 25, 50, 75, 100]) trend += line(140, trendY(value), 1040, trendY(value), p.rule) + text(115, trendY(value) + 7, String(value), 20, p.muted, 400, "end");
    trend += line(140, trendY(70), 1040, trendY(70), p.lineMark, 2, "8 8") + text(1040, trendY(70) - 17, "Illustrative pause line 70", 24, p.line, 600, "end")
      + `<polyline points="${values.map((v, i) => `${trendX(i)},${trendY(v)}`).join(" ")}" fill="none" stroke="${p.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    values.forEach((v, i) => { trend += `<circle cx="${trendX(i)}" cy="${trendY(v)}" r="6" fill="${p.ink}"/>` + text(trendX(i), 674, `W${i + 1}`, 22, p.muted, 400, "middle"); });
    trend += text(140, 729, "Score domain 0–100 · six fictional readings", 25, p.secondary);
    add("signal-trend", "charts", "Signal trend with threshold", "Illustrative trend template on a labeled 0–100 score domain with six fictional readings: 22, 31, 28, 49, 61 and 75. A dashed pause line sits at 70. This is not a measured time series or current guidance.", 1200, 875, trend + footer(1200, 875, p, "Illustrative example only; retain the domain and source when replacing it."), true, true);

    let path = header("From signals to a shareable decision", 1600, p, "Process template · use the existing brief and export flows");
    const stages = [
      ["Read the signals", "Use the dated evidence.", "Check source readiness."],
      ["Name conditions", "Use the weekly call.", "Keep its exact wording."],
      ["Choose the action", "Use company constraints.", "Name the next step."],
      ["Set both lines", "Say when to pause.", "Say when to resume."],
      ["Share the artifact", "Carry the cited reading.", "Keep the decision visible."],
    ];
    stages.forEach(([title, first, second], i) => {
      const x = 64 + i * 300;
      path += box(x, 267, 272, 212, p) + text(x + 24, 317, title!, 27, p.ink, 600)
        + text(x + 24, 380, first!, 21, p.secondary) + text(x + 24, 419, second!, 21, p.secondary);
      if (i < stages.length - 1) path += arrow(x + 279, 373, x + 294, 373, p.muted);
    });
    path += text(64, 561, "Revisit when an agreed line is crossed or the evidence changes.", 30, p.ink, 600);
    add("decision-path", "diagrams", "Signals to decision path", "Process template: read dated signals, name the conditions using the weekly call, choose an action calibrated to company constraints, set pause and resume lines, and share the cited artifact. It contains no current recommendation.", 1600, 720, path + footer(1600, 720, p, "Signals → posture → decision → artifact"), true, true);

    let branches = header("Agree the pause and the way back", 1200, p);
    branches += box(350, 245, 500, 128, p) + text(600, 319, "Check the agreed lines", 34, p.ink, 600, "middle")
      + line(600, 373, 600, 414, p.muted) + line(303, 414, 897, 414, p.muted)
      + line(303, 414, 303, 465, p.muted) + line(897, 414, 897, 465, p.muted)
      + box(64, 465, 480, 230, p) + icon(<LineStateIcon state="crossed" />, 92, 497, 40, p.line)
      + text(151, 528, "Pause at the agreed line", 30, p.line, 600)
      + wrapped(92, 595, "[Write the action to hold and the condition that trips it.]", 25, p.secondary, 32)
      + box(656, 465, 480, 230, p) + icon(<LineStateIcon state="clear" />, 684, 497, 40, p.ink)
      + text(743, 528, "Resume when its line holds", 29, p.ink, 600)
      + wrapped(684, 595, "[Write what must be true before the action resumes.]", 25, p.secondary, 32);
    add("pause-resume-path", "diagrams", "Pause and resume decision path", "Blank bounded decision template with separate branches for the agreed pause condition and the resume condition. Pause uses the canonical pause glyph and line ink; resume uses the canonical play glyph and neutral ink. Placeholders contain no current guidance.", 1200, 850, branches + footer(1200, 850, p, "A pause and a resume can have different conditions."), true, true);

    let matrix = header("One operating rule per area", 1500, p, "Blank template · fill from the same cited brief");
    matrix += text(80, 254, "Area", 24, p.muted) + text(410, 254, DECISION_CONTRACT_LABELS.action.actionNow, 24, p.muted) + text(770, 254, "Pause when", 24, p.muted) + text(1130, 254, DECISION_CONTRACT_LABELS.reversal.resumeWhen, 24, p.muted);
    decisionAreaOrder.forEach((area, i) => {
      const y = 330 + i * 122;
      matrix += line(80, y - 41, 1420, y - 41, p.rule) + icon(<AreaIcon area={area} />, 80, y - 26, 32, p.ink)
        + text(130, y, decisionAreaLabel(area), 28, p.ink, 600)
        + text(410, y, "[Write the action]", 25, p.secondary) + text(770, y, "[Agreed pause line]", 25, p.secondary) + text(1130, y, "[Agreed resume line]", 25, p.secondary);
    });
    add("operating-rules", "frames", "Five area operating rules", "Blank operating rule template covering the five canonical areas: Hiring, Roadmap, Fundraising, Spending and New bets. Each row has placeholders for action, pause line and resume line. No advice or current reading is prefilled.", 1500, 1040, matrix + footer(1500, 1040, p), true, true);

    let delta = header("What changed in the decision", 1200, p);
    delta += text(80, 269, "Previous action", 25, p.muted) + text(650, 269, "This week’s action", 25, p.muted)
      + text(80, 342, "[Previous action]", 42, p.ink, 600) + text(650, 342, "[New action]", 42, p.ink, 600)
      + line(595, 243, 595, 430, p.rule) + line(80, 445, 1120, 445, p.rule)
      + text(80, 504, "Reason for the change", 24, p.muted) + text(80, 551, "[The signal or company constraint that changed]", 29, p.secondary)
      + text(80, 627, "Revisit when", 24, p.muted) + text(80, 674, "[The condition that would reverse this action]", 29, p.secondary);
    add("decision-delta", "frames", "Decision change comparison", "Blank decision delta template comparing a previous action and this week's action, with explicit placeholders for the reason and the reversal condition. It contains no current facts.", 1200, 850, delta + footer(1200, 850, p), true, true);

    let source = header("A compact source note", 1200, p);
    [["Reading", "[Metric and value]"], ["Data as of", "[Record date]"], ["Checked", "[Retrieval time]"], ["Source", "[Source name and direct link]"], ["Readiness", "[Live, cached or historical; any limit]"]].forEach(([label, value], i) => {
      const y = 267 + i * 70;
      source += text(80, y, label!, 24, p.muted) + text(310, y, value!, 27, p.secondary) + line(80, y + 24, 1120, y + 24, p.rule);
    });
    add("source-note", "frames", "Citable source note", "Blank compact provenance template with placeholders for the reading, record date, retrieval time, source and readiness caveat. It asserts no actual source health or current values.", 1200, 750, source + footer(1200, 750, p, "Keep the record date distinct from the time a source was checked."), true, true);

    for (const [format, width, height] of [["square", 1080, 1080], ["landscape", 1600, 900], ["portrait", 1080, 1350]] as const) {
      const left = 64;
      let frame = header("[The weekly call]", width, p, "Blank share template · replace every placeholder");
      const wide = format === "landscape";
      const col = wide ? 736 : left;
      const first = 282;
      frame += text(left, first, "What changed", 24, p.muted) + text(left, first + 58, "[Decision delta]", 44, p.ink, 600)
        + text(wide ? col : left, wide ? first : first + 168, DECISION_CONTRACT_LABELS.action.actionNow, 24, p.muted)
        + text(wide ? col : left, wide ? first + 58 : first + 226, "[Bounded next action]", wide ? 40 : 42, p.ink, 600);
      const lineY = wide ? 510 : 655;
      frame += line(left, lineY - 45, width - left, lineY - 45, p.rule)
        + icon(<LineStateIcon state="crossed" />, left, lineY, 32, p.line) + text(left + 49, lineY + 26, "Pause when", 28, p.line, 600)
        + text(left, lineY + 82, "[Agreed pause condition]", 32, p.secondary)
        + icon(<LineStateIcon state="clear" />, wide ? col : left, wide ? lineY : lineY + 156, 32, p.ink)
        + text((wide ? col : left) + 49, wide ? lineY + 26 : lineY + 182, DECISION_CONTRACT_LABELS.reversal.resumeWhen, 28, p.ink, 600)
        + text(wide ? col : left, wide ? lineY + 82 : lineY + 238, "[Agreed resume condition]", 32, p.secondary);
      if (format === "portrait") frame += line(left, 1010, width - left, 1010, p.rule) + text(left, 1073, "Company constraints", 24, p.muted) + text(left, 1130, "[Cash, stage and runway]", 34, p.secondary);
      frame += footer(width, height, p, "[Source] · [Record date] · [Readiness]");
      add(`share-frame-${format}`, "frames", `${format.charAt(0).toUpperCase()}${format.slice(1)} share frame`, `Blank ${format} share template with editable placeholders for the weekly call, decision delta, action, pause condition, resume condition and source note. It contains no current recommendation.`, width, height, frame, true, true);
    }

    add("decision-reveal", "motion", "Decision reveal end state", "Static end state for the motion template, with placeholders for a bounded action and its reversal. The standalone HTML applies one short entrance, skipped entirely when reduced motion is requested.", 1200, 675,
      header("[A decision worth sharing]", 1200, p, "Template · one short entrance; immediate end state with reduced motion")
      + box(64, 247, 1072, 260, p) + text(100, 312, DECISION_CONTRACT_LABELS.action.actionNow, 24, p.muted)
      + text(100, 377, "[Write the bounded action]", 44, p.ink, 600)
      + text(100, 451, "Revisit when [the agreed reversal condition holds].", 29, p.secondary)
      + footer(1200, 675, p, "Static information remains readable when animation is unavailable."), true, true);
  }
  return assets;
}

/** Standalone HTML: no JavaScript, remote requests, auto loops or data claims. */
export function buildVisualAssetMotionExample(theme: AssetTheme) {
  const p = VISUAL_ASSET_THEMES[theme];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="${theme}"><title>Whether · decision reveal template</title>
<style>body{margin:0;padding:clamp(16px,4vw,64px);background:${p.bg};color:${p.ink};font:18px/1.5 Archivo,Arial,sans-serif}main{max-width:1200px;margin:auto}h1{font-size:clamp(24px,3vw,40px)}p{color:${p.secondary}}figure{margin:32px 0;animation:enter 180ms ease-out both}img{display:block;width:100%;height:auto}a{display:inline-flex;align-items:center;min-height:44px;color:inherit;touch-action:manipulation}a:focus-visible{outline:3px solid currentColor;outline-offset:4px}@keyframes enter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion: reduce){figure{animation:none;opacity:1;transform:none}}</style></head>
<body><main><h1>Decision reveal · Template</h1><p>One 180ms entrance using opacity and transform. Reduced motion shows the finished artifact immediately. Reload to preview again.</p><figure><img src="decision-reveal.svg" width="1200" height="675" alt="Blank decision template with an action placeholder and an explicit reversal condition."></figure><a href="decision-reveal.svg" download>Download editable SVG</a><p><a href="../index.html">Back to the visual asset library</a></p></main></body></html>
`;
}

/** All links are relative so the gallery also works from a local folder. */
export function buildVisualAssetGallery(assets: VisualAsset[]) {
  const groups: VisualAsset["group"][] = ["conditions", "areas", "lines", "status", "charts", "diagrams", "frames", "motion"];
  const themeSections = (["dark", "light"] as const).map((theme) => {
    const p = VISUAL_ASSET_THEMES[theme];
    const sections = groups.map((group) => {
      const items = assets.filter((asset) => asset.theme === theme && asset.group === group);
      return `<section aria-labelledby="${theme}-${group}"><h3 id="${theme}-${group}">${group.charAt(0).toUpperCase()}${group.slice(1)}</h3><div class="grid">${items.map((asset) => `<article><div class="preview" style="background:${p.bg}"><img src="${theme}/${asset.id}.svg" width="${asset.width}" height="${asset.height}" alt="${xml(asset.alt)}" loading="lazy"></div><h4>${xml(asset.title)}</h4><p class="meta">${asset.width} × ${asset.height}${asset.example ? " · Template" : " · Reference"}</p><div class="downloads"><a href="${theme}/${asset.id}.svg" download>SVG</a>${asset.rasterize ? `<a href="${theme}/${asset.id}.png" download>PNG</a>` : ""}${asset.group === "motion" ? `<a href="${theme}/motion-example.html">Preview motion</a>` : ""}</div></article>`).join("")}</div></section>`;
    }).join("");
    return `<section class="theme" id="${theme}" style="--ground:${p.bg};--panel:${p.panel};--ink:${p.ink};--muted:${p.muted};--rule:${p.rule};color-scheme:${theme}"><h2>${theme === "dark" ? "Dark" : "Light"} assets</h2>${sections}</section>`;
  }).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>Whether · reusable visual assets</title>
<style>@font-face{font-family:Archivo;src:url('../fonts/og/archivo-400.ttf') format('truetype');font-weight:400;font-display:swap}@font-face{font-family:Archivo;src:url('../fonts/og/archivo-600.ttf') format('truetype');font-weight:600;font-display:swap}*{box-sizing:border-box}body{margin:0;background:#f1f4f3;color:#121719;font:16px/1.5 Archivo,Arial,sans-serif}header,main>p{padding:24px clamp(20px,4vw,64px)}header{max-width:1100px}h1{font-size:clamp(32px,5vw,60px);line-height:1.1;letter-spacing:-.03em;margin:20px 0}h2{font-size:36px;margin:0 0 36px}h3{font-size:28px;margin:48px 0 20px}h4{font-size:19px;margin:16px 20px 0}p{max-width:74ch}nav,.downloads{display:flex;flex-wrap:wrap;gap:8px 20px}a{color:inherit;display:inline-flex;align-items:center;min-height:44px;text-underline-offset:4px;touch-action:manipulation}a:focus-visible{outline:3px solid currentColor;outline-offset:4px}.theme{padding:48px clamp(20px,4vw,64px);background:var(--ground);color:var(--ink)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:24px}article{min-width:0;background:var(--panel);border:1px solid var(--rule);border-radius:10px;overflow:hidden}.preview{height:250px;padding:16px;display:flex;align-items:center;justify-content:center}img{display:block;max-width:100%;max-height:100%;width:auto;height:auto}.meta{color:var(--muted);font-size:14px;margin:6px 20px}.downloads{padding:0 20px 16px}.downloads a{font-weight:600}footer{padding:32px clamp(20px,4vw,64px)}@media print{.theme{break-before:page}.grid{grid-template-columns:repeat(3,1fr)}article{break-inside:avoid}.preview{height:180px}}</style></head>
<body><header><p>Whether · reusable visual assets</p><h1>Keep the decision visible.</h1><p>Editable SVG references, blank frames and clearly marked illustrative templates in both themes. Download a vector to edit, or use a PNG where available. These assets contain no live readings or current advice.</p><nav aria-label="Asset library"><a href="#dark">Dark assets</a><a href="#light">Light assets</a><a href="manifest.json" download>Manifest JSON</a><a href="contact-sheet-dark.png" download>Dark contact sheet</a><a href="contact-sheet-light.png" download>Light contact sheet</a></nav></header><main>${themeSections}</main><footer><p>SVG text is editable. Install Archivo or use the repository’s public/fonts/og instances for an exact match; PNGs use the bundled fonts. Transparent glyphs are paired with their words and should sit on the matching theme ground. Examples and frames keep their Template label until replaced with a dated, cited reading.</p><p>Generated offline with bun scripts/generate-visual-assets.tsx. Core glyphs use the same mappings as the site; the owner’s mark is unchanged.</p></footer></body></html>
`;
}
