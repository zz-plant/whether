/**
 * A utility beside a `weather-*` class that already paints the same property does nothing.
 *
 * The stylesheets under app/styles are unlayered, and Tailwind's utilities live in
 * `@layer utilities`. Layer order is decided before specificity, so an unlayered
 * `border-color` on `.weather-surface` beats `border-rose-500/50` on the same element every
 * time. The markup reads as if it is styled and the page draws the class's default instead.
 *
 * That shipped for months, and the cases were the ones where colour carried meaning:
 *
 *   - the cached-data warning ("use for pacing only") drew as an ordinary grey band, not amber;
 *   - /operate's Stop, Start and Keep limited lists drew as three identical grey cards;
 *   - the selected /signals filter and the selected scenario preset looked unselected;
 *   - the highlighted plan on /pricing looked like the other two.
 *
 * No test, lint rule or type could see it, because nothing was wrong with any one line. This
 * derives, from the stylesheets, which properties each `weather-*` class paints, and fails when
 * a string literal pairs the class with a plain utility for one of them. A utility that has to
 * win takes the important modifier (`!border-amber-500/40`), which does beat an unlayered rule;
 * one that repeats the class's own paint should be deleted.
 *
 * Out of scope on purpose: variant utilities (`hover:`, `disabled:`, `focus:`). They lose the
 * same way, but the control classes paint their own hover and focus states, so a leftover
 * `hover:border-sky-400/70` repeats a state that is already drawn rather than hiding one.
 * Mockups under app/mockups are the staging area and are not scanned.
 *
 * Also out of reach: a utility passed to a component that adds the class itself. The /signals
 * filters handed `border-sky-300/80` to an `ActionLink`, whose pill variant brings
 * `.weather-pill`; no single literal holds both. The selected pill is drawn by
 * `.weather-pill[aria-current="page"]` in controls.css now, so that state no longer needs a
 * utility at all.
 */
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

type Paint = "border-color" | "border-width" | "border-style" | "background-color" | "background-image";

/** What a declaration block paints, read from its declarations and its `@apply` utilities. */
const paintsOf = (body: string): Set<Paint> => {
  const paints = new Set<Paint>();
  for (const match of body.matchAll(/(?:^|;|\n)\s*([a-z-]+)\s*:/g)) {
    const property = match[1];
    if (property === "border-color") paints.add("border-color");
    if (property === "border-width") paints.add("border-width");
    if (property === "border-style") paints.add("border-style");
    if (property === "background") {
      paints.add("background-color");
      paints.add("background-image");
    }
    if (property === "background-color") paints.add("background-color");
    if (property === "background-image") paints.add("background-image");
  }
  for (const apply of body.matchAll(/@apply\s+([^;]+);/g)) {
    for (const utility of apply[1].split(/\s+/)) {
      for (const paint of paintsOfUtility(utility)) paints.add(paint);
      // `border` on its own is width and style; paintsOfUtility skips it because in markup it
      // only repeats what these classes already set.
      if (utility === "border") {
        paints.add("border-width");
        paints.add("border-style");
      }
    }
  }
  return paints;
};

const COLOR = /^(?:transparent|current|inherit|black|white|\[.+\]|\(.+\)|[a-z]+-\d{2,3}(?:\/[\d.[\]]+)?)$/;

/** What an un-prefixed Tailwind utility paints, for the properties this test cares about. */
function paintsOfUtility(utility: string): Paint[] {
  const border = utility.match(/^border(?:-([xytrbl]))?(?:-(.+))?$/);
  if (border) {
    const [, side, rest] = border;
    if (rest === undefined) return side ? ["border-width"] : [];
    if (/^\d+$/.test(rest)) return ["border-width"];
    if (/^(?:solid|dashed|dotted|double|hidden|none)$/.test(rest)) return ["border-style"];
    if (COLOR.test(rest)) return ["border-color"];
    return [];
  }
  const bg = utility.match(/^bg-(.+)$/);
  if (bg) {
    const rest = bg[1];
    if (/^(?:none|gradient-.+|linear-.+|radial.*|conic.*)$/.test(rest)) return ["background-image"];
    if (COLOR.test(rest)) return ["background-color"];
  }
  return [];
}

