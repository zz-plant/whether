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
   */
  it("gives every role=tablist arrow-key movement and a roving tabindex", async () => {
    const componentsDir = join(testDir, "..", "app", "components");
    const entries = await readdir(componentsDir, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"));

    const violations: string[] = [];
    for (const entry of files) {
      const path = join(entry.parentPath ?? componentsDir, entry.name);
      const source = await readFile(path, "utf8");
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
});
