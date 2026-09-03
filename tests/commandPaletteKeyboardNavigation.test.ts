import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "bun:test";

/*
 * The palette's ↑/↓ navigation was inert in a real browser, and had been since
 * the palette moved into a Base UI dialog.
 *
 * `Dialog.Popup` installs its own `onKeyDown` that calls `stopPropagation()`
 * for every key in Base UI's COMPOSITE_KEYS set — ArrowUp, ArrowDown,
 * ArrowLeft, ArrowRight, Home, End. The palette registered its `keydown`
 * handler on `window` in the bubble phase, so arrow keys died at the popup
 * element and the handler never ran. Enter is not a composite key, so Enter
 * bubbled through and ran the selected command: the palette looked wired up
 * while the arrows did nothing.
 *
 * Reproduced against Chromium on 2026-09-03 — `aria-current` stayed on the
 * first result across repeated ArrowDown presses, and a bubble-phase probe on
 * `window` confirmed the event never arrived. Registering in the capture phase
 * runs the handler before the popup can swallow the event.
 *
 * These are source contracts because the repo's suite has no DOM: the bug is
 * in where the listener is attached, not in what it computes, so the listener
 * registration is the thing worth pinning.
 */
describe("command palette keyboard navigation", () => {
  it("registers the keydown listener in the capture phase", async () => {
    const source = await readFile("app/components/commandPalette.tsx", "utf8");

    assert.match(
      source,
      /window\.addEventListener\("keydown", handleKeyDown, true\)/,
      "palette must listen in the capture phase; a bubble-phase listener on window " +
        "never sees ArrowUp/ArrowDown, because Dialog.Popup stops their propagation",
    );
  });

  it("removes the listener with the same capture flag it added", async () => {
    const source = await readFile("app/components/commandPalette.tsx", "utf8");

    assert.match(
      source,
      /window\.removeEventListener\("keydown", handleKeyDown, true\)/,
      "removeEventListener must repeat the capture flag, or the listener is never " +
        "removed and every palette open leaks another handler",
    );
  });

  it("keeps arrow keys and Enter wired to selection movement and activation", async () => {
    const source = await readFile("app/components/commandPalette.tsx", "utf8");

    assert.ok(
      source.includes('e.key === "ArrowDown"') && source.includes('e.key === "ArrowUp"'),
      "palette no longer handles arrow keys",
    );
    assert.ok(
      source.includes("filteredRef.current[selectedIndexRef.current]?.action()"),
      "palette no longer activates the selected command on Enter",
    );
  });

  it("still depends on a dialog popup that swallows composite keys", async () => {
    const popup = await readFile(
      "node_modules/@base-ui/react/dialog/popup/DialogPopup.mjs",
      "utf8",
    );

    /*
     * Pins the upstream behavior the capture flag exists to work around. If
     * this fails after a Base UI upgrade, re-check arrow navigation in a real
     * browser: the popup may have stopped swallowing arrows, in which case the
     * capture flag can go — but do not drop it on the strength of this test
     * alone.
     */
    assert.ok(
      popup.includes("COMPOSITE_KEYS.has(event.key)") && popup.includes("stopPropagation()"),
      "Base UI's Dialog.Popup no longer stops propagation for composite keys",
    );

    const composite = await readFile(
      "node_modules/@base-ui/react/internals/composite/composite.mjs",
      "utf8",
    );
    assert.match(
      composite,
      /COMPOSITE_KEYS = new Set\(\[[^\]]*ARROW_UP[^\]]*ARROW_DOWN[^\]]*\]\)/,
      "COMPOSITE_KEYS no longer covers the arrow keys the palette navigates with",
    );
  });
});
