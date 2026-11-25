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
    /* The heading is the reader's question, said as they would say it (2026-11-18). */
    assert.match(html, /<h2[^>]*>Why Cloudy\?<\/h2>/);
    assert.match(html, /Funding pressure/);
    assert.match(html, /risk appetite/i);
    assert.match(html, /they(?:&#x27;|')ll charge you for it/);
  });

  /* The first sentence under the question is its answer, meaning first (2026-11-18): "That's
     Cloudy." closed it, after the numbers, and the heading now names the conditions. */
  it("answers with what the scores mean, then which side of each change line they sit on", () => {
    const html = render();
    assert.match(
      html,
      /data-section-lead="true">Investors will still go out in this, and they(?:&#x27;|')ll charge you for it\. Funding pressure is 90, above 70, and risk appetite is 55, above 50\.<\/p>/,
    );
    assert.doesNotMatch(html, /That(?:&rsquo;|’|&#x27;|')s Cloudy\./);
  });

  it("separates the current scores from the published conditions while a change is pending", () => {
    const html = render({ riskAppetite: 42, pendingConditions: "SCARCITY" });
    assert.match(html, /<h2[^>]*>Where do the scores land\?<\/h2>/);
    assert.match(html, /data-section-lead="true">In Freezing\. Funding pressure is 90, above 70, and risk appetite is 42, at or below 50\. The published conditions remain Cloudy\./);
    assert.doesNotMatch(html, /Investors will still go out/);
  });

  it("shows what the excluded inputs would change, when they would change the classification", () => {
    const html = render({
      notCounted: [{ metric: "riskAppetite", label: "startup-market inputs", score: 44, published: 55, line: "50" }],
      warning: "Startup-market inputs would put risk appetite at 44, below 50.",
    });
    assert.match(html, /Why it feels like Freezing/);
    assert.match(html, /would put risk appetite at 44/);
    // 90 tightness with risk appetite at 44 is Freezing, not the Cloudy headline.
    assert.match(html, /the scores would land in Freezing/);
    assert.match(html, /doesn(?:&#x27;|')t go back far enough to check against past months/);
  });

  it("says nothing about excluded inputs when the basis counts them", () => {
    const html = render();
    assert.doesNotMatch(html, /What the headline reading leaves out/);
  });

});
