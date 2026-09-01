import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "bun:test";

/*
 * The depth ladder in surfaces.css de-escalates a container nested inside
 * another, and it does that by naming classes. That is the whole weakness: it
 * named three while the app builds boxes out of eighteen, so on /operate the
 * outermost container (.weather-step-panel) was not in the list and nothing in
 * that subtree de-escalated — a bordered body two levels in kept its shadow and
 * floated above the panel containing it.
 *
 * A nineteenth container class should fail here rather than silently opting its
 * whole subtree out of the ladder.
 */
const STYLES_DIR = fileURLToPath(new URL("../app/styles/", import.meta.url));

/** Boxes that are controls, chips, or modifiers rather than containers. A
 *  button inside a card is not a nested container, and the -sky/-indigo tints
 *  are applied alongside .weather-surface, which the ladder already names. */
const NOT_CONTAINERS = new Set([
  "weather-pill", "weather-pill-muted", "weather-button", "weather-button-primary",
  "weather-cta", "weather-cta-primary", "weather-input", "weather-control",
  "weather-tab", "weather-icon-chip", "weather-chip", "weather-hub-chip",
  "weather-hub-stat", "weather-brief-meta-chip", "weather-nav-card-index",
  "weather-surface-sky", "weather-surface-indigo", "weather-surface-amber",
]);

const isPrefixedNonContainer = (name: string) =>
  name.startsWith("weather-tag-") || name.startsWith("weather-data-mode-");

const readStyles = () =>
  readdirSync(STYLES_DIR)
    .filter((f) => f.endsWith(".css"))
    .map((f) => ({ file: f, source: readFileSync(`${STYLES_DIR}${f}`, "utf8") }));

/** A rule that draws an enclosure: an edge plus a fill or a lift. */
const declaresBox = (body: string) => {
  const edge = /(^|[;{\s])border(-(top|right|bottom|left))?(-(width|color))?\s*:/.test(body)
    || /@apply[^;]*\bborder\b/.test(body);
  const fill = /(^|[;{\s])background(-(color|image))?\s*:/.test(body)
    || /@apply[^;]*\bbg-/.test(body)
    || /(^|[;{\s])box-shadow\s*:/.test(body);
  return edge && fill;
};

const collectContainerClasses = () => {
  const found = new Set<string>();
  for (const { source } of readStyles()) {
    for (const match of source.matchAll(/(?:^|\n)\.(weather-[a-z0-9-]+)\s*\{([^}]*)\}/g)) {
      const name = match[1];
      if (NOT_CONTAINERS.has(name) || isPrefixedNonContainer(name)) continue;
      if (declaresBox(match[2])) found.add(name);
    }
  }
  return found;
};

const ladderClasses = () => {
  const source = readFileSync(`${STYLES_DIR}surfaces.css`, "utf8");
  const start = source.indexOf("Depth de-escalation");
  assert.ok(start > -1, "the depth de-escalation block is gone from surfaces.css");
  const block = source.slice(start, source.indexOf("Nav scroll fade", start));
  return new Set([...block.matchAll(/\.(weather-[a-z0-9-]+)/g)].map((m) => m[1]));
};

describe("surface depth ladder", () => {
  it("names every container class that draws a box", () => {
    const ladder = ladderClasses();
    const missing = [...collectContainerClasses()].filter((c) => !ladder.has(c)).sort();

    assert.deepEqual(
      missing,
      [],
      `these classes draw a box but are not in the depth ladder, so nesting inside them never de-escalates:\n  ${missing.join("\n  ")}\n\nAdd them to the :is(...) lists in app/styles/surfaces.css, or to NOT_CONTAINERS here if they are controls or chips.`,
    );
  });

  it("still de-escalates shadow and blur, not border and background", () => {
    const source = readFileSync(`${STYLES_DIR}surfaces.css`, "utf8");
    const block = source.slice(source.indexOf("Depth de-escalation"));
    assert.match(block, /box-shadow:\s*none/);
    assert.match(block, /backdrop-filter:\s*none/);
  });
});
