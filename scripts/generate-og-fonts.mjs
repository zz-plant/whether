/**
 * Build static TTF instances of the self-hosted faces for the OG image routes.
 *
 * Two constraints drive this: satori (next/og ImageResponse) reads TTF/OTF/WOFF
 * but not woff2, and its parser rejects variable fonts (fvar table) — which the
 * files in public/fonts are. So each face is decompressed from woff2 and then
 * pinned to a single weight with fontTools.
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
  { file: "fraunces-600.woff2", weight: 600 },
  { file: "ibm-plex-sans-400.woff2", weight: 400 },
  { file: "ibm-plex-sans-600.woff2", weight: 600 },
];

const instancerScript = `
import sys
from fontTools import ttLib
from fontTools.varLib import instancer

path, weight = sys.argv[1], float(sys.argv[2])
font = ttLib.TTFont(path)
if "fvar" in font:
    axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
    if "wght" in axes:
        axes["wght"] = weight
    instancer.instantiateVariableFont(font, axes)
font.save(path)
`;

await mkdir(outDir, { recursive: true });

for (const { file, weight } of faces) {
  const woff2 = await readFile(path.join(sourceDir, file));
  const ttf = Buffer.from(await wawoff2.decompress(woff2));
  const outFile = path.join(outDir, file.replace(/\.woff2$/, ".ttf"));
  await writeFile(outFile, ttf);
  execFileSync("python3", ["-c", instancerScript, outFile, String(weight)], { stdio: "inherit" });
  console.log(`${file} -> ${path.relative(root, outFile)} (static, wght ${weight})`);
}
