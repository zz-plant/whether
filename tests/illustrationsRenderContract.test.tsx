import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ThresholdLadder } from "../app/components/illustrations/ThresholdLadder";
import { RegimeGlyph } from "../app/components/illustrations/RegimeGlyph";
import { DeltaGlyph } from "../app/components/illustrations/DeltaGlyph";
import type { RegimeKey } from "../lib/types";

/** A paint attribute holding a bare custom-property name renders nothing in the browser. */
const assertTokensWrapped = (html: string) => {
  assert.equal(
    /=\"--[a-z-]+\"/.test(html),
    false,
    "found a bare custom-property name in a paint attribute; it must be wrapped in var()",
  );
};

const assertNoNaN = (html: string) => {
  assert.equal(html.includes("NaN"), false, "geometry produced NaN");
};

describe("ThresholdLadder", () => {
  it("renders nothing for an inverted domain", () => {
    assert.equal(
      renderToStaticMarkup(
        <ThresholdLadder idPrefix="l1" min={10} max={2} current={5} trigger={6} signalLabel="Curve" />,
      ),
      "",
    );
  });

  it("names trigger and reversal in the description", () => {
    const html = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l2"
        min={0}
        max={10}
        current={4}
        trigger={6}
        reversal={2}
        unit="%"
        signalLabel="Real rate"
      />,
    );
    assertNoNaN(html);
    assertTokensWrapped(html);
    assert.match(html, /Trigger at 6%\. Reversal at 2%\./);
    assert.match(html, /Real rate: 4%/);
  });

  it("omits the reversal notch when the rule has none", () => {
    const html = renderToStaticMarkup(
      <ThresholdLadder idPrefix="l3" min={0} max={10} current={4} trigger={6} signalLabel="Curve" />,
    );
    assert.equal(html.includes("Reversal"), false);
  });

  it("shares the visible scale direction with the accessible description", () => {
    const direction = "0 = easier funding · 100 = harder funding";
    const html = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l4"
        min={0}
        max={100}
        current={64}
        previous={61}
        trigger={68}
        signalLabel="Funding pressure"
        scaleDirection={direction}
      />,
    );

    assert.match(html, /Funding pressure: 64/);
    assert.match(html, /Trigger at 68\./);
    assert.equal(html.match(/0 = easier funding · 100 = harder funding/g)?.length, 2);
  });
});

describe("RegimeGlyph", () => {
  const keys: RegimeKey[] = ["EXPANSION", "DEFENSIVE", "SCARCITY", "VOLATILE"];

  it("renders every regime with the shared horizon and a title", () => {
    for (const regime of keys) {
      const html = renderToStaticMarkup(<RegimeGlyph idPrefix={`g-${regime}`} regime={regime} />);
      assertTokensWrapped(html);
      assert.match(html, /y1="26"/, `${regime} is missing the shared horizon`);
      assert.match(html, /<title id="g-[A-Z]+-title">.+<\/title>/, `${regime} has no title`);
    }
  });
});

describe("DeltaGlyph", () => {
  it("states the direction of travel in words", () => {
    const rose = renderToStaticMarkup(
      <DeltaGlyph idPrefix="d1" previous={40} current={54} min={0} max={100} label="Funding pressure" />,
    );
    assertNoNaN(rose);
    assertTokensWrapped(rose);
    assert.match(rose, /Rose from 40 to 54\./);

    const fell = renderToStaticMarkup(
      <DeltaGlyph idPrefix="d2" previous={54} current={40} min={0} max={100} label="Funding pressure" />,
    );
    assert.match(fell, /Fell from 54 to 40\./);
    assert.match(fell, /var\(--accent-success\)/);
  });

  it("renders nothing for an inverted domain or non-finite input", () => {
    assert.equal(
      renderToStaticMarkup(
        <DeltaGlyph idPrefix="d3" previous={1} current={2} min={10} max={0} label="x" />,
      ),
      "",
    );
    assert.equal(
      renderToStaticMarkup(
        <DeltaGlyph idPrefix="d4" previous={Number.NaN} current={2} min={0} max={10} label="x" />,
      ),
      "",
    );
  });
});
