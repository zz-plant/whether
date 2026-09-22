import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";
import { CurveTermsKey } from "../app/signals/components/curveTermsKey";
import { ScoreBandReference, SignalScaleNote } from "../app/components/ui/plainLanguage";
import { BEGINNER_GLOSSARY_ENTRIES } from "../lib/report/reportCopy";
import {
  PLAIN_ENGLISH_SUBSTITUTIONS,
  applyPlainEnglishSubstitutions,
  GLOSSARY_HREF,
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

  it("marks the band this week's reading falls in", () => {
    const html = renderToStaticMarkup(<ScoreBandReference signalKey="tightness" score={64} />);
    assert.match(html, /31-69/);
    // The active row is the only one that carries the assistive-tech marker.
    assert.equal(html.match(/this week&#x27;s reading|this week’s reading/g)?.length, 1);
  });

  it("states which end of each composite scale is which", () => {
    const html = renderToStaticMarkup(<SignalScaleNote signalKey="riskAppetite" />);
    assert.match(html, /risk-averse investors/);
    assert.match(html, /risk-hungry investors/);
  });
});

describe("DecisionHero plain-English layer", () => {
  const render = () =>
    renderToStaticMarkup(
      <DecisionHero
        tightness={64}
        tightnessDelta={3}
        riskAppetite={38}
        riskAppetiteDelta={-2}
        boldnessScore={58}
        boldnessDelta={-2}
        regime="DEFENSIVE"
        signalDirection="tighten"
        recordDate="2026-08-14"
        fetchedAt="2026-08-15"
        signalData={{ tightnessThreshold: 68 }}
      />,
    );

  it("explains what each score means at its current level", () => {
    const html = render();
    // 64 is mid-band for tightness, 38 is mid-band for risk appetite.
    assert.ok(html.includes(signalPlainEnglish.tightness.midMeans));
    assert.ok(html.includes(signalPlainEnglish.riskAppetite.midMeans));
  });

  it("anchors the risk-appetite scale and links out to the glossary", () => {
    const html = render();
    assert.ok(html.includes(compositeSignalScales.riskAppetite.directionLabel));
    /* Read from the constant: the destination moved off /trust, and a literal
       here would have to be edited in lockstep with it — which is how six
       links came to point at a page about source freshness. */
    assert.ok(html.includes(GLOSSARY_HREF));
  });

  it("draws the tightness ladder label from the shared scale constant", () => {
    const html = render();
    // The rail splits the direction across the two ends it names and drops the
    // number each half carries, because the rail end under it already prints it.
    // The unsplit sentence survives in the accessible description.
    const [low, high] = compositeSignalScales.tightness.directionLabel
      .split(" · ")
      .map((half) => half.replace(/^-?\d+(?:\.\d+)?\s*=\s*/, ""));
    assert.match(html, new RegExp(`>${low}<`));
    assert.match(html, new RegExp(`>${high}<`));
    assert.match(
      html,
      new RegExp(`Scale direction: ${compositeSignalScales.tightness.directionLabel}`),
      "the ladder states the same direction in its visible label and its accessible description",
    );
  });

  it("renders the unclipped pressure beside a saturated score", () => {
    const html = renderToStaticMarkup(
      <DecisionHero
        tightness={100}
        tightnessDelta={0}
        tightnessPressure={114}
        tightnessSaturated={true}
        riskAppetite={38}
        riskAppetiteDelta={-2}
        boldnessScore={58}
        boldnessDelta={-2}
        regime="DEFENSIVE"
        signalDirection="tighten"
        recordDate="2026-08-14"
        fetchedAt="2026-08-15"
        signalData={{ tightnessThreshold: 68 }}
      />,
    );
    assert.match(html, /would read 114/);
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

describe("beginner glossary", () => {
  const values = new Set(BEGINNER_GLOSSARY_ENTRIES.map((entry) => entry.value));

  it("defines the market-mechanics terms the charts and formulas use", () => {
    for (const term of [
      "yield-curve",
      "treasury-maturities",
      "spread",
      "inversion",
      "basis-point",
      "credit-spread",
      "vix",
      "financial-conditions-index",
      "fred-series",
    ]) {
      assert.ok(values.has(term), `glossary is missing "${term}"`);
    }
  });

  it("keeps entry values unique so the accordion can key on them", () => {
    assert.equal(values.size, BEGINNER_GLOSSARY_ENTRIES.length);
  });
});

describe("plain-English substitutions", () => {
  it("rewrites multi-word phrases before the bare term they contain", () => {
    // Ordered the other way, the bare /tightness/ rule fired first and left
    // "Cash funding pressure" behind.
    assert.equal(
      applyPlainEnglishSubstitutions("Cash tightness is elevated."),
      "Funding pressure is elevated.",
    );
    assert.equal(
      applyPlainEnglishSubstitutions("Capital tightness eased."),
      "Funding pressure eased.",
    );
  });

  it("keeps every multi-word rule ahead of any bare term it contains", () => {
    const sources = PLAIN_ENGLISH_SUBSTITUTIONS.map((sub) =>
      sub.pattern.source.replace(/\\b/g, "").toLowerCase(),
    );
    sources.forEach((source, index) => {
      if (source.includes(" ")) return;
      const laterContaining = sources
        .slice(index + 1)
        .filter((other) => other.includes(" ") && other.split(" ").includes(source));
      assert.deepEqual(
        laterContaining,
        [],
        `"${source}" runs before multi-word rules that contain it: ${laterContaining.join(", ")}`,
      );
    });
  });

  it("carries no rule whose replacement only changes case", () => {
    const noOps = PLAIN_ENGLISH_SUBSTITUTIONS.filter(
      (sub) =>
        sub.pattern.source.replace(/\\b/g, "").toLowerCase() === sub.replacement.toLowerCase(),
    );
    assert.deepEqual(noOps.map((sub) => sub.replacement), []);
  });
});
