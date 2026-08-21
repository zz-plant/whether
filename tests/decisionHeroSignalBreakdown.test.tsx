import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";

describe("DecisionHero signal breakdown", () => {
  it("keeps the Funding pressure score, threshold, and direction together in Why this call", () => {
    const html = renderToStaticMarkup(
      <DecisionHero
        tightness={64}
        tightnessDelta={3}
        boldnessScore={58}
        boldnessDelta={-2}
        regime="DEFENSIVE"
        postureLabel="Contraction"
        signalDirection="tighten"
        recordDate="2026-08-14"
        fetchedAt="2026-08-15"
        signalData={{ tightnessThreshold: 68 }}
      />,
    );

    const disclosure = html.match(/<details[\s\S]*?<\/details>/)?.[0] ?? "";
    assert.match(disclosure, /Why this call/);
    assert.match(disclosure, /Funding pressure<\/p><p[^>]*>64<span[^>]*>\/100/);
    assert.match(disclosure, /Funding pressure: 64/);
    assert.match(disclosure, /Trigger at 68\./);
    assert.equal(
      disclosure.match(/0 = easier funding · 100 = harder funding/g)?.length,
      2,
      "the visible ladder label and accessible description should state the same direction",
    );
  });
});
