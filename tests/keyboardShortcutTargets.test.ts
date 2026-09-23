import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "bun:test";

/*
 * Two keyboard defects, both found by deliberately trying to break the shortcuts rather
 * than by reading the code.
 *
 * Asserted against source, matching `tests/commandPaletteKeyboardNavigation.test.ts`:
 * there is no DOM environment in this suite, and the rules below are about how the
 * handlers are written, not about what a particular render produces.
 */

const testDir = dirname(fileURLToPath(import.meta.url));

const componentSource = (name: string) =>
  readFile(join(testDir, "..", "app", "components", name), "utf8");

/* Comments describe what the code used to do, so an assertion that a pattern is gone has
   to read code only. The first version of the test below failed against the fixed file,
   matching the comment that explains the fix. */
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("global shortcut targets", () => {
  /*
   * Route shortcuts (E, P, H, T, R, /) were gated on
   * `document.activeElement === document.body`. That held only because nothing on the
   * page ever took focus: `[data-page-section]` was set nowhere, so J and K did nothing.
   * The moment J and K began focusing sections, one press moved focus off `body` and
   * silently killed all six other shortcuts until the reader clicked somewhere else.
   *
   * Reproduced in a browser on /trust before the fix: `h` navigated to /history from a
   * fresh load, and did nothing after a single `j`.
   */
  it("does not gate route shortcuts on body being the focused element", async () => {
    const source = await componentSource("KeyboardShortcuts.tsx");

    assert.doesNotMatch(
      codeOnly(source),
      /document\.activeElement\s*===\s*document\.body/,
      "a shortcut gated on body focus dies as soon as anything on the page takes focus",
    );
    assert.match(
      source,
      /shortcutTargetIsNeutral\(document\.activeElement\)/,
      "route shortcuts should ask what has focus, not insist on body",
    );
  });

  /*
   * The typing guard excluded input and textarea only. A <select> types ahead on letter
   * keys and a contenteditable takes them literally, and J/K do not consult the neutral
   * check above — so both would have had their keys stolen.
   */
  it("treats select and contenteditable as typing surfaces", async () => {
    const source = await componentSource("KeyboardShortcuts.tsx");
    assert.match(source, /HTMLSelectElement/, "a focused <select> types ahead on letters");
    assert.match(source, /isContentEditable/, "a contenteditable takes letters literally");
  });

  /*
   * The shortcut bar sits in the footer of every page and says "J K Navigate sections"
   * unconditionally, but only some routes declare sections: `/` and `/trust` carry six
   * and eight, while `/signals` and `/resolve` render most of theirs inside disclosures
   * and expose one apiece. Without a fallback the bar advertises a dead key on those
   * routes — the exact defect J/K was fixed for.
   */
  it("has something for J and K to move between on a page with no declared sections", async () => {
    const source = codeOnly(await componentSource("KeyboardShortcuts.tsx"));

    assert.match(
      source,
      /querySelectorAll<HTMLElement>\("h2"\)/,
      "J/K should fall back to the page's headings when it declares fewer than two sections",
    );
    assert.match(
      source,
      /sections\.length\s*<\s*2/,
      "with nothing to move between, the key should be left to the page rather than swallowed",
    );
    assert.match(
      source,
      /hasAttribute\("tabindex"\)/,
      "a heading picked up by the fallback is not focusable without one",
    );
  });
});

describe("tablists support the keyboard", () => {
  /*
   * `role="tablist"` promises arrow-key movement between tabs. `StagePersonaSelector`
   * declared the role, gave every tab `aria-selected`, and had no keyboard handler at
   * all — a screen reader announced "tab, 1 of 4" while the arrows did nothing. Its
   * sibling `cadenceSelector`, the same control drawn the same way, has always
   * implemented it.
   *
   * Written as a sweep rather than a single-file assertion so the next tablist is held
   * to the same contract.
   *
   * Reads code only, like every other assertion in this file. Without that it matched
   * the doc comments that record *why* these controls stopped being tablists, and
   * reported the three files that had just been fixed.
   */
  it("gives every role=tablist arrow-key movement and a roving tabindex", async () => {
    const componentsDir = join(testDir, "..", "app", "components");
    const entries = await readdir(componentsDir, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"));

    const violations: string[] = [];
    for (const entry of files) {
      const path = join(entry.parentPath ?? componentsDir, entry.name);
      const source = codeOnly(await readFile(path, "utf8"));
      if (!source.includes('role="tablist"')) continue;

      if (!/ArrowLeft|ArrowRight/.test(source)) {
        violations.push(`${entry.name} declares role="tablist" but handles no arrow keys`);
      }
      if (!/tabIndex=\{[^}]*\?\s*0\s*:\s*-1/.test(source)) {
        violations.push(`${entry.name} declares role="tablist" without a roving tabIndex`);
      }
    }

    assert.deepEqual(violations, [], `\n${violations.join("\n")}\n`);
  });

  /*
   * The cheapest way to satisfy the sweep above is to stop declaring the role and
   * hand-roll the keyboard anyway, which is how three controls that look identical
   * came to have three different keyboard behaviours — arrows, arrows plus Home/End,
   * and nothing. They share one primitive now, and it is a native radio group, so the
   * browser supplies the movement and there is no handler to get wrong.
   */
  it("routes every segmented control through the shared primitive", async () => {
    const componentsDir = join(testDir, "..", "app", "components");
    // RunwayConditionedNotes.tsx left the list on 2026-09-23: it no longer draws a control of its own.
    const consumers = ["cadenceSelector.tsx", "StagePersonaSelector.tsx", "RunwayPersonaSelector.tsx"];

    for (const name of consumers) {
      const source = codeOnly(await readFile(join(componentsDir, name), "utf8"));
      assert.match(source, /SegmentedControl/, `${name} draws its own segmented control`);
      assert.doesNotMatch(source, /ArrowLeft|ArrowRight/, `${name} hand-rolls keyboard movement again`);
      assert.doesNotMatch(source, /role="tablist"|aria-pressed|aria-current/, `${name} uses a third ARIA pattern`);
    }
  });

  /*
   * Choosing a horizon, a stage or a runway band is a view of the page you are on.
   * `router.push` made Back mean "undo my last filter", so leaving the brief after
   * trying four stages took five presses. `UrlDetails` records the same argument for
   * the disclosure panels.
   */
  it("keeps a setting out of the history stack", async () => {
    const componentsDir = join(testDir, "..", "app", "components");

    for (const name of ["cadenceSelector.tsx", "StagePersonaSelector.tsx", "RunwayPersonaSelector.tsx", "StageDropdownPill.tsx", "RunwayDropdownPill.tsx", "RunwayConditionedNotes.tsx"]) {
      const source = codeOnly(await readFile(join(componentsDir, name), "utf8"));
      assert.match(source, /router\.replace\(/, `${name} should replace rather than push`);
      assert.doesNotMatch(source, /router\.push\(/, `${name} pushes a setting onto history`);
    }
  });
});
