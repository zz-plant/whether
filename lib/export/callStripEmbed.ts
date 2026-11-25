/**
 * The embed (`/embed/call-strip`): this week's guidance as a whole document for a
 * frame, the address a Notion or Coda embed block, a wiki, or any oEmbed consumer
 * (`/api/oembed`, `lib/export/oembed.ts`) loads. It updates whenever the brief does,
 * so a weekly agenda that embeds it never carries last Monday's screenshot.
 *
 * It prints what a meeting needs from the brief and nothing else: the conditions,
 * the guidance, each area's action with the one line that can change it, the line
 * where conditions change (and the market move that crosses it), the reading's date,
 * and a link out to the brief. Every string comes from the brief document
 * (`buildBriefDocument`) and the weekly call the homepage prints; nothing here
 * rewords them.
 *
 * Hand-written HTML rather than React: the route is a route handler, outside the
 * root layout's header, nav and footer, and `react-dom/server` refuses to load in
 * the server-components environment route handlers run in. The palette is the
 * token roles mirrored in `lib/image/ogTheme.ts`, in both themes.
 */
import type { HomePageAssembly } from "../report/home/contracts";
import { briefArtifactOf, briefSourceFromReportData, buildBriefDocument } from "../report/briefDocument";
import { resolveSharedBriefUrl } from "../report/briefArtifact";
import { areaRuleLine } from "../report/operatingCalls";
import { weeklyCallChangeLines } from "../report/weeklyCallContract";
import { buildFlipProximity } from "../report/flipProximity";
import { REGIME_ORDER } from "../regimePresentation";
import type { RegimeKey } from "../types";
import { siteUrl } from "../siteUrl";
import {
  OG_CONDITION_INK,
  OG_CONDITION_INK_LIGHT,
  OG_SKY_PAPER,
} from "../image/ogTheme";
import { CALL_STRIP_EMBED_TITLE, type EmbedTheme } from "./oembed";

type Line = { label: string; value: string };

type CallStripEmbedModel = {
  regime: RegimeKey;
  regimeLabel: string;
  guidance: string;
  areas: ReadonlyArray<{ label: string; action: string; line: Line & { held: boolean } }>;
  /** "Conditions change if", and a stage's "Restart when" when one is set (`weeklyCallChangeLines`). */
  changeLines: readonly Line[];
  /** The change line in the market's units (`buildFlipProximity`); none on a held week. */
  marketMoves: readonly string[];
  recordDateLabel: string;
  checkedLabel: string;
  source: string;
  isFallback: boolean;
  briefUrl: string;
};

