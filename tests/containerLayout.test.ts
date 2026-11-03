/**
 * The page frame answers to the viewport; everything inside it answers to its own box
 * (ui-ux-standards §XXIX).
 *
 * Until 2026-11-03 about ninety layouts under app/ decided when to set their children side
 * by side with a viewport breakpoint of their own choosing. Two equal columns split at `sm`
 * in 24 places, `md` in 12, `lg` in 7 and `xl` in 2, so the same two-up block split at four
 * screen widths depending on who wrote it. And a breakpoint reads the screen, not the room:
 * the report intro split into a title column and an action column at `lg`, which is exactly
 * where the report rail appears and takes 13rem of that room.
 *
 * Inside the frame a layout now uses one of three shapes from app/styles/layout-shells.css
 * (`weather-switch`, `weather-sidebar`, `weather-grid`), which decide from the width they are
 * given, or a container query (`@container` with `@md:`-style variants) where it needs
 * fixed steps. This fails on a viewport-keyed column change outside the files below, each of
 * which is the frame itself or changes something else by the screen in the same breath.
 */
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const appDir = join(repoRoot, "app");

const SCREEN_KEYED: Record<string, string> = {
  "app/layout.tsx": "The site footer is the page frame; its columns answer to the screen, as the header's do.",
  "app/components/reportShell.tsx": "The report rail is the page frame: it appears from lg and sticks to the viewport.",
  "app/components/Shell.tsx": "The homepage's loading frame, shaped like the frame it stands in for.",
  "app/resources/components/resourceArticlePage.tsx": "A guide's aside is hidden below lg, so its column goes with that switch.",
  "app/share/sharePageFormats.tsx": "A phone gets a native select in place of the format list; the column goes with that swap.",
  "app/components/DecisionHero.tsx": "The call card swaps its phone figure for the conditions map at md; the map's column goes with it.",
  "app/components/home/WhatWouldChangeSection.tsx": "The conditions map hides and resizes at md; its column goes with it.",
  "app/components/trustStrip.tsx": "On a phone the strip is one run of text, the phone's own layout.",
  "app/components/ui/dialog.tsx": "A dialog is sized to the screen, so its footer answers to the screen.",
  "app/components/ui/segmentedControl.tsx": "The choices fit by auto-fit from sm; below it, a phone pair with an odd last key spanning the row.",
  "app/components/ui/areaTable.tsx": "A row becomes a card where the table's column heads hide, which is by the screen.",
  "app/components/home/WhatChangedSection.tsx": "A row becomes a card where the table's column heads hide, which is by the screen.",
  "app/signals/components/evidenceReaderSections.tsx": "A row becomes a card where the table's column heads hide, which is by the screen.",
};

/* A column count, span, direction or `contents` switch behind a viewport variant. The
   lookbehind leaves the container variants (`@md:`, `@max-xl:`) alone. */
const SCREEN_KEYED_COLUMNS =
  /(?<![@\w-])(?:max-)?(?:sm|md|lg|xl|2xl):(?:grid-cols-|col-span-|row-span-|flex-row\b|contents\b|\[grid-template-columns)/g;

/* A primitive's settings do nothing without the primitive in the same class list. */
const PRIMITIVE_SETTING = /\[--(?:col-min|grid-max|aside|main-min):[^\]]+\]/;
const PRIMITIVE_CLASS = /\bweather-(?:switch|grid|sidebar|sidebar-start)\b/;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "mockups" ? [] : sourceFiles(path);
    return /\.(tsx|ts)$/.test(name) ? [path] : [];
  });

const files = sourceFiles(appDir).map((path) => ({
  file: relative(repoRoot, path).split("\\").join("/"),
  source: readFileSync(path, "utf8"),
}));

describe("container layout (§XXIX)", () => {
  it("keys no column change to the viewport outside the page frame", () => {
    const offenders = files.flatMap(({ file, source }) =>
      file in SCREEN_KEYED
        ? []
        : source.split("\n").flatMap((line, index) =>
            [...line.matchAll(SCREEN_KEYED_COLUMNS)].map((match) => `${file}:${index + 1} ${match[0]}`),
          ),
    );
    assert.deepEqual(
      offenders,
      [],
      "Use weather-switch, weather-sidebar or weather-grid, or a container query, so the layout reads the width it is given (ui-ux-standards §XXIX).",
    );
  });

  it("lists only files that still key a column change to the viewport", () => {
    const keyed = new RegExp(SCREEN_KEYED_COLUMNS.source);
    const stale = Object.keys(SCREEN_KEYED).filter((file) => {
      const entry = files.find((candidate) => candidate.file === file);
      return !entry || !keyed.test(entry.source);
    });
    assert.deepEqual(stale, [], "Remove these from SCREEN_KEYED: nothing in them answers to the screen any more.");
  });

  it("sets a primitive's measures only beside the primitive", () => {
    const loose = files.flatMap(({ file, source }) =>
      [...source.matchAll(/(["'`])([^"'`\n]*\[--[a-z-]+:[^"'`\n]*)\1/g)]
        .map((match) => match[2])
        .filter((classes) => PRIMITIVE_SETTING.test(classes) && !PRIMITIVE_CLASS.test(classes))
        .map((classes) => `${file}: ${classes}`),
    );
    assert.deepEqual(loose, []);
  });

  it("declares the three shapes in a layer, so a utility on the same element wins", () => {
    const css = readFileSync(join(appDir, "styles/layout-shells.css"), "utf8");
    const layered = css.slice(css.indexOf("@layer components {"));
    for (const name of ["weather-switch", "weather-sidebar", "weather-sidebar-start", "weather-grid"]) {
      assert.ok(layered.includes(`.${name}`), `.${name} is missing from the layered block`);
    }
  });
});
