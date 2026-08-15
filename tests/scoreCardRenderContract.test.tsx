import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ScoreCard } from "../app/components/ScoreCard";

/**
 * Direction is carried by three channels at once — tone, glyph shape, and an
 * accessible sentence. These assert the semantics rather than the codepoint:
 * the delta used to render as a literal "↑" character, which screen readers
 * announce inconsistently or skip.
 */
describe("ScoreCard render contract", () => {
  it("shows a rising tightness-style delta in the unfavorable color by default", () => {
    const html = renderToStaticMarkup(
      <ScoreCard label="Cash availability" value={62} delta={3} />,
    );

    assert.match(html, /text-amber-300/);
    assert.match(html, /Cash availability rose 3 since last week/);
  });

  it("shows a rising appetite-style delta in the favorable color with increaseIsPositive", () => {
    const html = renderToStaticMarkup(
      <ScoreCard label="Risk appetite" value={62} delta={3} increaseIsPositive />,
    );

    assert.match(html, /text-emerald-300/);
    assert.match(html, /Risk appetite rose 3 since last week/);
  });

  it("shows a falling tightness-style delta as favorable", () => {
    const html = renderToStaticMarkup(
      <ScoreCard label="Cash availability" value={59} delta={-3} />,
    );

    assert.match(html, /text-emerald-300/);
    assert.match(html, /Cash availability fell 3 since last week/);
  });

  it("renders an unchanged delta as neutral, with no directional wording", () => {
    const html = renderToStaticMarkup(
      <ScoreCard label="Cash availability" value={62} delta={0} />,
    );

    assert.match(html, /text-slate-400/);
    assert.match(html, /Cash availability unchanged/);
    assert.ok(!/\brose\b|\bfell\b/.test(html), "no directional wording when unchanged");
  });

  it("never emits a bare arrow character as the only direction cue", () => {
    const html = renderToStaticMarkup(
      <ScoreCard label="Cash availability" value={62} delta={3} />,
    );

    assert.ok(!html.includes("↑") && !html.includes("↓"), "direction is a glyph, not a codepoint");
    assert.match(html, /<svg/, "glyph renders as an svg");
  });
});
