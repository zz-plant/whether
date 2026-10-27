#!/usr/bin/env bun
/**
 * generate-scenes.ts — renders the brand kit in docs/assets: social cards, a
 * badge, a header and small icons, every one sized to the spec in
 * scripts/check-assets.ts. Nothing on the site reads these; they are for
 * listings, profiles and posts that link to Whether.
 *
 * Usage: bun run assets:generate [--dry-run]
 *
 * Each scene is drawn here, from the same parts, rather than by scaling one
 * picture into every frame: a 64px favicon and a 1920×400 header need different
 * layouts, and the old single-source scaling left the art a fifth of the frame
 * in one corner. The parts are the site's own:
 *
 * - the mark is the one the site header draws (app/components/globalHeaderRouteGate.tsx),
 *   in its colour. The mark is the owner's decision (docs/feature-specs-current.md
 *   §1.1.69), so it is copied, not redesigned;
 * - the ground, ink and condition colours come from lib/image/ogTheme.ts and
 *   lib/regimePhaseSpace.ts, the palette the share cards use;
 * - the words are the site footer's description, set in Archivo from
 *   public/fonts/og, the static instances the OG cards render with.
 *
 * source.svg is written too: the lockup on its ground, as the design reference
 * check-assets.ts requires.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OG_BG, OG_TEXT, OG_TEXT_MUTED, OG_TEXT_SECONDARY } from "../lib/image/ogTheme";
import { REGIME_HEX_COLORS } from "../lib/regimePhaseSpace";
import { REGIME_ORDER } from "../lib/regimePresentation";

const ROOT = join(import.meta.dirname, "..");
const ASSETS_DIR = join(ROOT, "docs", "assets");
const FONTS_DIR = join(ROOT, "public", "fonts", "og");

/** Tailwind sky-400: the header mark's `text-sky-400`. */
const MARK_COLOR = "#38bdf8";
const DESCRIPTION = "The interest-rate and credit lines that pause or resume your hiring, spend and raise.";
const DESCRIPTION_TWO_LINES = [
  "The interest-rate and credit lines that pause",
  "or resume your hiring, spend and raise.",
];

/** `mark` is the icon alone, `lockup` adds the name, `card` adds the description and the condition strip. */
type Layout = "mark" | "lockup" | "card";
type SceneSpec = { width: number; height: number; layout: Layout };

const SCENES: Record<string, SceneSpec> = {
  badge: { width: 240, height: 96, layout: "lockup" },
  blur: { width: 50, height: 28, layout: "mark" },
  card: { width: 400, height: 300, layout: "lockup" },
  circle: { width: 540, height: 540, layout: "lockup" },
  dark: { width: 960, height: 540, layout: "card" },
  demo: { width: 720, height: 405, layout: "card" },
  email: { width: 600, height: 200, layout: "lockup" },
  favicon: { width: 64, height: 64, layout: "mark" },
  github: { width: 1280, height: 640, layout: "card" },
  header: { width: 1920, height: 400, layout: "card" },
  mastodon: { width: 1200, height: 600, layout: "card" },
  og: { width: 1200, height: 675, layout: "card" },
  square: { width: 1080, height: 1080, layout: "lockup" },
  touch: { width: 360, height: 360, layout: "lockup" },
  unfurl: { width: 1200, height: 628, layout: "card" },
};

const DISPLAY_FONT = `font-family="Archivo" font-weight="700" font-stretch="semi-condensed"`;
const BODY_FONT = `font-family="Archivo" font-weight="400"`;
/** Archivo semi-condensed bold sets "Whether" about 3.55em wide; used to centre the lockup. */
const WORDMARK_EM_WIDTH = 3.55;

