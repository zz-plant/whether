#!/usr/bin/env bun
/** Offline visual kit. Requires rsvg-convert (Homebrew librsvg), as assets:generate does. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildVisualAssetGallery, buildVisualAssetMotionExample, createVisualAssets, VISUAL_ASSET_THEMES } from "../lib/image/visualAssetKit";

const root = join(import.meta.dirname, "..");
const output = join(root, "public", "visual-assets");
const check = process.argv.includes("--check");
const assets = createVisualAssets();
const temp = mkdtempSync(join(tmpdir(), "whether-visual-assets-"));
const fonts = join(temp, "fonts.conf");
const xml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

writeFileSync(fonts, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${xml(join(root, "public/fonts/og"))}</dir><cachedir>${xml(join(temp, "font-cache"))}</cachedir></fontconfig>`);
const env = { ...process.env, FONTCONFIG_FILE: fonts };
const mismatches: string[] = [];
let fileCount = 0;

function emit(path: string, data: string | Buffer) {
  const destination = join(output, path);
  const bytes = typeof data === "string" ? Buffer.from(data) : data;
  const unchanged = existsSync(destination) && readFileSync(destination).equals(bytes);
  if (!unchanged) {
    if (check) mismatches.push(path);
    else {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, bytes);
    }
  }
  fileCount++;
}

function png(svg: string) {
  return execFileSync("rsvg-convert", ["--format", "png"], { input: svg, env, maxBuffer: 32 * 1024 * 1024 });
}

try {
  for (const asset of assets) {
    emit(`${asset.theme}/${asset.id}.svg`, asset.svg);
    if (asset.rasterize) emit(`${asset.theme}/${asset.id}.png`, png(asset.svg));
  }
  for (const theme of ["dark", "light"] as const) {
    emit(`${theme}/motion-example.html`, buildVisualAssetMotionExample(theme));
    const p = VISUAL_ASSET_THEMES[theme];
    const selected = assets.filter((asset) => asset.theme === theme);
    const columns = 4;
    const cellWidth = 360;
    const cellHeight = 300;
    const width = 1504;
    const height = 178 + Math.ceil(selected.length / columns) * cellHeight;
    const cells = selected.map((asset, i) => {
      const x = 32 + (i % columns) * cellWidth;
      const y = 150 + Math.floor(i / columns) * cellHeight;
      // Nest the vector body, rather than linking files, so the sheet is portable.
      const body = asset.svg.slice(asset.svg.indexOf(">") + 1, asset.svg.lastIndexOf("</svg>"));
      return `<rect x="${x}" y="${y}" width="344" height="278" rx="8" fill="${p.panel}" stroke="${p.rule}"/>
<svg x="${x + 12}" y="${y + 12}" width="320" height="210" viewBox="0 0 ${asset.width} ${asset.height}" preserveAspectRatio="xMidYMid meet">${body}</svg>
<text x="${x + 16}" y="${y + 250}" font-size="17" font-weight="600" fill="${p.ink}">${xml(asset.title)}</text>`;
    }).join("\n");
    const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>Whether ${theme} visual asset contact sheet</title><desc>All ${selected.length} ${theme} visual references and illustrative templates. No current readings or recommendations.</desc><rect width="100%" height="100%" fill="${p.bg}"/><g font-family="Archivo, Arial, sans-serif"><text x="32" y="62" font-size="36" font-weight="700" fill="${p.ink}">Whether · ${theme} visual assets</text><text x="32" y="108" font-size="23" fill="${p.muted}">${selected.length} reusable references and templates · no current readings</text>${cells}</g></svg>\n`;
    emit(`contact-sheet-${theme}.svg`, sheet);
    emit(`contact-sheet-${theme}.png`, png(sheet));
  }
  emit("index.html", buildVisualAssetGallery(assets));
  const manifest = {
    version: 1,
    generator: "bun scripts/generate-visual-assets.tsx",
    gallery: "index.html",
    font: { family: "Archivo", editableSvg: true, svgFallback: "Arial, sans-serif", rasterFontSource: "public/fonts/og", note: "SVG text stays editable. Install Archivo for an exact match in another application. PNGs use the bundled font instances." },
    usage: "References define concepts. Templates are visibly illustrative and contain no current readings or advice. Replace placeholder material with a cited, dated reading before using it as a decision artifact. Keep glyphs paired with their words.",
    sourceOfTruth: ["lib/regimePresentation.ts", "lib/regimePhaseSpace.ts", "lib/report/boundedDecisionRules.ts", "lib/report/operatingCalls.ts", "lib/report/trustStatus.ts", "lib/image/ogTheme.ts", "app/styles/tokens.css"],
    themes: ["dark", "light"],
    groups: [...new Set(assets.map((asset) => asset.group))],
    assetCount: assets.length,
    svgCount: assets.length,
    pngCount: assets.filter((asset) => asset.rasterize).length,
    contactSheets: ["dark", "light"].map((theme) => ({ theme, svg: `contact-sheet-${theme}.svg`, png: `contact-sheet-${theme}.png` })),
    motionExamples: ["dark", "light"].map((theme) => ({ theme, html: `${theme}/motion-example.html` })),
    assets: assets.map(({ svg: _svg, rasterize, ...asset }) => ({ ...asset, files: { svg: `${asset.theme}/${asset.id}.svg`, ...(rasterize ? { png: `${asset.theme}/${asset.id}.png` } : {}) } })),
  };
  emit("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  if (mismatches.length) {
    console.error(`Visual assets differ from the generator (${mismatches.length} files):\n${mismatches.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`${check ? "Verified" : "Generated"} ${assets.length} assets (${manifest.svgCount} SVG, ${manifest.pngCount} PNG), 2 contact sheets and 2 motion examples; ${fileCount} files total.`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