/** What the embed prints, from the assembled homepage the read path serves. */
export const buildCallStripEmbedModel = (homepage: HomePageAssembly): CallStripEmbedModel => {
  const reportData = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
  const document = buildBriefDocument(briefSourceFromReportData(reportData), homepage.weeklyCall);
  const scores = reportData.assessment.scores;

  return {
    regime: reportData.assessment.regime,
    regimeLabel: document.regimeLabel,
    guidance: document.call,
    areas: document.areaRows.map((item) => ({
      label: item.label,
      action: item.areaActionNow,
      line: areaRuleLine(item, scores),
    })),
    changeLines: weeklyCallChangeLines(homepage.weeklyCall),
    marketMoves: buildFlipProximity(reportData.assessment).map((move) => move.sentence),
    recordDateLabel: document.recordDateLabel,
    checkedLabel: homepage.reportShell.fetchedAtLabel,
    source: document.source,
    isFallback: document.isFallback === true,
    /* The dated brief when the archive has one, marked as a share: a reader who opens it
       from someone's agenda arrived from a teammate's paste (`resolveSharedBriefUrl`). */
    briefUrl: resolveSharedBriefUrl(briefArtifactOf(document), siteUrl),
  };
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const REGIME_KEYS = REGIME_ORDER;

const light = OG_SKY_PAPER.light;
const dark = OG_SKY_PAPER.dark;
/* The page is the theme's panel (paper): the frame sits in somebody else's doc, so it
   brings its own ground rather than showing theirs through a transparent body. */
const themeVars = (paper: typeof light | typeof dark, scheme: "light" | "dark") =>
  `color-scheme:${scheme};--panel:${paper.panel};--rule:${paper.border};--ink:${paper.text};--ink-2:${paper.secondary};--muted:${paper.muted};--crossed:${paper.crossed};--regime-ink:var(--regime-ink-${scheme})`;
const LIGHT_VARS = themeVars(light, "light");
const DARK_VARS = themeVars(dark, "dark");

/*
 * Light is the base, as on the site; the device setting picks dark when the embedder
 * pinned no theme, and `data-theme` pins either. Colour carries the conditions (the
 * regime ink) and a line's state (the crossed ink) and nothing else.
 */
const STYLESHEET = [
  `:root{${LIGHT_VARS}}`,
  `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK_VARS}}}`,
  `:root[data-theme="dark"]{${DARK_VARS}}`,
  ...REGIME_KEYS.map(
    (key) => `:root[data-regime="${key}"]{--regime-ink-light:${OG_CONDITION_INK_LIGHT[key]};--regime-ink-dark:${OG_CONDITION_INK[key]}}`,
  ),
  `:root:not([data-regime]){--regime-ink-light:var(--ink);--regime-ink-dark:var(--ink)}`,
  "*{box-sizing:border-box}",
  "html,body{margin:0;background:var(--panel);color:var(--ink)}",
  `body{font:14px/1.45 "Source Sans 3",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-text-size-adjust:100%}`,
  "main{display:flex;flex-direction:column;gap:12px;padding:16px;max-width:760px}",
  "p,h1,ul,dl,dd{margin:0}",
  ".head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px}",
  ".conditions{font-size:13px;color:var(--muted)}",
  ".regime{font-size:17px;font-weight:700;color:var(--regime-ink)}",
  ".fresh{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}",
  "h1{font-size:17px;line-height:1.35;font-weight:600;text-wrap:pretty}",
  ".areas{list-style:none;padding:0;display:grid;border-top:1px solid var(--rule)}",
  ".areas li{display:grid;grid-template-columns:7rem minmax(0,1fr);gap:2px 12px;padding:8px 0;border-bottom:1px solid var(--rule)}",
  ".area{font-weight:600}",
  ".line{grid-column:2;font-size:13px;color:var(--ink-2)}",
  ".line-label{font-weight:600;color:var(--muted)}",
  ".held .line-label{color:var(--crossed)}",
  "@media (max-width:420px){.areas li{grid-template-columns:minmax(0,1fr)}.line{grid-column:1}}",
  ".change{display:grid;gap:4px}",
  "dt{display:inline;font-weight:600}",
  "dd{display:inline;margin-left:4px}",
  ".move{display:block;font-size:13px;color:var(--ink-2)}",
  ".foot{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px;font-size:12px;color:var(--muted)}",
  "a{color:var(--ink);font-weight:600;text-underline-offset:2px}",
  "a:focus-visible{outline:2px solid var(--ink);outline-offset:2px}",
].join("\n");

const renderAreas = (areas: CallStripEmbedModel["areas"]) =>
  areas.length === 0
    ? ""
    : `<ul class="areas">${areas
      .map(
        (area) =>
          `<li${area.line.held ? ' class="held"' : ""}><span class="area">${escapeHtml(area.label)}</span><span>${escapeHtml(area.action)}</span><span class="line"><span class="line-label">${escapeHtml(area.line.label)}:</span> ${escapeHtml(area.line.value)}</span></li>`,
      )
      .join("")}</ul>`;

const renderChange = (model: CallStripEmbedModel) =>
  model.changeLines.length === 0
    ? ""
    : `<dl class="change">${model.changeLines
      .map(
        (line, index) =>
          `<div><dt>${escapeHtml(line.label)}:</dt><dd>${escapeHtml(line.value)}${
            index === 0 ? model.marketMoves.map((move) => `<span class="move">${escapeHtml(move)}</span>`).join("") : ""
          }</dd></div>`,
      )
      .join("")}</dl>`;

const documentHead = (theme: EmbedTheme) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="${theme === "auto" ? "light dark" : theme}">
<title>${escapeHtml(CALL_STRIP_EMBED_TITLE)}</title>
<base target="_blank">
<style>${STYLESHEET}</style>`;

const themeAttribute = (theme: EmbedTheme) => (theme === "auto" ? "" : ` data-theme="${theme}"`);

/**
 * The whole document. One `<main>`, no skip link (nothing precedes the content to skip),
 * and every link opens outside the frame: a brief read inside somebody's doc should not
 * navigate their doc away.
 */
export const renderCallStripEmbedDocument = (model: CallStripEmbedModel, { theme }: { theme: EmbedTheme }): string => {
  const freshness = [
    `Checked ${model.checkedLabel}`,
    `Source: ${model.source}`,
    ...(model.isFallback ? ["Saved copy, not a live reading"] : []),
  ].join(" · ");

  return `<!doctype html>
<html lang="en"${themeAttribute(theme)} data-regime="${model.regime}">
<head>
${documentHead(theme)}
</head>
<body>
<main id="main-content">
<div class="head"><p class="conditions">Conditions <strong class="regime">${escapeHtml(model.regimeLabel)}</strong></p><p class="fresh">Data as of ${escapeHtml(model.recordDateLabel)}</p></div>
<h1>${escapeHtml(model.guidance)}</h1>
${renderAreas(model.areas)}
${renderChange(model)}
<div class="foot"><p>${escapeHtml(freshness)}</p><a href="${escapeHtml(model.briefUrl)}" target="_blank" rel="noopener">This week's brief on Whether →</a></div>
</main>
</body>
</html>`;
};

/** What a frame shows when the read failed outright: the same frame, a sentence, and the way out. */
export const renderCallStripEmbedUnavailable = ({ theme }: { theme: EmbedTheme }): string => `<!doctype html>
<html lang="en"${themeAttribute(theme)}>
<head>
${documentHead(theme)}
</head>
<body>
<main id="main-content">
<h1>This week's guidance could not be read just now.</h1>
<div class="foot"><p>The frame tries again each time the page opens.</p><a href="${escapeHtml(`${siteUrl}/`)}" target="_blank" rel="noopener">Open the brief on Whether →</a></div>
</main>
</body>
</html>`;
