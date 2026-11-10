import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { buildDecisionMovement } from "../lib/report/decisionMovement";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { LineStateBand } from "../app/components/home/LineStateBand";
import { DecisionHero } from "../app/components/DecisionHero";
import { describeLineStateBand, type HomeAreaLineSlot } from "../lib/report/home/homeSectionModel";

/*
 * The page's silhouette changes with the weather (2026-10-31).
 *
 * A crossed pause line was drawn in five small places on `/` and loud in none,
 * so a held week looked like a calm one. The band above the call is the
 * exception: it exists only when an area is on hold or close to its line, and
 * it says the distance to the binding line — the one fact the card does not.
 */

const pauseSlot = (met: boolean, points: number): HomeAreaLineSlot => ({
  line: "Funding pressure > 76",
  distance: met ? "past the line" : `${points} pts away`,
  points,
  met,
  metric: "tightness",
});

describe("the band states the week's exception, or nothing", () => {
  it("says nothing on a calm week", () => {
    assert.equal(describeLineStateBand([]), null);
    assert.equal(describeLineStateBand([{ area: "hiring", pause: pauseSlot(false, 14) }]), null);
    /* A row with no pause line has nothing to be near. */
    assert.equal(describeLineStateBand([{ area: "hiring" }]), null);
  });

  /* The distance is how big a move it takes against the month-end record
     (2026-11-03), not points of a score no reader has a feel for. */
  it("names the area and how big a move would pause it when a line is close", () => {
    const model = describeLineStateBand([{ area: "hiring", pause: pauseSlot(false, 3) }]);
    assert.equal(model?.state, "near");
    assert.equal(model?.text, "An unusual funding-pressure move would pause Hiring.");
    assert.equal(describeLineStateBand([{ area: "hiring", pause: pauseSlot(false, 0) }])?.text, "Hiring is on the edge of pausing.");
  });

  it("marks the week a hold starts, naming every area it took", () => {
    const model = describeLineStateBand([
      { area: "hiring", pause: pauseSlot(true, 0), changedKind: "paused" },
      { area: "capital-raising", pause: pauseSlot(true, 0), changedKind: "paused" },
      { area: "burn-discipline", pause: pauseSlot(true, 0), changedKind: "held" },
    ]);
    assert.equal(model?.state, "crossed");
    assert.equal(model?.text, "Hiring and Fundraising paused since last week.");
    assert.equal(
      describeLineStateBand([{ area: "hiring", pause: pauseSlot(true, 0), changedKind: "paused" }], comparisonBasis({ label: "Aug 31" }))?.text,
      "Hiring paused since Aug 31.",
      "a month-end comparison dates the hold, so a later week cannot call it new",
    );
  });

  it("puts the cause of a new pause with its comparison date", () => {
    const movement = buildDecisionMovement({
      previous: { tightness: 90, riskAppetite: 53, comparedWith: { label: "Oct 26" } },
      scores: { tightness: 90, riskAppetite: 42 },
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      regime: "DEFENSIVE",
      areas: [{ area: "product-tempo", pause: [{ metric: "riskAppetite", operator: "<", value: 44, label: "Risk appetite" }], resume: [] }],
    });
    const model = describeLineStateBand(
      [{ area: "product-tempo", pause: pauseSlot(true, 0), changedKind: "paused" }],
      comparisonBasis({ label: "Oct 26" }),
      movement,
    );
    assert.equal(model?.text, "Since Oct 26, Roadmap paused after risk appetite fell below 44.");
  });

  it("leaves a standing hold to the card", () => {
    assert.equal(describeLineStateBand([{ area: "hiring", pause: pauseSlot(true, 0), changedKind: "held" }]), null);
    assert.equal(describeLineStateBand([{ area: "hiring", pause: pauseSlot(true, 0) }]), null);
  });

  it("still warns of a line close to pausing under a standing hold", () => {
    const model = describeLineStateBand([
      { area: "hiring", pause: pauseSlot(true, 0), changedKind: "held" },
      { area: "burn-discipline", pause: pauseSlot(false, 1) },
    ]);
    assert.equal(model?.state, "near");
  });

  it("prefers a crossed line to a close one", () => {
    const model = describeLineStateBand([
      { area: "hiring", pause: pauseSlot(false, 1) },
      { area: "burn-discipline", pause: pauseSlot(true, 0), changedKind: "paused" },
    ]);
    assert.equal(model?.state, "crossed");
  });
});

describe("the band is drawn in the line state's ink", () => {
  it("prints the sentence and leaves the way to the areas to the card", () => {
    const html = renderToStaticMarkup(
      <LineStateBand model={{ state: "near", area: "hiring", text: "A common risk-appetite move would pause Hiring." }} />,
    );
    assert.match(html, /data-line-state-band="near"/);
    assert.ok(html.includes("A common risk-appetite move would pause Hiring."));
    assert.doesNotMatch(html, /href=/);
  });

  it("mounts above the card and nowhere else on the route", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");
    const band = routeSource.indexOf("<LineStateBand");
    const hero = routeSource.indexOf("<DecisionHero");
    assert.ok(band !== -1, "the homepage mounts the band");
    assert.ok(band < hero, "the band is above the card it explains");
  });
});

