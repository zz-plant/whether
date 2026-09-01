import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CadenceCallCard } from "../app/components/CadenceCallCard";
import { buildCadenceCallModel } from "../lib/report/cadenceCallModel";
import { evaluateRegime } from "../lib/regimeEngine";
import type { RegimeKey } from "../lib/regimeEngine";

const rawAssessment = evaluateRegime({
  source: "https://example.com/treasury",
  record_date: "2026-08-31",
  fetched_at: "2026-08-31T09:00:00.000Z",
  isLive: true,
  yields: { oneMonth: 5.2, twoYear: 4.8, tenYear: 4.5 },
});

const withRefusal = (refused: boolean, reasons: string[] = []) => ({
  ...rawAssessment,
  policyAssessment: {
    ...rawAssessment.policyAssessment,
    refusal: { ...rawAssessment.policyAssessment.refusal, refused, reasons },
  },
});

const regimeHistory: Array<{ record_date: string; regime: RegimeKey }> = [
  { record_date: "2026-06-30", regime: "DEFENSIVE" },
  { record_date: "2026-07-31", regime: "EXPANSION" },
  { record_date: "2026-08-31", regime: "EXPANSION" },
];

const render = (horizon: "monthly" | "quarterly", refused = false) =>
  renderToStaticMarkup(
    <CadenceCallCard
      model={buildCadenceCallModel({
        horizon,
        assessment: withRefusal(refused, refused ? ["Signals disagree."] : []),
        recordDate: "2026-08-31",
        recordDateLabel: "Aug 31, 2026",
        regimeHistory,
      })}
    />,
  );

describe("CadenceCallCard", () => {
  it("states the horizon's bounded triad when the call stands", () => {
    const html = render("monthly");

    assert.match(html, /Guardrail/);
    assert.match(html, /Reversal/);
    assert.match(html, /Regime by month/);
  });

  it("drops the triad under a refusal, where the weekly hero below carries it", () => {
    const html = render("monthly", true);

    assert.doesNotMatch(html, /Guardrail/);
    assert.match(html, /Posture change held:/);
    assert.match(html, /Signals disagree\./);
  });

  it("names its own heading rather than borrowing the weekly one", () => {
    const monthly = render("monthly");
    const quarterly = render("quarterly");

    assert.match(monthly, /id="monthly-call-title"/);
    assert.match(monthly, /aria-labelledby="monthly-call-title"/);
    assert.match(quarterly, /id="quarterly-call-title"/);
  });

  it("gives each period chip an accessible regime name, not colour alone", () => {
    const html = render("monthly");

    // The chip's fill is the only visual carrier of the regime; the name has to
    // reach a screen reader some other way.
    assert.match(html, /Aug 2026<\/span><span class="sr-only">: Expand/);
  });

  it("names the artifact its copy button copies, not the hero's", () => {
    // DD-005 keeps one `Copy Brief` on `/`. This control sits on the same screen under a
    // non-weekly cadence and copies a different artifact, so it must not share that name.
    const monthly = render("monthly");

    assert.match(monthly, /aria-label="Copy monthly call"/);
    assert.doesNotMatch(monthly, /aria-label="Copy Brief"/);
    assert.match(render("quarterly"), /aria-label="Copy quarterly call"/);
  });

  it("renders the two horizons differently", () => {
    assert.notEqual(render("monthly"), render("quarterly"));
    assert.match(render("quarterly"), /Regime by quarter/);
    assert.doesNotMatch(render("quarterly"), /Regime by month/);
  });
});
