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
    // The meaning comes from signalReadingMeaning, not a local phrase.
    assert.match(html, /money is hard to raise/i);
  });

  it("states which side of each change line the readings sit on", () => {
    const html = render();
    assert.match(html, /Funding pressure is above its 70 change line/);
    assert.match(html, /Risk appetite is above its 50 change line/);
    assert.match(html, /Together they put conditions in/);
  });

  it("shows what the excluded inputs would change, when they would change the classification", () => {
    const html = render({
      notCounted: [{ metric: "riskAppetite", label: "startup-market inputs", score: 44, published: 55, line: "its change line" }],
      warning: "Startup-market inputs would put risk appetite at 44, below its change line.",
    });
    assert.match(html, /What the headline reading leaves out/);
    assert.match(html, /would put risk appetite at 44/);
    // 90 tightness with risk appetite at 44 is Freezing, not the Cloudy headline.
    assert.match(html, /conditions would be Freezing, not Cloudy/);
    assert.match(html, /doesn(?:&#x27;|')t go back far enough to check against past months/);
  });

  it("says nothing about excluded inputs when the basis counts them", () => {
    const html = render();
    assert.doesNotMatch(html, /What the headline reading leaves out/);
  });

  it("gives a capped score's distance to its change line, and only one distance", () => {
    const html = render({ saturatedPressure: 110 });
    assert.match(html, /shows 90 because that(?:&#x27;|’|')s as high as the score goes/);
    assert.match(html, /uncapped it would be 110/);
    // The line is set against the printed score, so 90 against 70 is the distance.
    assert.match(html, /the distance is 20 points above\s+the 70 change line/);
    /* The uncapped distance was printed beside it, so one paragraph gave two
       answers to "how far past the line" and a reader had to choose. */
    assert.doesNotMatch(html, /but really/, "one paragraph must not give two distances");
  });

  it("omits the capped note when the score is not capped", () => {
    const html = render();
    assert.doesNotMatch(html, /because the score is capped there/);
  });
});
