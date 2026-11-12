/**
 * Build static TTF instances of the self-hosted faces for the OG image routes.
 *
 * Two constraints drive this: satori (next/og ImageResponse) reads TTF/OTF/WOFF
 * but not woff2, and its parser rejects variable fonts (fvar table) -- which the
 * site's files in public/fonts are. So each face is decompressed from woff2 and then
 * pinned to one point on every axis with fontTools. The cards speak in the site's
 * two voices (Forecast, 2026-11-12): Bricolage Grotesque for the call at 700 and
 * the condition word at 800, both at optical size 48 (the cards set them at 40 to
 * 62px), and Source Sans 3 for the text at 400 and 600. Until then they were
 * Archivo, in semi-condensed, normal and expanded instances.
 *
 * The sources are the site's own subset files, so a card can draw exactly what a
 * page can (app/styles/fonts.css records their range).
 *
 * Requires python3 with fonttools (`pip install fonttools`). Run manually when a
 * face in public/fonts changes:
 *   node scripts/generate-og-fonts.mjs
 *
 * Output is committed (public/fonts/og/*.ttf) -- the OG route fetches these
 * at runtime and must not depend on a build step.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import wawoff2 from "wawoff2";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "public", "fonts");
const outDir = path.join(root, "public", "fonts", "og");

const DISPLAY = "bricolage-grotesque-variable.41784463.woff2";
const TEXT = "source-sans-3-variable.45c48165.woff2";

/* Each instance is renamed for what it is. Pinned without that, it kept the variable
   file's default names ("Bricolage Grotesque 96pt ExtraBold" at 700, "Source Sans 3
   ExtraLight" at 400), which is what fontconfig matches when rsvg-convert draws the
   brand kit and the asset kit from these files. */
const faces = [
  { file: DISPLAY, out: "bricolage-grotesque-700.ttf", axes: { wght: 700, opsz: 48 }, family: "Bricolage Grotesque", style: "Bold" },
  { file: DISPLAY, out: "bricolage-grotesque-800.ttf", axes: { wght: 800, opsz: 48 }, family: "Bricolage Grotesque", style: "ExtraBold" },
  { file: TEXT, out: "source-sans-3-400.ttf", axes: { wght: 400 }, family: "Source Sans 3", style: "Regular" },
  { file: TEXT, out: "source-sans-3-600.ttf", axes: { wght: 600 }, family: "Source Sans 3", style: "SemiBold" },
];

const instancerScript = `
import json, sys
from fontTools import ttLib
from fontTools.varLib import instancer

path, pinned, family, style = sys.argv[1], json.loads(sys.argv[2]), sys.argv[3], sys.argv[4]
font = ttLib.TTFont(path)
if "fvar" in font:
    axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
    axes.update({tag: float(value) for tag, value in pinned.items() if tag in axes})
    font = instancer.instantiateVariableFont(font, axes, inplace=False, updateFontNames=False)
names = font["name"]
postscript = (family + "-" + style).replace(" ", "")
for name_id, value in ((1, family), (2, style), (4, family + " " + style), (6, postscript), (16, family), (17, style)):
    names.removeNames(nameID=name_id)
    names.setName(value, name_id, 3, 1, 0x409)
font.save(path)
`;

await mkdir(outDir, { recursive: true });

for (const { file, out, axes, family, style } of faces) {
  const woff2 = await readFile(path.join(sourceDir, file));
  const ttf = Buffer.from(await wawoff2.decompress(woff2));
  const outFile = path.join(outDir, out);
  await writeFile(outFile, ttf);
  execFileSync("python3", ["-c", instancerScript, outFile, JSON.stringify(axes), family, style], { stdio: "inherit" });
  console.log(`${file} -> ${path.relative(root, outFile)} (static, ${JSON.stringify(axes)})`);
}
