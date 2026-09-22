import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";

const mockAny: any = mock;

/* The hero's descendants read the app router; renderToStaticMarkup mounts none.
   Installed here so the file answers for its own dependencies rather than
   passing on another suite's ordering luck. */
mockAny.module("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/*
 * The homepage used to carry a visually hidden `h1` reading "Weekly Brief"
 * while the sentence stating the week's call was an `h2` inside the hero. The
 * one heading a crawler and a screen-reader user meet first said nothing this
 * week that it did not say every week.
 *
 * Asserted against rendered markup wherever the markup is reachable. The first
 * version of this file matched every claim with a regex over `page.tsx` and
 * `DecisionHero.tsx`, and its own comment recorded what that costs: one
 * assertion "failed when the ternary became a `??`, with the rendered heading
 * unchanged". A test that breaks on a refactor and passes on a regression is
 * answering a different question from the one in its name.
 *
 * Two claims are still read from source, and they are the ones about the route
 * rather than a component: `app/page.tsx` renders only a shell in this suite,
 * because the suite serves no upstreams and the data boundary suspends. Those
 * two say so where they sit.
 */
const heroProps = {
  tightness: 64,
  tightnessDelta: 3,
  boldnessScore: 58,
  boldnessDelta: -2,
  regime: "DEFENSIVE" as const,
  postureLabel: "Contraction",
  recordDate: "2026-08-14",
  fetchedAt: "2026-08-15",
  signalData: { tightnessThreshold: 68 },
};

const headingFor = (html: string, id: string) =>
  html.match(new RegExp(`<(h[1-6])[^>]*id="${id}"`))?.[1] ?? null;

describe("homepage heading contract", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

  it("makes the hero's weekly call an h1 by default", () => {
    const html = renderToStaticMarkup(<DecisionHero {...heroProps} />);
    assert.equal(headingFor(html, "weekly-call-title"), "h1");
  });

  it("drops the hero to an h2 when a cadence card takes the h1", () => {
    const html = renderToStaticMarkup(<DecisionHero {...heroProps} titleLevel="h2" />);
    assert.equal(headingFor(html, "weekly-call-title"), "h2");
  });

  it("anchors the share-ready artifact on the card that is the artifact", () => {
    const html = renderToStaticMarkup(<DecisionHero {...heroProps} />);
    assert.match(html, /id="share-ready-artifact"/);
    assert.doesNotMatch(page, /id="share-ready-artifact"/, "the route no longer carries the anchor");
  });

  /* Route-level, and `app/page.tsx` renders only a shell here — see the note above. */
  it("leaves no competing h1 or heading above the call in the route", () => {
    assert.doesNotMatch(page, /<h1\b/, "the route renders no h1 of its own");
    assert.doesNotMatch(page, /weekly-call-heading/, "the sr-only label is an aria-label now");
    assert.match(page, /aria-label="This week’s operating call"/);
  });

  /* Also route-level. Matches the fallback label, not the operator that selects it:
     this once asserted `: "Weekly Brief"` and so failed when the ternary became a
     `??` against a shared cadence label, with the rendered heading unchanged. */
  it("still names the horizon on the copied artifact", () => {
    assert.match(page, /title: cadenceTitle \?\? "Whether Weekly Brief"/);
    assert.match(page, /cadenceCall\.cadenceLabel, cadenceCall\.periodLabel/);
  });

  it("hands the h1 to the cadence card when one is selected", () => {
    assert.match(page, /<CadenceCallCard model=\{cadenceCall\} titleLevel="h1" \/>/);
    assert.match(page, /titleLevel=\{cadenceCall \? "h2" : "h1"\}/);
  });
});
