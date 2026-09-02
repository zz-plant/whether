/**
 * Shape register — docs/agents/ui-ux-standards.md §XIV.
 *
 * Whether runs two shape registers by role: sharp asserts (stamps, data tiles, controls) and
 * soft holds (cards, surfaces, dialogs). The register only carries information while the two
 * stay tellable apart, which is what these four checks protect:
 *
 *   1. No text-bearing pill. `rounded-full` is for things that are round — dots, spinners,
 *      switches, progress bars, icon wells. A badge or button drawn as a pill beside a 2px chip
 *      is two shapes for one class of information.
 *   2. Controls inherit their radius. An element carrying a control class never adds a
 *      `rounded-*` utility; the header once overrode `.weather-button-primary` to a pill and gave
 *      one action row two button shapes.
 *   3. Stylesheets reference radius tokens. A radius is a number in app/styles/tokens.css only.
 *   4. The `:root` scale and the `@theme inline` scale (which generates the rounded-* utilities)
 *      are identical and strictly increasing. They drifted once and produced two scales.
 *
 * Mockups under app/mockups are the staging area for experiments and are not scanned.
 */
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const collectSourceFiles = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "mockups" || name === "node_modules") continue;
      collectSourceFiles(full, out);
    } else if (/\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
};

type Literal = { text: string; line: number };

/** Every double-quoted string and template literal in a source file, with its starting line. */
const stringLiterals = (source: string): Literal[] => {
  const out: Literal[] = [];
  const pattern = /"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  for (const match of source.matchAll(pattern)) {
    const line = source.slice(0, match.index).split("\n").length;
    out.push({ text: match[0], line });
  }
  return out;
};

const CONTROL_CLASS = /\bweather-(?:button-primary|button|pill|tab|cta)\b/;
const RADIUS_UTILITY = /\brounded(?:-[a-z0-9]+)?\b/;

const appFiles = collectSourceFiles(join(repoRoot, "app"));

const violations = (predicate: (literal: string) => boolean): string[] => {
  const found: string[] = [];
  for (const file of appFiles) {
    const source = readFileSync(file, "utf8");
    for (const literal of stringLiterals(source)) {
      if (predicate(literal.text)) {
        found.push(`${relative(repoRoot, file)}:${literal.line}`);
      }
    }
  }
  return found;
};

describe("Shape register (ui-ux-standards §XIV)", () => {
  it("draws no text-bearing element as a pill", () => {
    const pills = violations((text) => /\brounded-full\b/.test(text) && /\bpx-/.test(text));
    assert.deepEqual(pills, [], `rounded-full with horizontal text padding — a badge or button drawn as a pill:\n${pills.join("\n")}`);
  });

  it("lets control classes own their radius", () => {
    const overrides = violations((text) => CONTROL_CLASS.test(text) && RADIUS_UTILITY.test(text));
    assert.deepEqual(overrides, [], `rounded-* utility on an element that carries a control class:\n${overrides.join("\n")}`);
  });

  it("keeps every stylesheet radius on a token", () => {
    const stylesDir = join(repoRoot, "app", "styles");
    const offenders: string[] = [];
    for (const name of readdirSync(stylesDir)) {
      if (!name.endsWith(".css") || name === "tokens.css") continue;
      const lines = readFileSync(join(stylesDir, name), "utf8").split("\n");
      lines.forEach((line, index) => {
        const match = line.match(/border-radius:\s*([^;]+);/);
        if (!match) return;
        const values = match[1].trim().split(/\s+/);
        const allowed = values.every((value) => /^(?:var\(--radius-[a-z0-9]+\)|inherit|50%|0)$/.test(value));
        if (!allowed) offenders.push(`app/styles/${name}:${index + 1}: ${match[0]}`);
      });
    }
    assert.deepEqual(offenders, [], `hardcoded radius outside tokens.css:\n${offenders.join("\n")}`);
  });

  it("keeps the :root and @theme inline radius scales in lockstep and increasing", () => {
    const tokens = readFileSync(join(repoRoot, "app", "styles", "tokens.css"), "utf8");
    const scaleIn = (block: string): Record<string, number> => {
      const scale: Record<string, number> = {};
      for (const match of block.matchAll(/--radius-(sm|md|lg|xl|2xl|3xl|4xl):\s*(\d+)px;/g)) {
        scale[match[1]] = Number(match[2]);
      }
      return scale;
    };
    const rootBlock = tokens.slice(tokens.indexOf("\n:root {"), tokens.indexOf("\n}", tokens.indexOf("\n:root {")));
    const themeStart = tokens.indexOf("@theme inline {");
    const themeBlock = tokens.slice(themeStart, tokens.indexOf("\n}", themeStart));

    const root = scaleIn(rootBlock);
    const theme = scaleIn(themeBlock);
    const tiers = ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];

    assert.deepEqual(Object.keys(root).sort(), [...tiers].sort(), ":root defines every radius tier");
    assert.deepEqual(theme, root, "the @theme inline scale mirrors :root");
    for (let index = 1; index < tiers.length; index += 1) {
      assert.ok(root[tiers[index]] > root[tiers[index - 1]], `${tiers[index]} is larger than ${tiers[index - 1]}`);
    }
    assert.match(rootBlock, /--radius-full:\s*9999px;/, ":root defines --radius-full");
  });
});