describe("the meaning line carries the numbers it rests on", () => {
  it("prints the two scores and the one click to their basis", () => {
    const html = renderToStaticMarkup(
      <DecisionHero
        weeklyCall="Hold approvals steady."
        regime="DEFENSIVE"
        reading={{ numbers: "Funding pressure 90, risk appetite 55.", whyHref: "#why-conditions" }}
      />,
    );
    assert.match(html, /data-regime-meaning[^>]*>[\s\S]*Money is available but pricey\.[\s\S]*Funding pressure 90, risk appetite 55\./);
    assert.match(html, /href="#why-conditions"/, "the claim links to the section that shows why");
  });

  it("says the meaning alone where no reading is passed", () => {
    const html = renderToStaticMarkup(<DecisionHero weeklyCall="Hold approvals steady." regime="DEFENSIVE" />);
    assert.match(html, /Money is available but pricey\./);
    assert.ok(!html.includes("data-reading-numbers"), "an answer page prints no scores of its own");
  });
});

describe("the card says where the reading is scaled to", () => {
  it("draws the stage and runway chip as a control that opens the calibration", () => {
    const html = renderToStaticMarkup(
      <DecisionHero
        weeklyCall="Hold approvals steady."
        regime="DEFENSIVE"
        location={{ label: "Series A · 6–12 mo · short payback only", href: "#company-calibration", hint: "Change your stage and runway" }}
      />,
    );
    assert.match(html, /data-reading-location/);
    assert.match(html, /href="#company-calibration"/);
    assert.match(html, /Series A · 6–12 mo · short payback only/);
  });

  it("names the action in the chip, not only in a title a touch screen never shows", () => {
    // Beside a filled placard that is not a control, the bordered chip read as a
    // second badge: its only hint was `title`, which has no hover to fire on a
    // phone (2026-11-02).
    const html = renderToStaticMarkup(
      <DecisionHero
        weeklyCall="Hold approvals steady."
        regime="DEFENSIVE"
        location={{ label: "Series A · 12–24 mo", href: "#company-calibration", hint: "Change your stage and runway" }}
      />,
    );
    assert.match(html, />change<span class="sr-only"> stage and runway<\/span>/);
    assert.match(html, /underline/);
  });

  it("draws nothing when the page has no stage to name", () => {
    const html = renderToStaticMarkup(<DecisionHero weeklyCall="Hold approvals steady." regime="DEFENSIVE" />);
    assert.ok(!html.includes("data-reading-location"));
  });
});

/*
 * The first screen holds the week's statement whole (2026-11-10): at 1440 by 900 and on a
 * 390 by 844 phone, the guidance, the two scores and all five areas, measured in a browser
 * with the bundled reading. These pin the order that makes the room. The week line heads
 * the margin from `md`, so the reading column starts on the condition word; on a phone the
 * two scores follow the guidance and the facts line gives way to them; "Feels like" runs in
 * the delta line instead of taking a row of its own.
 */
describe("the first screen keeps the week's statement on one screen", () => {
  const props = {
    weeklyCall: "Protect the revenue you already have.",
    regime: "DEFENSIVE",
    since: "Since Sep 2026",
    direction: "No area paused or restarted since Oct 26",
    periodControl: <span data-testid="week">Week of Nov 2, 2026</span>,
    briefNumber: { label: "2026-W45", href: "/brief/2026-w45" },
    reading: { numbers: "Funding pressure 90, risk appetite 54.", whyHref: "#why-conditions", facts: "Funding pressure is 90." },
    feelsLike: { regime: "SCARCITY" as const, href: "#why-conditions" },
  };
  const withMargin = renderToStaticMarkup(
    <DecisionHero {...props} aside={<div data-testid="scores" />} phoneFigure={<div data-testid="phone-scores" />} />,
  );
  const withoutMargin = renderToStaticMarkup(<DecisionHero {...props} />);

  it("heads the margin with the week line and the brief's number when there is a margin", () => {
    assert.match(withMargin, /class="weather-hero-period [^"]*weather-hero-margin-head[^"]*md:col-start-2 md:row-start-1/);
    assert.match(withMargin, /data-brief-number[^>]*>[\s\S]*?No\. 2026-W45/);
    assert.ok(withMargin.indexOf("weather-hero-margin-head") < withMargin.indexOf('id="weekly-call-title"'), "the week line comes first in the document");
    assert.match(withMargin, /class="weather-hero-aside [^"]*md:col-start-2 md:row-start-2/);
  });

  it("keeps the week line on its own row above the condition word without one", () => {
    assert.doesNotMatch(withoutMargin, /weather-hero-margin-head/);
    assert.match(withoutMargin, /class="weather-hero-period [^"]*basis-full/);
  });

  it("puts the phone's two scores straight after the guidance, and the facts line from md up", () => {
    const h1 = withMargin.indexOf('id="weekly-call-title"');
    const phone = withMargin.indexOf("data-hero-phone-figure");
    const meaning = withMargin.indexOf("data-regime-meaning");
    assert.ok(h1 < phone && phone < meaning, "guidance, then the phone's scores, then the facts line");
    assert.match(withMargin, /class="[^"]*max-md:hidden[^"]*" data-regime-meaning/);
    assert.doesNotMatch(withoutMargin, /max-md:hidden[^"]*" data-regime-meaning/, "with no phone scores the facts line shows at every width");
  });

  it("runs 'Feels like' in the delta line, never as a row of its own", () => {
    const delta = withMargin.slice(withMargin.indexOf("data-conditions-since"));
    assert.match(delta.slice(0, delta.indexOf("weekly-call-title")), / · <a[^>]*data-feels-like/);
    assert.equal((withMargin.match(/data-feels-like/g) ?? []).length, 1);
  });
});
