import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";

const mockAny: any = mock;

/* This file renders a component whose descendant reads the app router, and
   renderToStaticMarkup mounts none, so the render throws "invariant expected app
   router to be mounted" — but only when this file runs without one of the suites
   that installs this mock. `mock.module` patches the registry process-wide, so a
   full run left the router standing here by ordering luck. Installing it here
   makes the file answer for its own dependencies. See
   decisionHeroThresholdConsequence.test.tsx, where that luck ran out. */
mockAny.module("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
  }),
}));


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
    // The rail splits the scale direction across the two ends it names, so the
    // visible halves and the description's full sentence have to agree.
    assert.match(disclosure, />easier funding</);
    assert.match(disclosure, />harder funding</);
    assert.match(disclosure, /Scale direction: 0 = easier funding · 100 = harder funding/);
  });
});
