import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ScoreCard } from "../app/components/ScoreCard";

describe("ScoreCard render contract", () => {
  it("shows a rising tightness-style delta in the unfavorable color by default", () => {
    const html = renderToStaticMarkup(
      <ScoreCard label="Cash availability" value={62} delta={3} />,
    );

    assert.match(html, /text-amber-200/);
    assert.match(html, /↑/);
  });

  it("shows a rising appetite-style delta in the favorable color with increaseIsPositive", () => {
    const html = renderToStaticMarkup(
      <ScoreCard label="Risk appetite" value={62} delta={3} increaseIsPositive />,
    );

    assert.match(html, /text-emerald-200/);
    assert.match(html, /↑/);
  });

  it("renders an unchanged delta as a neutral → glyph, not a directional arrow", () => {
    const html = renderToStaticMarkup(
      <ScoreCard label="Cash availability" value={62} delta={0} />,
    );

    assert.match(html, /text-slate-400/);
    assert.match(html, /→/);
    assert.ok(!html.includes("↑") && !html.includes("↓"), "no directional arrow when unchanged");
  });
});
