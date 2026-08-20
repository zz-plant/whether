import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DecisionHero } from "../app/components/DecisionHero";
import { CurveTermsKey } from "../app/signals/components/curveTermsKey";
import { ScoreBandReference, SignalScaleNote } from "../app/components/ui/plainLanguage";
import { BEGINNER_GLOSSARY_ENTRIES } from "../lib/report/reportCopy";
import {
  compositeSignalScales,
  scoreBandReference,
  signalPlainEnglish,
} from "../lib/report/signalTranslations";

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
        postureLabel="Contraction"
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
    assert.match(html, /\/trust#beginner-glossary/);
  });

  it("draws the tightness ladder label from the shared scale constant", () => {
    const html = render();
    assert.equal(
      html.match(new RegExp(compositeSignalScales.tightness.directionLabel, "g"))?.length,
      2,
      "the ladder states the same direction in its visible label and its accessible description",
    );
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
