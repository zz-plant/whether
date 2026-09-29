import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FormulaReference } from "../app/trust/formulaReference";
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

  it("draws confidence as a three-band ladder, named in words", () => {
    assert.match(html, />Low</);
    assert.match(html, />Medium</);
    assert.match(html, />High</);
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
