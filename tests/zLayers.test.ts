import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "bun:test";

/*
 * The z axis (2026-10-31).
 *
 * `--z-dropdown/sticky/overlay/modal/toast` existed in tokens.css and nothing
 * used them: every floating element hand-rolled `z-40` or `z-50`, so the sticky
 * header, the running head, the tab bar, every dialog, the command palette, the
 * slide panels and the toast shared two numbers and the stack was settled by
 * DOM and portal order. Three things fell out of it:
 *
 *   - the scroll-progress rule sat on the header's layer and earlier in the
 *     document, so the header painted over it;
 *   - the skip link needed an invented `z-index: 60` to escape the header;
 *   - a toast could appear under the command palette it was reporting on.
 *
 * Anything that can meet a global layer now comes from the scale. 10 and 20 are
 * also used as *local* stacking inside a positioned parent (a chart's cursor
 * over its track, a card's content over its own wash); that is a different job,
 * contained by the parent, and it stays a bare number.
 */

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const collect = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "mockups" || name === "node_modules") continue;
      collect(full, out);
    } else if (name.endsWith(".tsx") || name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
};

const sourceFiles = () => [
  ...collect(join(repoRoot, "app")),
  ...collect(join(repoRoot, "lib")),
];

/** The tiers that can meet a global layer: 40 and 50 were the whole app's stack. */
const GLOBAL_TIER = /(?<![\w-])z-(?:40|50)(?![\w-])/;
/** A hard-coded layer number, which cannot be re-ordered with the scale. */
const HARD_LAYER = /(?<![\w-])z-\[(?!var\()(-?\d+)\]/;

const offendersOf = (pattern: RegExp) =>
  sourceFiles()
    .map((path) => ({ path, source: readFileSync(path, "utf8") }))
    .flatMap(({ path, source }) =>
      source
        .split("\n")
        .map((line, index) => ({ line, index: index + 1 }))
        .filter(({ line }) => pattern.test(line))
        .map(({ line, index }) => `${relative(repoRoot, path)}:${index} ${line.trim().slice(0, 90)}`),
    );

describe("the z axis comes from the scale", () => {
  it("no component picks a global tier by hand", () => {
    assert.deepEqual(offendersOf(GLOBAL_TIER), []);
  });

  it("no component hard-codes a layer number", () => {
    assert.deepEqual(offendersOf(HARD_LAYER), []);
  });

  it("states the ladder in one place, in order", () => {
    const tokens = readFileSync(join(repoRoot, "app/styles/tokens.css"), "utf8");
    const value = (name: string) => {
      const match = tokens.match(new RegExp(`--z-${name}:\\s*(\\d+);`));
      assert.ok(match, `--z-${name} is declared`);
      return Number(match[1]);
    };
    const ladder = ["raised", "chrome", "chrome-top", "overlay", "modal", "menu", "toast", "presentation"];
    const values = ladder.map(value);
    assert.deepEqual(
      values,
      [...values].sort((a, b) => a - b),
      "the ladder ascends: raised < chrome < chrome-top < overlay < modal < menu < toast < presentation",
    );
    assert.equal(new Set(values).size, values.length, "no two roles share a number");
  });

  it("the skip link rides above the chrome it used to hide under", () => {
    const controls = readFileSync(join(repoRoot, "app/styles/controls.css"), "utf8");
    const skipLink = controls.slice(controls.indexOf(".skip-link"));
    assert.match(skipLink, /z-index:\s*var\(--z-chrome-top\)/, "the skip link uses the scale");
    const tokens = readFileSync(join(repoRoot, "app/styles/tokens.css"), "utf8");
    assert.match(tokens, /--z-chrome-top:\s*30;/, "chrome-top is above chrome (20)");
    assert.match(tokens, /--z-chrome:\s*20;/, "chrome is the header's layer");
  });
});
