import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { AreaStrip } from "../app/components/home/AreaStrip";
import { DecisionHero } from "../app/components/DecisionHero";
import { ScoreLadder } from "../app/components/ui/scoreLadder";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";
import type { AreaStripModel } from "../lib/report/home/homeSectionModel";
import { buildWeekMove, travelTimeAt } from "../lib/report/home/weekMove";

/*
 * The week's move, replayed on the card (2026-11-09).
 *
 * On a week the conditions changed or an area changed standing, the card performs the
 * change once on arrival. Three things have to stay true for that to be honest: a week
 * nothing moved builds nothing, the page's text says this week's state once (the earlier
 * state is drawn, never written), and with the stylesheet's motion off the card is the
 * finished card.
 */

const thresholds = { tightness: 70, riskAppetite: 50 };

type Cell = AreaStripModel["cells"][number];

const strip = (states: Partial<Record<Cell["area"], Cell["state"]>>): AreaStripModel => ({
  cells: decisionAreaOrder.flatMap((area) => {
    const state = states[area];
    return state ? [{ area, state }] : [];
  }).map(({ area, state }) => ({
    area,
    state,
    label: state === "crossed" ? "On hold" : state === "near" ? "Close to pausing" : "Clear",
    href: `#area-${area}`,
  })),
  restart: null,
});

describe("the week's move is built only on a week something moved", () => {
  it("builds nothing when the conditions held and no area changed standing", () => {
    const same = strip({ hiring: "crossed", "product-tempo": "clear" });
    assert.equal(
      buildWeekMove({
        since: "Oct 26",
        previous: { tightness: 88, riskAppetite: 47 },
        current: { tightness: 90, riskAppetite: 46 },
        previousRegime: "SCARCITY",
        regime: "SCARCITY",
        thresholds,
        strip: same,
        previousStrip: same,
      }),
      null,
    );
  });

  it("builds nothing without an earlier reading to travel from", () => {
    assert.equal(
      buildWeekMove({
        since: "last week",
        previous: null,
        current: { tightness: 90, riskAppetite: 46 },
        previousRegime: "DEFENSIVE",
        regime: "SCARCITY",
        thresholds,
        strip: null,
        previousStrip: null,
      }),
      null,
    );
  });

  it("names the earlier conditions and each area's earlier standing", () => {
    const move = buildWeekMove({
      since: "Oct 26",
      previous: { tightness: 90, riskAppetite: 53 },
      current: { tightness: 90, riskAppetite: 46 },
      previousRegime: "DEFENSIVE",
      regime: "SCARCITY",
      thresholds,
      strip: strip({ hiring: "crossed", "product-tempo": "near" }),
      previousStrip: strip({ hiring: "crossed", "product-tempo": "clear" }),
    });
    assert.equal(move?.conditions?.from, "DEFENSIVE");
    assert.deepEqual(move?.areas, { "product-tempo": { state: "clear", label: "Clear" } });
    /* 53 → 46 passes 50 three sevenths of the way; eased in and out, that is a little
       before the travel's midpoint in time. */
    const at = move?.conditions?.at ?? 0;
    assert.ok(at > 0.4 && at < 0.5, `crossed at ${at}`);
  });
});

describe("the travel's clock", () => {
  it("runs from 0 to 1, in order, and is symmetric about the middle", () => {
    assert.equal(travelTimeAt(0), 0);
    assert.equal(travelTimeAt(1), 1);
    assert.equal(travelTimeAt(0.5), 0.5);
    assert.ok(travelTimeAt(0.1) < travelTimeAt(0.3) && travelTimeAt(0.3) < travelTimeAt(0.9));
    /* Ease-in-out: a tenth of the distance takes more than a tenth of the time. */
    assert.ok(travelTimeAt(0.1) > 0.1);
  });
});

