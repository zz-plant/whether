import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FormulaReference } from "../app/trust/formulaReference";
import { RegimeRadar } from "../app/components/home/RegimeRadar";
import {
  REGIME_CONFIDENCE_MEDIUM_THRESHOLD,
  REGIME_CONFIDENCE_NEAR_THRESHOLD,
  RISK_APPETITE_REGIME_THRESHOLD,
  TIGHTNESS_REGIME_THRESHOLD,
} from "../lib/regimeEngine";

describe("formula reference visuals", () => {
  const html = renderToStaticMarkup(<FormulaReference />);

  it("draws the regime rule as a quadrant carrying both thresholds", () => {
    assert.match(html, /Four conditions: funding pressure above/);
    assert.ok(html.includes(`>${TIGHTNESS_REGIME_THRESHOLD}<`), "tightness threshold labelled on the axis");
    assert.ok(html.includes(`>${RISK_APPETITE_REGIME_THRESHOLD}<`), "risk appetite threshold labelled on the axis");
    assert.doesNotMatch(html, /quadrant of funding pressure vs/, "the prose form is gone");
  });

  it("draws the quadrant the way up the brief's map does: Freezing top left, Sunny bottom right", () => {
    /* Until 2026-10-09 /trust put funding pressure across and risk appetite up,
       so its Sunny sat where the brief's map has Freezing. */
    const place = (svg: string, word: string) => {
      const tag = new RegExp(`<text([^>]*)>${word}</text>`).exec(svg)?.[1] ?? "";
      return { x: Number(/\bx="([\d.]+)"/.exec(tag)?.[1]), y: Number(/\by="([\d.]+)"/.exec(tag)?.[1]) };
    };
    const quadrant = html.slice(html.indexOf("<svg", html.indexOf("Four conditions: funding pressure above") - 400));
    const radar = renderToStaticMarkup(
      <RegimeRadar tightness={90} riskAppetite={48} tightnessThreshold={70} riskAppetiteThreshold={50} currentRegime="SCARCITY" />,
    );
    for (const [name, svg] of [["/trust", quadrant], ["the brief's map", radar]] as const) {
      const freezing = place(svg, "Freezing");
      const sunny = place(svg, "Sunny");
      assert.ok(Number.isFinite(freezing.x) && Number.isFinite(sunny.x), `${name}: both labels drawn`);
      assert.ok(freezing.x < sunny.x && freezing.y < sunny.y, `${name}: Freezing is left of and above Sunny`);
    }
    assert.match(quadrant, /rotate\(-90\)"[^>]*>Funding pressure →</, "funding pressure is the upright axis");
  });

  it("folds the exact arithmetic under the plain-language steps", () => {
    /* Open, the four formula cards were most of /trust on a phone and drew the
       eye ahead of the status strip (2026-09-30). Still server-rendered. */
    const plain = html.indexOf("In plain language");
    const fold = html.indexOf("Show the exact arithmetic");
    assert.ok(plain !== -1 && fold > plain, "plain steps first, then the fold");
    assert.ok(html.lastIndexOf("<details", fold) > plain, "the arithmetic sits in a disclosure");
    assert.ok(html.indexOf("Inputs — all public") > fold, "the cards are inside it");
  });

  it("draws the margin as a three-band ladder, named in words", () => {
    assert.match(html, />Close</);
    assert.match(html, />Within reach</);
    assert.match(html, />Clear</);
    assert.doesNotMatch(html, />(LOW|MED|HIGH)</, "the engine's band codes are storage, not copy");
    assert.ok(html.includes(`>${REGIME_CONFIDENCE_NEAR_THRESHOLD}<`));
    assert.ok(html.includes(`>${REGIME_CONFIDENCE_MEDIUM_THRESHOLD}<`));
  });

  it("opens with the two scores on their ladders when the page hands it positions", () => {
    /* The quadrant draws the rule; where this week's scores sit is the
       ladder, the one drawing every route uses for a score. Without positions
       — the static render above — no ladder and no bare score. */
    assert.doesNotMatch(html, /data-score-ladder/);
    const withPositions = renderToStaticMarkup(
      <FormulaReference
        positions={{
          tightness: { value: 72, previous: 68, lines: [{ kind: "callChange", value: TIGHTNESS_REGIME_THRESHOLD }] },
          riskAppetite: { value: 41, previous: null, lines: [{ kind: "callChange", value: RISK_APPETITE_REGIME_THRESHOLD }] },
        }}
      />,
    );
    assert.equal((withPositions.match(/data-score-ladder/g) ?? []).length, 2);
    assert.match(withPositions, /Last week: 68/);
    assert.ok(
      withPositions.indexOf("data-score-ladder") < withPositions.indexOf("Four conditions: funding pressure above"),
      "the ladders draw the reading before the quadrant explains the rule",
    );
  });

  it("draws both score ramps", () => {
    assert.match(html, /Rate component: 0 points at/);
    assert.match(html, /Inversion component: 0 points at no inversion/);
  });

  /*
   * The method layer defines its own terms in place (docs/glossary-retirement-plan.md,
   * Phase 4). Every instrument a formula names is glossed inside the card that uses it,
   * and nothing points the reader at a separate page to decode it.
   */
  it("says what each market term means where the formula uses it", () => {
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    for (const [term, gloss] of [
      ["high-yield credit spread", /extra interest riskier companies pay to borrow/],
      ["Chicago Fed", /zero is average, above zero is tighter than average/],
      ["Inversion depth", /how far below, in percentage points/],
      ["VIX", /forecast of turbulence over the next month/],
      ["short-term borrowing rate", /one-month Treasury bill rate/],
      ["Operating latitude", /room to hire, spend and commit/],
    ] as const) {
      assert.ok(text.includes(term), `formula cards should name ${term}`);
      assert.match(text, gloss, `${term} should be glossed in place`);
    }
    assert.doesNotMatch(text, /homepage headline|Haircuts|veto|hiking cycle|base-rate move/i);
    assert.doesNotMatch(html, /href="\/glossary"/, "no link out to decode the arithmetic");
  });
});
