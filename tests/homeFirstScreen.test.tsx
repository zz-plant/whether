import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { buildDecisionMovement } from "../lib/report/decisionMovement";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { LineStateBand } from "../app/components/home/LineStateBand";
import { DecisionHero } from "../app/components/DecisionHero";
import { describeLineStateBand, describeScoreFigureStanding, type HomeAreaLineSlot } from "../lib/report/home/homeSectionModel";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";

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

  /* In what the reader would do (2026-11-18): the area, the rule's own pause, the score
     that sets it off and where it is now. "A common risk-appetite move would pause
     Roadmap." named neither what pausing Roadmap means nor the number to watch. */
  it("names the area, what its pause stops, the score that sets it off and where it is", () => {
    const close = { line: "Risk appetite < 44", distance: "4 pts away", points: 4, met: false, metric: "riskAppetite" as const, value: 44, holdsAbove: false };
    const model = describeLineStateBand([{ area: "product-tempo", pause: close, pauseAction: "Pause long-payback bets" }]);
    assert.equal(model?.state, "near");
    assert.equal(model?.text, "Roadmap: pause long-payback bets if risk appetite falls below 44. It is 48 now.");
    assert.doesNotMatch(model?.text ?? "", /common|unusual|rare|move/, "the size of the move is the group's, below");
    assert.equal(
      describeLineStateBand([{ area: "hiring", pause: { ...pauseSlot(false, 0), value: 76, holdsAbove: true } }])?.text,
      "Hiring pauses if funding pressure rises above 76. It is 76 now.",
      "at the line, and with no verb to quote, the area's own",
    );
    assert.equal(describeLineStateBand([{ area: "hiring", pause: pauseSlot(false, 3) }])?.text, "Hiring is 3 pts from pausing.", "no number to name");
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

  /* 2026-11-18: a close line is a note about what would pause an area, and the red box,
     rule and words read it as an error. Inside the call (2026-11-21) the note keeps the
     sky's ink and a neutral rule; a crossed line keeps the red. */
  it("draws a close line as a note, not an error, and keeps its dashed ring", () => {
    const html = renderToStaticMarkup(
      <LineStateBand model={{ state: "near", area: "product-tempo", text: "Roadmap: pause long-payback bets if risk appetite falls below 44. It is 48 now." }} />,
    );
    assert.match(html, /data-line-state-placement="call"/);
    assert.match(html, /<svg[^>]*lucide-circle-dashed[^>]*text-line-crossed-fg/);
    const css = readFileSync("app/styles/forecast.css", "utf8");
    const near = /\.weather-line-band-call\[data-line-state-band="near"\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    assert.match(near, /border-left-color:\s*color-mix\(in srgb, var\(--app-text\)/);
    assert.match(near, /(?:^|\s)color:\s*var\(--app-text\)/);
    assert.doesNotMatch(near, /line-crossed/, "no front red on the note's words");
    const crossed = /\.weather-line-band-call\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    assert.match(crossed, /border-left-color:\s*var\(--line-crossed\)/, "a crossed line keeps the red");
    assert.match(crossed, /color:\s*var\(--line-crossed-ink\)/);
  });

  it("hands the exception to the card, and mounts no band above it", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");
    assert.ok(!routeSource.includes("<LineStateBand"), "the one-page brief prints the notice inside the call");
    assert.match(routeSource, /notice=\{lineStateBand\}/);
    assert.ok(routeSource.indexOf("notice={lineStateBand}") > routeSource.indexOf("<DecisionHero"), "the notice is the card's own");
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

  it("heads the call with the week line and the brief's number, inside the sky", () => {
    assert.match(withMargin, /class="weather-hero-period [^"]*basis-full"/);
    assert.match(withMargin, /data-brief-number[^>]*>[\s\S]*?No\. 2026-W45/);
    assert.ok(withMargin.indexOf("weather-hero-period") < withMargin.indexOf('id="weekly-call-title"'), "the week line comes first in the document");
    assert.ok(withMargin.indexOf("weather-hero-period") < withMargin.indexOf("<aside"), "the week line is in the reading column, not the rail");
    assert.match(withMargin, /<aside class="weather-hero-aside [^"]*"><div class="max-md:hidden"><div data-testid="scores"/);
  });

  it("keeps the week line on the same row in the sky without a margin", () => {
    assert.match(withoutMargin, /class="weather-hero-period [^"]*basis-full"/);
    assert.doesNotMatch(withoutMargin, /weather-hero-aside/);
  });

  it("puts the phone's two scores straight after the guidance, and leaves the numbers to the rail", () => {
    const h1 = withMargin.indexOf('id="weekly-call-title"');
    const phone = withMargin.indexOf("data-hero-phone-figure");
    assert.ok(h1 < phone, "guidance, then the phone's scores");
    assert.doesNotMatch(withMargin, /data-regime-meaning/, "the rail carries the scores and the why link on the homepage");
    assert.match(withoutMargin, /data-regime-meaning/, "a card without a margin still states what the numbers are");
  });

  it("runs 'Feels like' in the delta line, never as a row of its own", () => {
    const delta = withMargin.slice(withMargin.indexOf("data-conditions-since"));
    assert.match(delta.slice(0, delta.indexOf("weekly-call-title")), / ·<\/span> <a[^>]*data-feels-like/);
    assert.equal((withMargin.match(/data-feels-like/g) ?? []).length, 1);
  });
});

/*
 * The two figures beside the guidance draw hiring's lines (the first rule's), and until
 * 2026-11-18 said "Paused above 76." and "Clear. Pauses below 44." without saying what
 * was paused or clear: under "Freezing", a score reading "Clear" looked like a
 * contradiction, and risk appetite at 48 read as fine though hiring's restart also
 * needs it above 54.
 */
describe("the figures say whose lines they draw, and that a restart needs both", () => {
  const hiring = (scores: { tightness: number; riskAppetite: number }) => {
    const rule = buildCanonicalBoundedDecisionRules({ regime: "SCARCITY", thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 }, scores })[0];
    assert.equal(rule?.area, "hiring");
    return (metric: "tightness" | "riskAppetite") =>
      rule ? describeScoreFigureStanding({ area: rule.area, metric, pause: rule.pause.conditions, resume: rule.resume.conditions, scores }) : null;
  };

  it("names hiring as paused on the score past its line, with the whole restart", () => {
    const standing = hiring({ tightness: 90, riskAppetite: 48 });
    assert.deepEqual(standing("tightness"), {
      crossed: true,
      lead: "Hiring paused above 76",
      rest: "Restarts only when below 66 and risk appetite is above 54.",
    });
    assert.deepEqual(standing("riskAppetite"), {
      crossed: false,
      lead: "Clear of hiring’s pause at 44",
      rest: "Restart also needs above 54.",
    });
  });

  it("says a score already past its restart line is, while the other holds the pause", () => {
    assert.deepEqual(hiring({ tightness: 60, riskAppetite: 40 })("tightness"), {
      crossed: false,
      lead: "Clear of hiring’s pause at 76",
      rest: "Restart needs below 66, as now.",
    });
  });

  it("gives a running area its pause line alone, as a restart line lifts nothing", () => {
    const standing = hiring({ tightness: 60, riskAppetite: 60 });
    assert.deepEqual(standing("tightness"), { crossed: false, lead: "Hiring clear", rest: "Pauses above 76." });
    assert.deepEqual(standing("riskAppetite"), { crossed: false, lead: "Hiring clear", rest: "Pauses below 44." });
  });

  it("is what the rail's figures print, and what the phone's shared sentence names", () => {
    const routeSource = readFileSync("app/page.tsx", "utf8");
    assert.equal((routeSource.match(/standing=\{figureStanding\(ladder\.metric\)\}/g) ?? []).length, 1, "the rail's two figures take it");
    assert.match(routeSource, /data-hero-standing/, "the phone states it once for both figures");
    assert.match(routeSource, /sharedFigureStanding\.lead\.replace/, "without repeating the figure's own number");
  });
});
