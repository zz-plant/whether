import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PostureDial } from "../app/components/illustrations/PostureDial";
import { ThresholdLadder } from "../app/components/illustrations/ThresholdLadder";
import { RegimeGlyph } from "../app/components/illustrations/RegimeGlyph";
import { AttributionFan } from "../app/components/illustrations/AttributionFan";
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

describe("PostureDial", () => {
  it("renders without NaN geometry when there is no prior reading", () => {
    const html = renderToStaticMarkup(<PostureDial idPrefix="d1" value={0.4} label="Tighten" />);
    assertNoNaN(html);
    assertTokensWrapped(html);
    assert.match(html, /No prior reading to compare\./);
  });

  it("colors the delta band by direction of travel", () => {
    const tightened = renderToStaticMarkup(
      <PostureDial idPrefix="d2" value={0.6} previous={0.1} label="Tighten" />,
    );
    assert.match(tightened, /Moved toward tighten since last week\./);
    assert.match(tightened, /stroke="var\(--color-semantic-tightening-fg\)"/);

    const loosened = renderToStaticMarkup(
      <PostureDial idPrefix="d3" value={-0.6} previous={0.1} label="Loosen" />,
    );
    assert.match(loosened, /Moved toward loosen since last week\./);
    assert.match(loosened, /stroke="var\(--color-semantic-easing-fg\)"/);
  });

  it("clamps out-of-range and non-finite values", () => {
    const html = renderToStaticMarkup(
      <PostureDial idPrefix="d4" value={99} previous={Number.NaN} label="Tighten" />,
    );
    assertNoNaN(html);
  });
});

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
        signalLabel="Cash availability"
        scaleDirection={direction}
      />,
    );

    assert.match(html, /Cash availability: 64/);
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
      <DeltaGlyph idPrefix="d1" previous={40} current={54} min={0} max={100} label="Cash availability" />,
    );
    assertNoNaN(rose);
    assertTokensWrapped(rose);
    assert.match(rose, /Rose from 40 to 54\./);

    const fell = renderToStaticMarkup(
      <DeltaGlyph idPrefix="d2" previous={54} current={40} min={0} max={100} label="Cash availability" />,
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

describe("AttributionFan", () => {
  const contributions = [
    { label: "Loose signal", weight: -3 },
    { label: "Tight signal", weight: 5 },
    { label: "Mild tighten", weight: 2 },
  ];

  it("renders nothing when every contribution is zero or non-finite", () => {
    assert.equal(
      renderToStaticMarkup(
        <AttributionFan
          idPrefix="f1"
          postureLabel="Hold"
          contributions={[{ label: "a", weight: 0 }, { label: "b", weight: Number.NaN }]}
        />,
      ),
      "",
    );
  });

  it("groups tightening pressure ahead of loosening in the legend", () => {
    const html = renderToStaticMarkup(
      <AttributionFan idPrefix="f2" postureLabel="Tighten" contributions={contributions} />,
    );
    assertNoNaN(html);
    assertTokensWrapped(html);
    const order = ["Tight signal", "Mild tighten", "Loose signal"].map((l) => html.indexOf(l));
    assert.deepEqual(
      order,
      [...order].sort((a, b) => a - b),
      "legend must run tightening first, then loosening",
    );
  });

  it("fills the right column contiguously across the full span", () => {
    const html = renderToStaticMarkup(
      <AttributionFan idPrefix="f3" postureLabel="Tighten" contributions={contributions} />,
    );
    const slices = [...html.matchAll(/x="310" y="([\d.]+)" width="10" height="([\d.]+)"/g)];
    assert.equal(slices.length, contributions.length);
    const covered = slices.reduce((sum, m) => sum + Number(m[2]), 0);
    assert.ok(Math.abs(covered - 152) < 0.001, `right column covered ${covered}, expected 152`);
    assert.ok(Math.abs(Number(slices[0][1]) - 20) < 0.001, "right column must start at y=20");
  });

  it("shows each contribution's share of the total", () => {
    const html = renderToStaticMarkup(
      <AttributionFan idPrefix="f4" postureLabel="Tighten" contributions={contributions} />,
    );
    assert.match(html, /50%/);
    assert.match(html, /30%/);
    assert.match(html, /20%/);
  });
});
