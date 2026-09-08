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
    assert.match(html, /Regime quadrants: funding pressure above/);
    assert.ok(html.includes(`>${TIGHTNESS_REGIME_THRESHOLD}<`), "tightness threshold labelled on the axis");
    assert.ok(html.includes(`>${RISK_APPETITE_REGIME_THRESHOLD}<`), "risk appetite threshold labelled on the axis");
    assert.doesNotMatch(html, /quadrant of funding pressure vs/, "the prose form is gone");
  });

  it("draws confidence as a three-band ladder", () => {
    assert.match(html, />LOW</);
    assert.match(html, />MED</);
    assert.match(html, />HIGH</);
    assert.ok(html.includes(`>${REGIME_CONFIDENCE_NEAR_THRESHOLD}<`));
    assert.ok(html.includes(`>${REGIME_CONFIDENCE_MEDIUM_THRESHOLD}<`));
  });

  it("draws both score ramps", () => {
    assert.match(html, /Rate component: 0 points at/);
    assert.match(html, /Inversion component: 0 points at no inversion/);
  });
});
