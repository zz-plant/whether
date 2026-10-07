/**
 * Build static TTF instances of the self-hosted faces for the OG image routes.
 *
 * Two constraints drive this: satori (next/og ImageResponse) reads TTF/OTF/WOFF
 * but not woff2, and its parser rejects variable fonts (fvar table) — which the
 * files in public/fonts are. So each face is decompressed from woff2 and then
 * pinned to one point on every axis with fontTools: Archivo has weight and
 * width, and the cards need the same three voices the site uses — the call
 * semi-condensed, text at normal width, the regime word expanded.
 *
 * Requires python3 with fonttools (`pip install fonttools`). Run manually when
 * a font in public/fonts changes:
 *   node scripts/generate-og-fonts.mjs
 *
 * Output is committed (public/fonts/og/*.ttf) — the OG route fetches these
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

const faces = [
  { file: "archivo-variable.55ade54a.woff2", out: "archivo-semicondensed-700.ttf", axes: { wght: 700, wdth: 87.5 } },
  { file: "archivo-variable.55ade54a.woff2", out: "archivo-400.ttf", axes: { wght: 400, wdth: 100 } },
  { file: "archivo-variable.55ade54a.woff2", out: "archivo-600.ttf", axes: { wght: 600, wdth: 100 } },
  { file: "archivo-variable.55ade54a.woff2", out: "archivo-expanded-700.ttf", axes: { wght: 700, wdth: 125 } },
];

const instancerScript = `
import json, sys
from fontTools import ttLib
from fontTools.varLib import instancer

path, pinned = sys.argv[1], json.loads(sys.argv[2])
font = ttLib.TTFont(path)
if "fvar" in font:
    axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
    axes.update({tag: float(value) for tag, value in pinned.items() if tag in axes})
    font = instancer.instantiateVariableFont(font, axes, inplace=False, updateFontNames=False)
font.save(path)
`;

await mkdir(outDir, { recursive: true });

for (const { file, out, axes } of faces) {
  const woff2 = await readFile(path.join(sourceDir, file));
  const ttf = Buffer.from(await wawoff2.decompress(woff2));
  const outFile = path.join(outDir, out);
  await writeFile(outFile, ttf);
  execFileSync("python3", ["-c", instancerScript, outFile, JSON.stringify(axes)], { stdio: "inherit" });
  console.log(`${file} -> ${path.relative(root, outFile)} (static, ${JSON.stringify(axes)})`);
}
