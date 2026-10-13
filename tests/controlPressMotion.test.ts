import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "bun:test";

/*
 * A control drawn as an instrument part moves only when it is pressed: 120ms on the
 * transform (docs/agents/ui-ux-standards.md §XXVI). The first version also faded the
 * selected paint, the lamp and the scale's pointer over 160ms, so every choice arrived a
 * beat after the click or arrow key that made it.
 */
const CONTROLS = fileURLToPath(new URL("../app/styles/controls.css", import.meta.url));
const INSTRUMENT_PART = /\.weather-(segment-(option|lamp|scale)|step-key|key)\b/;

describe("instrument-part motion", () => {
  it("animates the press transform and nothing else", () => {
    const source = readFileSync(CONTROLS, "utf8");
    const transitions: { selector: string; value: string }[] = [];
    for (const [, selector = "", body = ""] of source.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      if (!INSTRUMENT_PART.test(selector)) continue;
      for (const [, value = ""] of body.matchAll(/(?:^|[;{\s])transition\s*:\s*([^;]+);/g)) {
        transitions.push({ selector: selector.trim(), value: value.replace(/\s+/g, " ").trim() });
      }
    }

    assert.ok(transitions.length > 0, "the instrument parts declare their press transition");
    const moving = transitions.filter(({ value }) => value !== "none" && !/^transform 120ms [^,]+$/.test(value));
    assert.deepEqual(moving, [], "only the 120ms press transform may animate");
  });
});
