import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatWouldChangeSection } from "../app/components/home/WhatWouldChangeSection";
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

const html = renderToStaticMarkup(
  <WhatWouldChangeSection
    ladders={[
      { metric: "tightness", label: "Funding pressure", value: 90, previous: 63, lines: [{ kind: "callChange", value: 70 }] },
      { metric: "riskAppetite", label: "Risk appetite", value: 47, previous: 56, lines: [{ kind: "callChange", value: 50 }] },
    ]}
    flipProximity={[
      { axis: "tightness", sentence: "If the 1-month Treasury bill rate falls 0.15%, conditions turn Stormy." },
    ]}
    reversalTrigger="Funding pressure falls 20 pts from 90 to 70 or below, or risk appetite rises 3 pts from 47 to clear 50."
    callChangeLines={{ tightness: 70, riskAppetite: 50 }}
    regime="SCARCITY"
  />,
);

/*
 * The section stated the lines three ways beside the quadrant: a red "0 points
 * — the hiring pause line crossed" counter by the heading, each market move in
 * Treasury-rate percentages, and a boxed "Operating boundary rules" panel with
 * the same lines in points. One sentence in points now, with the market move
 * folded under it.
 */
describe("what would change this guidance", () => {
  it("states the call-change line once, in points, with no counter by the heading", () => {
    assert.match(html, /Conditions change if/);
    assert.equal(html.match(/Conditions change if/g)?.length, 1);
    assert.doesNotMatch(html, /points — |points until|Operating boundary rules/);
  });

  it("folds the market move under the statement rather than printing it beside it", () => {
    const fold = html.indexOf("In interest-rate terms");
    assert.ok(fold !== -1, "the market move has its own disclosure");
    assert.ok(html.lastIndexOf("<details", fold) !== -1 && html.indexOf("Treasury bill rate") > fold);
    assert.doesNotMatch(html.slice(html.lastIndexOf("<details", fold), fold), /\sopen/, "and it starts closed");
  });
});

/* The pause line printed here only on a read that drew no ladders, so a reader met
   "Conditions change if" and had to find the pause line in the area table (site
   review, 2026-10-09). The section leads with the pause and restart lines now. */
describe("what would change this guidance: the pause and restart lines", () => {
  const lined = renderToStaticMarkup(
    <WhatWouldChangeSection
      ladders={[{ metric: "tightness", label: "Funding pressure", value: 90, previous: 63, lines: [{ kind: "callChange", value: 70 }] }]}
      flipProximity={[]}
      guardrail="Funding pressure is above 76. Funding pressure is 90 now."
      leadResume="Funding pressure falls below 66"
      reversalTrigger="Funding pressure falls 20 pts from 90 to 70 or below."
      callChangeLines={{ tightness: 70, riskAppetite: 50 }}
      regime="SCARCITY"
    />,
  );

  it("states the three lines, grouped by the question each answers", () => {
    /* Two questions, in the reader's order (2026-10-22): when conditions change,
       then when a paused decision may resume. A change in conditions is not
       permission to resume, so the two groups are named apart. */
    const change = lined.indexOf(">Conditions change if<");
    const pause = lined.indexOf(">Pause if<");
    const resume = lined.indexOf(">Restart when<");
    assert.ok(change > 0 && pause > change && resume > pause, "conditions change, then the pause and restart lines");
    assert.match(lined, /When would conditions change\?/);
    assert.match(lined, /When can paused decisions resume\?/);
    assert.match(lined.replace(/<[^>]+>/g, ""), /Funding pressure falls below 66/);
    assert.match(lined.replace(/<[^>]+>/g, ""), /doesn(?:’|')t mean you can resume\. Only crossing the restart line does/);
  });

  it("prefers a chosen stage's restart line to the lead area's", () => {
    const staged = renderToStaticMarkup(
      <WhatWouldChangeSection
        ladders={[]}
        flipProximity={[]}
        guardrail="Funding pressure is above 76"
        leadResume="Funding pressure falls below 66"
        resumeWhen="Resume once two weekly readings hold"
        callChangeLines={{ tightness: 70, riskAppetite: 50 }}
      />,
    );
    const text = staged.replace(/<[^>]+>/g, "");
    assert.match(text, /Resume once two weekly readings hold/);
    assert.doesNotMatch(text, /Funding pressure falls below 66/);
  });
});
