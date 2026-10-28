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

/** Boxes that are controls or chips rather than containers. A button inside a
 *  card is not a nested container. */
const NOT_CONTAINERS = new Set([
  "weather-pill", "weather-pill-muted", "weather-button", "weather-button-primary",
  "weather-cta", "weather-cta-primary", "weather-input", "weather-control",
  "weather-chip", "weather-hub-chip",
  // A keycap: chip-sized, sits inside controls and rows, never encloses anything.
  "weather-kbd",
  // Keys a reader presses (ui-ux-standards §XXVI): a toggle key and a stepper's ends.
  "weather-key", "weather-step-key",
  // The caveat band (§XIV): a leaf that never encloses a container, and its border is its
  // meaning, so the ladder must not flatten it when it sits three boxes deep.
  "weather-caveat-band",
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

/**
 * The ladder, located by shape rather than by a comment.
 *
 * This used to slice between two comment markers. A dead-CSS cleanup (e8a281fd)
 * deleted the closing one, `indexOf` returned -1, and `slice(start, -1)` runs to
 * the end of the file — so every `weather-*` class declared anywhere below the
 * de-escalation block counted as registered, and the check below silently
 * stopped checking. It kept reporting two passing tests. A gate that quietly
 * stops running is worse than no gate at all, so this finder asserts it found
 * something rather than trusting a string that another file is free to delete.
 *
 * A de-escalation rule is a container inside a container: a selector nesting two
 * or more `:is(...)` groups. Nothing else in this stylesheet is shaped that way.
 */
const ladderClasses = () => {
  const source = readFileSync(`${STYLES_DIR}surfaces.css`, "utf8");
  const found = new Set<string>();
  let ruleCount = 0;

  for (const [, selector] of source.matchAll(/([^{}]*)\{[^{}]*\}/g)) {
    if ((selector.match(/:is\(/g) ?? []).length < 2) continue;
    ruleCount += 1;
    for (const [, className] of selector.matchAll(/\.(weather-[a-z0-9-]+)/g)) {
      found.add(className);
    }
  }

  assert.ok(
    ruleCount >= 2,
    `expected the nested :is(...) de-escalation rules in app/styles/surfaces.css and found ${ruleCount}. If the ladder was restructured, teach this finder the new shape — do not leave it matching nothing.`,
  );
  return found;
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