describe("the card draws the earlier state and writes only this week's", () => {
  const move = {
    since: "Oct 26",
    from: { tightness: 90, riskAppetite: 53 },
    conditions: { from: "DEFENSIVE" as const, at: 0.475 },
    areas: { "product-tempo": { state: "clear" as const, label: "Clear" } },
  };

  it("marks the card, sets when the stamp turns and offers the replay", () => {
    const html = renderToStaticMarkup(
      <DecisionHero weeklyCall="Hold new hires." regime="SCARCITY" earlier="Was Cloudy on Oct 26" move={move} />,
    );
    assert.match(html, /data-week-move="arrival"/);
    assert.match(html, /--week-move-cross:0\.475/);
    assert.match(html, /aria-label="Replay the move since Oct 26"/);
    /* The earlier stamp is hidden from assistive tech and carries its word as an attribute. */
    assert.match(html, /aria-hidden="true"[^>]*data-regime="DEFENSIVE"[^>]*data-week-move-stamp/);
    assert.match(html, /data-text="Cloudy"/);
    assert.equal(html.split(">Cloudy<").length, 1, "the earlier conditions' word is in no text node");
    assert.equal(html.split(">Freezing<").length, 2);
  });

  it("is the plain card on a week nothing moved", () => {
    const html = renderToStaticMarkup(<DecisionHero weeklyCall="Hold new hires." regime="SCARCITY" />);
    assert.doesNotMatch(html, /week-move/);
  });

  it("ticks only the areas that moved, in the row's order", () => {
    const html = renderToStaticMarkup(
      <AreaStrip model={strip({ hiring: "crossed", "product-tempo": "near", "burn-discipline": "clear" })} earlier={{ "product-tempo": move.areas["product-tempo"], "burn-discipline": { state: "crossed", label: "On hold" } }} />,
    );
    assert.equal(html.split("data-week-move-area=").length - 1, 2);
    assert.match(html, /--week-move-i:0[^>]*data-week-move-area="clear"/);
    assert.match(html, /--week-move-i:1[^>]*data-week-move-area="crossed"/);
    assert.match(html, /data-text="Clear"/);
    /* Hiring held, and "On hold" is written once: Spending's earlier standing is an attribute. */
    assert.equal(html.split(">On hold<").length - 1, 1);
  });

  it("moves the ladder's reading by transform, and marks only the lines it passed", () => {
    const lines = [
      { kind: "pause" as const, value: 44 },
      { kind: "callChange" as const, value: 50 },
      { kind: "resume" as const, value: 54 },
    ];
    const html = renderToStaticMarkup(<ScoreLadder label="Risk appetite" value={46} previous={53} lines={lines} travel />);
    assert.match(html, /class="week-move-dot[^"]*"[^>]*--week-move-dx:/);
    assert.equal(html.split("week-move-tick").length - 1, 1, "53 to 46 passes 50, not 44 or 54");
    const still = renderToStaticMarkup(<ScoreLadder label="Risk appetite" value={46} previous={53} lines={lines} />);
    assert.doesNotMatch(still, /week-move/);
  });
});

describe("the stylesheet rests in this week's state", () => {
  const css = readFileSync("app/styles/week-move.css", "utf8");

  it("runs only where motion is allowed, and not in screenshot mode", () => {
    const [rest, motion] = css.split("@media screen and (prefers-reduced-motion: no-preference)");
    assert.ok(motion, "the animations sit inside the motion query");
    assert.doesNotMatch(rest ?? "", /animation:/);
    assert.match(motion, /html:not\(\[data-screenshot="true"\]\)/);
    /* Every `animation:` is before the keyframes, which only describe where a piece came from. */
    assert.doesNotMatch(css.slice(css.indexOf("@keyframes")), /animation:/);
  });

  it("animates transform and opacity only", () => {
    const keyframes = css.slice(css.indexOf("@keyframes"));
    const properties = [...keyframes.matchAll(/^\s+([a-z-]+):/gm)].map((match) => match[1]);
    assert.deepEqual(
      [...new Set(properties)].sort(),
      ["opacity", "scale", "stroke-dashoffset", "transform", "translate"],
    );
  });
});
