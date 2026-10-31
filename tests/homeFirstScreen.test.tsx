import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

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

const restartSlot = (met: boolean, points: number): HomeAreaLineSlot => ({
  line: "Funding pressure < 66",
  distance: met ? "already met" : `${points} pts away`,
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

  it("names the area and its distance when a line is close", () => {
    const model = describeLineStateBand([{ area: "hiring", pause: pauseSlot(false, 3) }]);
    assert.equal(model?.state, "near");
    assert.equal(model?.text, "Hiring — 3 pts away from its pause line.");
    assert.equal(model?.href, "#what-it-changes");
  });

  it("says how far a hold is from lifting, not just that it is one", () => {
    const model = describeLineStateBand([
      { area: "hiring", pause: pauseSlot(true, 0), resume: restartSlot(false, 12) },
    ]);
    assert.equal(model?.state, "crossed");
    assert.equal(model?.text, "Hiring — 12 pts away from its restart line.");
  });

  it("picks the hold that lifts first", () => {
    const model = describeLineStateBand([
      { area: "hiring", pause: pauseSlot(true, 0), resume: restartSlot(false, 12) },
      { area: "capital-raising", pause: pauseSlot(true, 0), resume: restartSlot(false, 4) },
    ]);
    assert.equal(model?.text, "Fundraising — 4 pts away from its restart line.");
  });

  it("still states a hold with no numeric restart line", () => {
    const model = describeLineStateBand([{ area: "hiring", pause: pauseSlot(true, 0) }]);
    assert.equal(model?.state, "crossed");
    assert.equal(model?.text, "Hiring is on hold.");
  });

  it("prefers a crossed line to a close one", () => {
    const model = describeLineStateBand([
      { area: "hiring", pause: pauseSlot(false, 1) },
      { area: "burn-discipline", pause: pauseSlot(true, 0) },
    ]);
    assert.equal(model?.state, "crossed");
  });
});

describe("the band is drawn in the line state's ink", () => {
  it("prints the sentence and the way to the areas", () => {
    const html = renderToStaticMarkup(
      <LineStateBand model={{ state: "near", area: "hiring", text: "Hiring — 3 pts away from its pause line.", href: "#what-it-changes", action: "What to do" }} />,
    );
    assert.match(html, /data-line-state-band="near"/);
    assert.match(html, /Hiring — 3 pts away from its pause line\./);
    assert.match(html, /href="#what-it-changes"/);
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

  it("draws nothing when the page has no stage to name", () => {
    const html = renderToStaticMarkup(<DecisionHero weeklyCall="Hold approvals steady." regime="DEFENSIVE" />);
    assert.ok(!html.includes("data-reading-location"));
  });
});