/** The header mark, drawn on its own 24-unit grid and placed at `size` px. */
function mark(x: number, y: number, size: number): string {
  const s = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${MARK_COLOR}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 14c3-5 6-5 9 0s6 5 9 0"/>
    <circle cx="5" cy="11" r="1.5" fill="${MARK_COLOR}"/>
    <circle cx="19" cy="11" r="1.5" fill="${MARK_COLOR}"/>
  </g>`;
}

function wordmark(x: number, baseline: number, size: number, anchor: "start" | "middle" = "start"): string {
  return `<text x="${x}" y="${baseline}" ${DISPLAY_FONT} font-size="${size}" fill="${OG_TEXT}" text-anchor="${anchor}" letter-spacing="${-size * 0.01}">Whether</text>`;
}

/** One band per condition, in the record's order, as the conditions-by-month strip draws them. */
function conditionStrip(y: number, width: number, height: number): string {
  const segment = width / REGIME_ORDER.length;
  return REGIME_ORDER.map((key, i) =>
    `<rect x="${i * segment}" y="${y}" width="${segment}" height="${height}" fill="${REGIME_HEX_COLORS[key]}"/>`,
  ).join("");
}

function sceneBody({ width, height, layout }: SceneSpec): string {
  if (layout === "mark") {
    const size = Math.min(width, height) * 0.86;
    return mark((width - size) / 2, (height - size) / 2, size);
  }

  if (layout === "lockup") {
    const stacked = width / height < 1.5;
    if (stacked) {
      const markSize = Math.min(width, height) * 0.34;
      const fontSize = markSize * 0.62;
      const top = (height - markSize - fontSize * 1.1) / 2;
      return mark((width - markSize) / 2, top, markSize)
        + wordmark(width / 2, top + markSize + fontSize * 0.95, fontSize, "middle");
    }
    const fontSize = height * 0.36;
    const markSize = fontSize * 1.15;
    const gap = fontSize * 0.3;
    const left = (width - (markSize + gap + fontSize * WORDMARK_EM_WIDTH)) / 2;
    return mark(left, (height - markSize) / 2 - fontSize * 0.04, markSize)
      + wordmark(left + markSize + gap, height / 2 + fontSize * 0.36, fontSize);
  }

  // card: the lockup top left, the description below it, the address and the strip along the foot.
  const s = Math.min(width / 1200, height / 675);
  const pad = Math.round(Math.min(width, height) * 0.1);
  const nameSize = 92 * s;
  const markSize = nameSize * 1.15;
  const bodySize = 50 * s;
  const stripHeight = Math.max(4, Math.round(12 * s));
  const lines = width / height > 3 ? [DESCRIPTION] : DESCRIPTION_TWO_LINES;
  const bodyTop = pad + markSize + bodySize * 2.1;
  const body = lines.map((line, i) =>
    `<text x="${pad}" y="${bodyTop + i * bodySize * 1.3}" ${BODY_FONT} font-size="${bodySize}" fill="${OG_TEXT_SECONDARY}">${line}</text>`,
  ).join("");
  return mark(pad, pad - nameSize * 0.06, markSize)
    + wordmark(pad + markSize + nameSize * 0.3, pad + markSize * 0.72, nameSize)
    + body
    + `<text x="${pad}" y="${height - stripHeight - pad * 0.6}" ${BODY_FONT} font-size="${30 * s}" fill="${OG_TEXT_MUTED}">whether.work</text>`
    + conditionStrip(height - stripHeight, width, stripHeight);
}

function sceneSvg(spec: SceneSpec): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}">
  <rect width="100%" height="100%" fill="${OG_BG}"/>
  ${sceneBody(spec)}
</svg>
`;
}

/** rsvg-convert finds fonts through fontconfig, so point it at the repo's Archivo instances first. */
function fontconfigFile(dir: string): string {
  const path = join(dir, "fonts.conf");
  writeFileSync(path, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${FONTS_DIR}</dir>
  <cachedir>${join(dir, "cache")}</cachedir>
</fontconfig>
`);
  return path;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const work = mkdtempSync(join(tmpdir(), "whether-scenes-"));
  const env = { ...process.env, FONTCONFIG_FILE: fontconfigFile(work) };
  let failures = 0;

  try {
    const reference = sceneSvg({ width: 400, height: 200, layout: "lockup" });
    if (!dryRun) writeFileSync(join(ASSETS_DIR, "source.svg"), reference.replace("<svg ", `<svg role="img" aria-label="Whether" `));

    for (const [scene, spec] of Object.entries(SCENES)) {
      const outPath = join(ASSETS_DIR, `whether-${scene}.png`);
      if (dryRun) {
        console.log(`  [dry] ${scene}: ${spec.width}×${spec.height} ${spec.layout}`);
        continue;
      }
      const svgPath = join(work, `${scene}.svg`);
      writeFileSync(svgPath, sceneSvg(spec));
      try {
        execFileSync("rsvg-convert", ["-w", String(spec.width), "-h", String(spec.height), "-o", outPath, svgPath], {
          env,
          stdio: "pipe",
          timeout: 10_000,
        });
        console.log(`  ✅ ${scene}: ${spec.width}×${spec.height} ${statSync(outPath).size.toLocaleString()}B`);
      } catch (error) {
        console.error(`  ❌ ${scene}: ${error instanceof Error ? error.message : String(error)}`);
        failures++;
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  if (failures > 0) process.exit(1);
}

main();
