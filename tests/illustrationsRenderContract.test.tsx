import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ThresholdLadder } from "../app/components/illustrations/ThresholdLadder";

/** A paint attribute holding a bare custom-property name renders nothing in the browser. */
const assertTokensWrapped = (html: string) => {
  assert.equal(
    /="--[a-z-]+"/.test(html),
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

  it("names the pause and restart lines in the description", () => {
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
    assert.match(html, /Pause line at 6%\. Restart line at 2%\./);
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
    assert.match(html, /Pause line at 68\./);
    // The visible caption is split across the rail ends it names; the
    // description carries the same direction as one sentence.
    assert.match(html, />easier funding</);
    assert.match(html, />harder funding</);
    assert.equal(html.match(new RegExp(direction, "g"))?.length, 1);
    assert.match(html, /Scale direction: 0 = easier funding · 100 = harder funding/);
  });

  it("runs an inverted rail backwards, ends included", () => {
    const upright = renderToStaticMarkup(
      <ThresholdLadder idPrefix="l5" min={0} max={100} current={25} trigger={40} signalLabel="S" />,
    );
    const flipped = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l5"
        min={0}
        max={100}
        current={25}
        trigger={40}
        signalLabel="S"
        invert
      />,
    );

    assertNoNaN(flipped);
    // 25 of 100 sits a quarter along an upright rail and three quarters along a flipped
    // one; the shared inset makes those 66 and 174 in a 240-unit space.
    assert.ok(upright.includes('cx="66"'), "upright reading should sit at a quarter");
    assert.ok(flipped.includes('cx="174"'), "flipped reading should sit at three quarters");
    // An inverted rail whose ends still read 0 then 100 mislabels every point on it.
    assert.match(flipped, /textAnchor="start"|text-anchor="start"/);
    assert.ok(flipped.indexOf(">100</text>") < flipped.indexOf(">0</text>"));
  });

  it("shades the hysteresis gap only when asked, and drops the distance wash for it", () => {
    const props = {
      idPrefix: "l6",
      min: 0,
      max: 100,
      current: 20,
      trigger: 80,
      reversal: 60,
      signalLabel: "S",
    } as const;

    const plain = renderToStaticMarkup(<ThresholdLadder {...props} />);
    const banded = renderToStaticMarkup(<ThresholdLadder {...props} hysteresisBand />);

    assertNoNaN(banded);
    assertTokensWrapped(banded);
    // The band spans reversal to trigger; the plain rail shades reading to trigger.
    assert.ok(banded.includes('x1="141.6"') && banded.includes('x2="184.8"'));
    assert.ok(plain.includes('x1="55.2"') && plain.includes('x2="184.8"'));
    // Both washes at once would bury the band under the run that crosses it.
    assert.equal(banded.includes('x1="55.2"'), false);
  });

  it("lets the surface name the trigger without renaming it everywhere", () => {
    const html = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l7"
        min={0}
        max={100}
        current={20}
        trigger={80}
        triggerLabel="Guardrail"
        signalLabel="S"
      />,
    );

    assert.match(html, />Guardrail</);
    // The accessible description keeps the generic noun, which other copy quotes.
    assert.match(html, /Pause line at 80\./);
  });

  it("names the reversal line what the surface calls it, visibly only", () => {
    const html = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l7b"
        min={0}
        max={100}
        current={32}
        trigger={76}
        triggerLabel="Guardrail"
        reversal={66}
        reversalLabel="Clears when"
        hysteresisBand
        signalLabel="Funding pressure"
      />,
    );

    assert.match(html, />Clears when</);
    // Same split as `triggerLabel`: the description keeps the generic noun.
    assert.match(html, /Restart line at 66\./);
  });

  it("lifts the reversal caption clear of the trigger caption when they would collide", () => {
    const tight = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l7c"
        min={0}
        max={100}
        current={32}
        trigger={76}
        triggerLabel="Guardrail"
        reversal={66}
        reversalLabel="Clears when"
        hysteresisBand
        signalLabel="Funding pressure"
        viewBoxWidth={300}
      />,
    );
    const roomy = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l7d"
        min={0}
        max={100}
        current={32}
        trigger={90}
        triggerLabel="Guardrail"
        reversal={10}
        reversalLabel="Clears when"
        hysteresisBand
        signalLabel="Funding pressure"
        viewBoxWidth={300}
      />,
    );

    // A hysteresis gap is small by design, so the two captions overlap exactly
    // when the rule is tight. The stacked one buys its room from the box height.
    assert.match(tight, /viewBox="0 0 300 88"/);
    assert.match(tight, /transform="translate\(0, 14\)"/);
    assert.match(roomy, /viewBox="0 0 300 74"/);
    assert.doesNotMatch(roomy, /translate\(0, 14\)/);
  });

  it("splits a two-ended scale direction across the ends it names, and follows invert", () => {
    const upright = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l7e"
        min={0}
        max={100}
        current={32}
        trigger={70}
        signalLabel="Funding pressure"
        scaleDirection="0 = easier funding · 100 = harder funding"
        viewBoxWidth={220}
      />,
    );
    const inverted = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l7f"
        min={0}
        max={100}
        current={52}
        trigger={50}
        invert
        signalLabel="Risk appetite"
        scaleDirection="0 = easier funding · 100 = harder funding"
        viewBoxWidth={220}
      />,
    );

    // The rail end beneath each half already prints the number, so the halves drop it.
    assert.match(upright, /text-anchor="start"[^>]*>easier funding</);
    assert.match(upright, /text-anchor="end"[^>]*>harder funding</);
    // Inverting the rail puts 100 on the left, so its caption goes with it.
    assert.match(inverted, /text-anchor="start"[^>]*>harder funding</);
    assert.match(inverted, /text-anchor="end"[^>]*>easier funding</);
    // The description keeps the unsplit sentence either way.
    assert.match(upright, /Scale direction: 0 = easier funding · 100 = harder funding/);
  });

  it("wraps rather than shrinks a scale direction that will not split", () => {
    const html = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l7g"
        min={0}
        max={100}
        current={32}
        trigger={70}
        signalLabel="Curve"
        scaleDirection="a single unsplittable run of scale direction copy that overflows"
        viewBoxWidth={200}
      />,
    );

    assert.match(html, /<p[^>]*text-xs[^>]*>a single unsplittable run of scale direction copy that overflows<\/p>/);
    assert.doesNotMatch(html, /<text[^>]*>a single unsplittable/);
  });

  it("does not read a signal that blew through the trigger as improving", () => {
    // 70 → 82 against a trigger of 76 is 6 away either side, so a distance comparison
    // scores it flat and paints the leg green on the one move that most deserves alarm.
    const crossed = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l9"
        min={0}
        max={100}
        current={82}
        previous={70}
        trigger={76}
        reversal={66}
        signalLabel="Funding pressure"
      />,
    );

    assert.match(crossed, /Rose from 70, moving further past the trigger\./);
    assert.equal(crossed.includes("var(--accent-success)"), true, "reversal notch is green");
    // The movement leg is the wide one; it must not be the improving colour.
    assert.doesNotMatch(crossed, /strokeWidth="2.5"[^>]*var\(--accent-success\)/);
  });

  it("reads a retreat from beyond the trigger as improving, without claiming it is clear", () => {
    const retreating = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l10"
        min={0}
        max={100}
        current={80}
        previous={92}
        trigger={76}
        reversal={66}
        signalLabel="Funding pressure"
      />,
    );

    assert.match(retreating, /Fell from 92, moving back toward the trigger\./);
  });

  it("keeps the distance heuristic where no reversal names the trouble side", () => {
    // Without a reversal the component cannot know which side of the trigger is bad,
    // so it must not guess — this is the long-standing behaviour and stays put.
    const html = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l11"
        min={0}
        max={100}
        current={82}
        previous={70}
        trigger={76}
        signalLabel="S"
      />,
    );

    assert.match(html, /Rose from 70, moving away from the trigger\./);
  });

  it("caps wide coordinate spaces so phone layouts retain readable labels", () => {
    const wide = renderToStaticMarkup(
      <ThresholdLadder
        idPrefix="l8"
        min={0}
        max={100}
        current={50}
        trigger={80}
        signalLabel="S"
        viewBoxWidth={660}
      />,
    );

    assertNoNaN(wide);
    assert.match(wide, /viewBox="0 0 300 74"/);
    // Keep the drawing compact even when a desktop caller requests a very wide rail.
    assert.ok(wide.includes('x2="288"'));
    assert.ok(wide.includes('fontSize="12"') || wide.includes('font-size="12"'));
  });
});