/** Every top-level `.weather-*` rule in app/styles, merged per class. Rules scoped under a
    theme or a parent (`html[data-theme="light"] .weather-pill`) are not the class's own paint. */
const classPaints = (): Map<string, Set<Paint>> => {
  const byClass = new Map<string, Set<Paint>>();
  const stylesDir = join(repoRoot, "app", "styles");
  for (const name of readdirSync(stylesDir)) {
    if (!name.endsWith(".css")) continue;
    const source = readFileSync(join(stylesDir, name), "utf8");
    for (const rule of source.matchAll(/^((?:\.weather-[\w-]+\s*,\s*)*\.weather-[\w-]+)\s*\{([^}]*)\}/gm)) {
      const paints = paintsOf(rule[2]);
      if (paints.size === 0) continue;
      for (const selector of rule[1].matchAll(/\.(weather-[\w-]+)/g)) {
        const merged = byClass.get(selector[1]) ?? new Set<Paint>();
        for (const paint of paints) merged.add(paint);
        byClass.set(selector[1], merged);
      }
    }
  }
  return byClass;
};

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

/** Every double-quoted string and template literal in a source file, with its starting line. */
const stringLiterals = (source: string) =>
  [...source.matchAll(/"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((match) => ({
    text: match[0],
    line: source.slice(0, match.index).split("\n").length,
  }));

const conflicts = (): string[] => {
  const paintsByClass = classPaints();
  const found: string[] = [];
  for (const file of collectSourceFiles(join(repoRoot, "app"))) {
    const source = readFileSync(file, "utf8");
    for (const literal of stringLiterals(source)) {
      const tokens = literal.text.split(/[\s"`'{}$()?:]+/).filter(Boolean);
      // A `:` splits variants off, so `hover:border-x` never reaches paintsOfUtility whole;
      // re-split on whitespace only to keep variant tokens out of the plain set.
      const plain = literal.text.split(/[\s"`'{}$()?]+/).filter((token) => token && !token.includes(":") && !token.startsWith("!"));
      const classes = tokens.filter((token) => paintsByClass.has(token));
      if (classes.length === 0) continue;
      for (const className of classes) {
        const owned = paintsByClass.get(className) ?? new Set<Paint>();
        const losing = plain.filter((utility) => paintsOfUtility(utility).some((paint) => owned.has(paint)));
        if (losing.length > 0) {
          found.push(`${relative(repoRoot, file)}:${literal.line} ${className} loses ${losing.join(" ")}`);
        }
      }
    }
  }
  return found;
};

describe("utilities beside an unlayered weather-* class", () => {
  it("reads the classes it guards from the stylesheets", () => {
    const paints = classPaints();
    for (const className of ["weather-surface", "weather-surface-secondary", "weather-card", "weather-pill", "weather-button", "weather-input"]) {
      const owned = paints.get(className);
      assert.ok(owned?.has("border-color"), `${className} paints its border colour`);
      assert.ok(owned?.has("background-color") || owned?.has("background-image"), `${className} paints its background`);
    }
  });

  it("classifies utilities by what they paint", () => {
    assert.deepEqual(paintsOfUtility("border-rose-500/50"), ["border-color"]);
    assert.deepEqual(paintsOfUtility("border-l-4"), ["border-width"]);
    assert.deepEqual(paintsOfUtility("border-dashed"), ["border-style"]);
    assert.deepEqual(paintsOfUtility("bg-amber-500/10"), ["background-color"]);
    assert.deepEqual(paintsOfUtility("bg-[var(--bg-surface)]"), ["background-color"]);
    assert.deepEqual(paintsOfUtility("border"), [], "a bare `border` repeats what these classes set");
    assert.deepEqual(paintsOfUtility("bg-clip-text"), []);
  });

  it("pairs no class with a plain utility it silently beats", () => {
    const found = conflicts();
    assert.deepEqual(
      found,
      [],
      `A utility here loses to the class beside it, so the page draws the class's default. ` +
        `Make it win with the important modifier (!border-…) or delete it:\n${found.join("\n")}`,
    );
  });
});
