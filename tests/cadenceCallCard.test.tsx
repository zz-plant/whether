import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CadenceCallCard } from "../app/components/CadenceCallCard";
import { buildCadenceCallModel } from "../lib/report/cadenceCallModel";
import { evaluateRegime } from "../lib/regimeEngine";
import type { RegimeKey } from "../lib/regimeEngine";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";

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

const render = (
  horizon: "monthly" | "quarterly",
  refused = false,
  previousScores?: { tightness: number; riskAppetite: number },
  scores?: { tightness: number; riskAppetite: number },
) => {
  const base = withRefusal(refused, refused ? ["Signals disagree."] : []);

  return renderToStaticMarkup(
    <CadenceCallCard
      model={buildCadenceCallModel({
        horizon,
        assessment: scores ? { ...base, scores: { ...base.scores, ...scores } } : base,
        recordDate: "2026-08-31",
        recordDateLabel: "Aug 31, 2026",
        regimeHistory,
        previousScores,
      })}
    />,
  );
};

/** The bare fixture reads 100/28, which trips both guardrails. Cases about the distance
 *  to an edge need a reading that still has one. */
const midRange = { tightness: 61, riskAppetite: 56 };

/** The end-of-rail captions, left then right. Picked by anchor rather than by position
 *  in the markup, because the value readout prints a bare number too. */
const railEnds = (rail: string) => [
  rail.match(/text-anchor="start"[^>]*>([\d.]+)<\/text>/)?.[1],
  rail.match(/text-anchor="end"[^>]*>([\d.]+)<\/text>/)?.[1],
];

const railFor = (html: string, key: string) =>
  html.split("<svg").slice(1).find((rail) => rail.includes(`cadence-band-${key}`)) ?? "";

describe("CadenceCallCard", () => {
  it("states the horizon's bounded triad when the call stands", () => {
    const html = render("monthly");

    assert.ok(html.includes(DECISION_CONTRACT_LABELS.threshold.pauseIf));
    assert.ok(html.includes(DECISION_CONTRACT_LABELS.reversal.resumeWhen));
    assert.match(html, /Conditions by month/);
  });

  it("drops the triad under a refusal, where the weekly hero below carries it", () => {
    const html = render("monthly", true);

    assert.ok(!html.includes(DECISION_CONTRACT_LABELS.threshold.pauseIf));
    assert.match(html, /Call held:/);
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
    assert.match(html, /Aug 2026<\/span><span class="sr-only">: Sunny/);
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
    assert.match(render("quarterly"), /Conditions by quarter/);
    assert.doesNotMatch(render("quarterly"), /Conditions by month/);
  });

  it("puts the reading on the scale the sentences only describe", () => {
    const html = render("monthly", false, undefined, midRange);

    // A rail per composite signal, each announcing itself rather than sitting mute.
    assert.match(html, /id="cadence-band-tightness-monthly-title"/);
    assert.match(html, /id="cadence-band-riskAppetite-monthly-title"/);
    assert.match(html, /Funding pressure: 61/);
    assert.match(html, /Risk appetite: 56/);
    // Distance to each edge, named as the pause line and the resume line — the
    // two names the rest of the page uses for the pair.
    assert.ok(html.includes("15 points from the pause line · 5 from the resume line"));
    assert.ok(html.includes("12 points from the pause line · 2 from the resume line"));
  });

  it("states a tripped edge rather than measuring zero distance to it", () => {
    // The bare fixture reads 100 against a 76 guardrail: already past it, not near it.
    const html = render("monthly");

    assert.ok(html.includes("Past the pause line"));
    assert.ok(!html.includes("0 points from the pause line"));
  });

  it("calls one threshold by one name across chip, rail, and readout", () => {
    const html = render("monthly");

    // The rail used to label this one thing while the chip beside it used
    // another, which reads as two rules rather than one drawn twice. Both of
    // those names are retired; neither may come back.
    assert.doesNotMatch(html, />Trigger</);
    assert.doesNotMatch(html, />Guardrail</);
  });

  it("keeps the rails off the card under a refusal", () => {
    const html = render("monthly", true);

    assert.doesNotMatch(html, /cadence-band-tightness/);
  });

  it("draws the movement leg only when there is a prior read to draw it from", () => {
    const without = render("monthly");
    const with_ = render("monthly", false, { tightness: 20, riskAppetite: 80 });

    assert.doesNotMatch(without, /Rose from|Fell from/);
    assert.match(with_, /Rose from 20|Fell from 20/);
  });

  it("flips risk appetite so both rails put the guardrail on the right", () => {
    const html = render("monthly", false, undefined, midRange);

    // Funding pressure rises into trouble and risk appetite falls into it, so only one
    // of the two can keep its natural direction if the guardrail is to stay on the right.
    assert.deepEqual(railEnds(railFor(html, "tightness")), ["0", "100"]);
    assert.deepEqual(railEnds(railFor(html, "riskAppetite")), ["100", "0"]);
  });

  it("sends both movement legs the same way when both signals deteriorate", () => {
    // Funding pressure up and risk appetite down are the same news. On a flipped rail
    // they are also the same direction, which is the whole point of flipping it.
    const html = render("monthly", false, { tightness: 50, riskAppetite: 59 }, midRange);

    assert.match(railFor(html, "tightness"), /Rose from 50, moving toward the trigger/);
    assert.match(railFor(html, "riskAppetite"), /Fell from 59, moving toward the trigger/);
  });
});
