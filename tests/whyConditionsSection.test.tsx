import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WhyConditionsSection } from "../app/components/home/WhyConditionsSection";

/**
 * The diagnosis section answers "how far can I trust this reading?" where the
 * reader asks it. Two qualifications decide whether the headline classification
 * survives inspection: inputs outside the record (counted, they would make
 * conditions Freezing, not Cloudy) and a score capped at the top of its scale
 * (90 against a 70 line reads as 20 points, while the pressure behind it is 40).
 * Both were methodology notes before; both change the classification here.
 */

const base = {
  regime: "DEFENSIVE",
  tightness: 90,
  riskAppetite: 55,
  changeLines: { tightness: 70, riskAppetite: 50 },
};

const render = (overrides: Partial<Parameters<typeof WhyConditionsSection>[0]> = {}) =>
  renderToStaticMarkup(<WhyConditionsSection {...base} notCounted={[]} warning={null} {...overrides} />);

describe("why conditions", () => {
  it("prints each reading with what it means, so the scores need no decoding", () => {
    const html = render();
    assert.match(html, /Why conditions are Cloudy/);
    assert.match(html, /Funding pressure/);
    assert.match(html, /Risk appetite/);
    assert.match(html, /they(?:&#x27;|')ll charge you for it/);
  });

  it("states which side of each change line the readings sit on", () => {
    const html = render();
    assert.match(html, /Funding pressure is 90, above\s*(?:<!-- -->)?\s*70\./);
    assert.match(html, /Risk appetite is 55,\s*(?:<!-- -->)?\s*above\s*(?:<!-- -->)?\s*50\./);
    assert.match(html, /Investors will still go out in this, and they(?:&#x27;|')ll charge you for it\./);
    assert.match(html, /That(?:&rsquo;|’|&#x27;|')s Cloudy\./);
  });

  it("shows what the excluded inputs would change, when they would change the classification", () => {
    const html = render({
      notCounted: [{ metric: "riskAppetite", label: "startup-market inputs", score: 44, published: 55, line: "50" }],
      warning: "Startup-market inputs would put risk appetite at 44, below 50.",
    });
    assert.match(html, /Why it feels like Freezing/);
    assert.match(html, /would put risk appetite at 44/);
    // 90 tightness with risk appetite at 44 is Freezing, not the Cloudy headline.
    assert.match(html, /conditions would be Freezing, not Cloudy/);
    assert.match(html, /doesn(?:&#x27;|')t go back far enough to check against past months/);
  });

  it("says nothing about excluded inputs when the basis counts them", () => {
    const html = render();
    assert.doesNotMatch(html, /What the headline reading leaves out/);
  });

});
