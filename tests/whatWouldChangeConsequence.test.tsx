import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatWouldChangeSection } from "../app/components/home/WhatWouldChangeSection";
import type { ThresholdBusinessConsequence } from "../lib/report/operatingCalls";
import * as nextNavigation from "next/navigation";

const mockAny: any = mock;

/* DecisionHero renders a descendant that reads the app router, and
   renderToStaticMarkup mounts no router, so the render throws "invariant expected
   app router to be mounted".

   These three cases still passed for months, because `mock.module` patches the
   module registry process-wide and two other suites install this exact mock —
   whichever of them bun loaded first left the router standing for this file. That
   is luck, not isolation: the file failed on its own, so `bun run test <path>` on
   it never worked, and Cloudflare's build ordered the suite differently and went
   red on every commit for two days while the local gate stayed green.

   Installing it here makes the file answer for its own dependencies. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
  }),
}));

const renderHero = (thresholdBusinessConsequence: ThresholdBusinessConsequence) => renderToStaticMarkup(
  <WhatWouldChangeSection
    ladders={[
      { metric: "tightness", label: "Funding pressure", value: 52, previous: 51, lines: [{ kind: "callChange", value: 70 }] },
    ]}
    flipProximity={[]}
    guardrail="Pause at the bounded threshold."
    thresholdBusinessConsequence={thresholdBusinessConsequence}
    lastTime={null}
    callChangeLines={{ tightness: 70, riskAppetite: 50 }}
  />,
);

describe("the threshold consequence beside what would change the call", () => {
  it("renders one affected decision as a one-line numeric consequence", () => {
    const html = renderHero({ pointsToThreshold: 3, consequenceLabel: "the hiring pause line", status: "approaching" });
    assert.match(html, />3 points until the hiring pause line</);
    assert.doesNotMatch(html, /pts to pause/);
  });

  it("renders only the selected consequence for a shared threshold", () => {
    const html = renderHero({ pointsToThreshold: 4, consequenceLabel: "the expansion pause line", status: "approaching" });
    assert.match(html, />4 points until the expansion pause line</);
    assert.doesNotMatch(html, /hiring pause/);
  });

  it("renders an already-crossed threshold without dropping its zero-distance state", () => {
    const html = renderHero({ pointsToThreshold: 0, consequenceLabel: "the hiring pause line", status: "crossed" });
    assert.match(html, />0 points — the hiring pause line crossed</);
    assert.doesNotMatch(html, />0 points until/);
  });
});
