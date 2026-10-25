import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import type { SignalChangeRow } from "../lib/report/home/homeSectionModel";

import { CurveTermsKey } from "../app/signals/components/curveTermsKey";
import { SignalScaleNote } from "../app/components/ui/plainLanguage";
import {
  compositeSignalScales,
  scoreBandReference,
  signalPlainEnglish,
} from "../lib/report/signalTranslations";

const mockAny: any = mock;

/* This file renders a component whose descendant reads the app router, and
   renderToStaticMarkup mounts none, so the render throws "invariant expected app
   router to be mounted" — but only when this file runs without one of the suites
   that installs this mock. `mock.module` patches the registry process-wide, so a
   full run left the router standing here by ordering luck. Installing it here
   makes the file answer for its own dependencies. See
   whatWouldChangeConsequence.test.tsx, where that luck ran out. The real module
   is spread under the override: a stub narrower than `next/navigation` removes
   `notFound` for every file that runs after it (docs/agents/lessons/automation-and-deploy-gate.md). */
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


describe("score scale anchoring", () => {
  it("covers 0-100 with three contiguous bands", () => {
    const rows = scoreBandReference("tightness");
    assert.deepEqual(
      rows.map((row) => row.rangeLabel),
      ["0-30", "31-69", "70-100"],
    );
  });

  it("sources band meanings from the plain-English translations", () => {
    const rows = scoreBandReference("riskAppetite");
    assert.equal(rows[0].meaning, signalPlainEnglish.riskAppetite.lowMeans);
    assert.equal(rows[2].meaning, signalPlainEnglish.riskAppetite.highMeans);
  });

  it("states which end of each composite scale is which", () => {
    const html = renderToStaticMarkup(<SignalScaleNote signalKey="riskAppetite" />);
    assert.match(html, /risk-averse investors/);
    assert.match(html, /risk-hungry investors/);
  });
});

describe("the plain-English layer beside the week's readings", () => {
  /* The layer moved with the readings: the four signals left the hero for their
     own section on 2026-09-22. What it has to carry is unchanged — which end of
     a composite scale is which, what the score means at the level it is at, the
     way to the glossary, and the unclipped pressure behind a score that has
     stopped being able to move. The split-rail drawing went with the hero's
     copy of ThresholdLadder; the direction it stated survives as the scale note,
     and the rail itself is still covered where it still renders
     (tests/illustrationsRenderContract.test.tsx). */
  const render = (overrides: Partial<SignalChangeRow> = {}) =>
    renderToStaticMarkup(
      createElement(WhatChangedSection, {
        rows: [
          {
            key: "tightness",
            label: "Funding pressure",
            value: 64,
            valueLabel: "64",
            previous: 61,
            previousLabel: "61",
            delta: 3,
            increaseIsPositive: false,
            lines: [{ kind: "callChange", value: 70 }],
            ...overrides,
          },
          {
            key: "riskAppetite",
            label: "Risk appetite",
            value: 38,
            valueLabel: "38",
            previous: 40,
            previousLabel: "40",
            delta: -2,
            increaseIsPositive: true,
            lines: [{ kind: "callChange", value: 50 }],
          },
        ],
        lead: "The scores moved toward tighter money this week.",
        comparisonUnavailable: false,
      }),
    );

  it("explains what each score means at its current level", () => {
    const html = render();
    // 64 is mid-band for tightness, 38 is mid-band for risk appetite.
    assert.ok(html.includes(signalPlainEnglish.tightness.midMeans));
    assert.ok(html.includes(signalPlainEnglish.riskAppetite.midMeans));
  });

  it("anchors both composite scales in place, with no glossary link", () => {
    const html = render();
    assert.ok(html.includes(compositeSignalScales.riskAppetite.directionLabel));
    assert.ok(html.includes(compositeSignalScales.tightness.directionLabel));
    assert.ok(!html.includes('href="/glossary"'));
  });

  it("renders the unclipped pressure beside a saturated score", () => {
    const html = render({ value: 100, valueLabel: "100", delta: 0, saturatedPressure: 114 });
    assert.match(html, /would read 114/);
  });

  it("provides historical era context and leadership team prompt", () => {
    const html = render();
    assert.ok(html.includes("Historical context:"));
    assert.ok(html.includes(signalPlainEnglish.tightness.historicalContext));
    assert.ok(html.includes("Ask your team:"));
    assert.ok(html.includes(signalPlainEnglish.tightness.operatorPrompt));
  });
});

describe("curve chart shorthand", () => {
  it("expands every label the curve charts render", () => {
    const html = renderToStaticMarkup(
      <CurveTermsKey terms={["spread10Y2Y", "spread2Y3M", "maturities", "bp"]} />,
    );
    assert.match(html, /Ten-year rate minus two-year rate/);
    assert.match(html, /Two-year rate minus three-month rate/);
    assert.match(html, /one hundredth of a percentage point/);
    assert.match(html, /How long the government is borrowing for/);
  });
});
