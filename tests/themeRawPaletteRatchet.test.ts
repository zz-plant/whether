import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "bun:test";

/*
 * DD-043's ratchet: the raw palette classes the light theme can only render by
 * remapping them in `tokens.css` (the floors under the `[data-theme="light"]`
 * patch block). Every call site on one of these families is a place where the
 * theme works because a stylesheet matches the class attribute, not because the
 * component named what it meant. The migration is file-by-file to semantic
 * tokens (`text-<role>` aliases, `bg-`/`border-[color:var(--…)]`), and this test
 * is what makes it irreversible: the counts can only go down.
 *
 * `text-slate-*` is NOT here: `@theme inline` in tokens.css binds the slate text
 * scale to the theme text roles, so it already adapts to both themes with no
 * patch. Only the families the floors rescue are ratcheted.
 */

/** Each family: a regex over class strings, and the count it must not exceed. */
const FAMILIES: ReadonlyArray<{ name: string; pattern: RegExp; baseline: number }> = [
  { name: "text-white (any alpha)", pattern: /\btext-white(\/[\d.[\]]+)?(?![\w-])/g, baseline: 79 },
  { name: "bg-slate-800/900/950 (any alpha)", pattern: /\bbg-slate-(?:800|900|950)(\/[\d.[\]]+)?(?![\w-])/g, baseline: 94 },
  { name: "border-slate-700/800/900", pattern: /\bborder-slate-(?:700|800|900)(?![\w-])/g, baseline: 130 },
  { name: "border-white (any alpha)", pattern: /\bborder-white(\/[\d.[\]]+)?(?![\w-])/g, baseline: 15 },
  { name: "divide-white (any alpha)", pattern: /\bdivide-white(\/[\d.[\]]+)?(?![\w-])/g, baseline: 1 },
];

const sourceFiles = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".") || entry === "mockups") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
};

describe("raw palette classes the light theme must rescue (DD-043 ratchet)", () => {
  const files = sourceFiles("app");

  it("counts every family and lets the counts only fall", () => {
    const counts = FAMILIES.map((family) => {
      let count = 0;
      for (const file of files) {
        const source = readFileSync(file, "utf8");
        count += [...source.matchAll(family.pattern)].length;
      }
      return { name: family.name, count, baseline: family.baseline };
    });

    const grown = counts.filter((family) => family.count > family.baseline);
    assert.deepEqual(
      grown.map((family) => `${family.name}: ${family.count} > ${family.baseline}`),
      [],
      `A raw palette class the light theme renders only via a tokens.css floor was added.\n` +
        `Name the token instead: text roles, border-[color:var(--border-…)], bg via --bg-…\n` +
        `(${counts.map((family) => `${family.name}: ${family.count}/${family.baseline}`).join(" · ")})`,
    );

    // The current state, printed so a migration that ratchets a family down
    // knows the next baseline to write here.
    if (process.env.RATCHET_REPORT === "1") {
      for (const family of counts) console.log(`${family.name}: ${family.count} (baseline ${family.baseline})`);
    }
  });
});
