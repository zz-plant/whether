import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";

/* The stage selector and the subscribe form read the router. Spread, so the next
   file still gets the real module's other exports. */
const mockAny: any = mock;
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { DecisionHero } from "../app/components/DecisionHero";
import { RegimeRadar } from "../app/components/home/RegimeRadar";
import { WhatWouldChangeSection } from "../app/components/home/WhatWouldChangeSection";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { ConditionsLegend } from "../app/components/home/ConditionsLegend";
import { CompanyCalibration } from "../app/components/home/CompanyCalibration";
import { ShareLinks } from "../app/components/home/ShareLinks";
import { sinceLastVisitDelta } from "../app/components/home/SinceLastVisit";

/*
 * Each fact once per page, in its most useful form (2026-10-09). The homepage
 * printed the four conditions twice above the fold, the change from Cloudy to
 * Freezing three times, the two scores about five times and the stage and runway
 * as a sentence over the two controls that show them; /history printed "Cloudy,
 * held 1 month" four times. These pin which element keeps each fact.
 *
 * `/` suspends at its data boundary in this suite, so its sections render here
 * from the props `app/page.tsx` builds, and the wiring is read from the route.
 */

const text = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const route = readFileSync("app/page.tsx", "utf8");
const lines = { tightness: 70, riskAppetite: 50 };
const changeLines = { tightnessRegime: 70, riskAppetiteRegime: 50 };
const ladders = [
  { metric: "tightness" as const, label: "Funding pressure", value: 90, previous: 90, lines: [{ kind: "callChange" as const, value: 70 }] },
  { metric: "riskAppetite" as const, label: "Risk appetite", value: 49, previous: 56, lines: [{ kind: "callChange" as const, value: 50 }] },
];
const trail = { points: [{ tightness: 60, riskAppetite: 60 }, { tightness: 75, riskAppetite: 55 }], caption: "Trail: month-ends Aug–Sep 2026, then this week.", caveat: null };

describe("/ draws the two scores once at each width", () => {
  const radar = <RegimeRadar tightness={90} riskAppetite={49} tightnessThreshold={70} riskAppetiteThreshold={50} currentRegime="SCARCITY" trail={trail.points} />;
  const hero = renderToStaticMarkup(<DecisionHero weeklyCall="Freeze." regime="SCARCITY" aside={radar} />);
  const watch = renderToStaticMarkup(
    <WhatWouldChangeSection ladders={ladders} flipProximity={[]} callChangeLines={lines} regime="SCARCITY" conditionsTrail={trail} />,
  );

  it("on the card's map from md up, and on the section's map below md", () => {
    assert.match(hero, /<div class="max-md:hidden"><figure[\s\S]*?Funding pressure 90 · Risk appetite 49/);
    assert.match(watch, /<figure class="[^"]*\bmd:hidden\b[^"]*"[\s\S]*?Funding pressure 90 · Risk appetite 49/);
    assert.match(route, /<WhatWouldChangeSection[\s\S]*?conditionsTrail=\{conditionsTrail\}/, "the route hands the section the trail, which moves its map below md");
  });

  it("with no 'This week's scores' list under the areas", () => {
    assert.doesNotMatch(readFileSync("app/components/home/DecisionPicker.tsx", "utf8"), /This week&apos;s scores|<SignalReading/);
    assert.doesNotMatch(route, /<DecisionPicker[^>]*scores=/);
  });

  it("with the trail's caption under the map it describes, not in the card's left column", () => {
    assert.match(route, /trailCaption=\{conditionsTrail\.caption\}/);
    assert.doesNotMatch(route, /asideNote=/);
  });
});

describe("/ defines the four conditions once at each width", () => {
  it("as the one-line legend below md, where the card has no map", () => {
    const html = renderToStaticMarkup(<ConditionsLegend thresholds={changeLines} currentRegime="SCARCITY" />);
    assert.match(html, /<section[^>]*class="[^"]*\bmd:hidden\b/);
    assert.match(html, /<span class="md:hidden" data-conditions-definitions="true">/);
    const shared = renderToStaticMarkup(<ConditionsLegend thresholds={changeLines} arrival="share" />);
    assert.doesNotMatch(/<section[^>]*>/.exec(shared)?.[0] ?? "", /md:hidden/, "the share greeting is not a definition and shows at every width");
  });

  it("as the map from md up, with each line's value at the line and the method one click away", () => {
    const html = renderToStaticMarkup(
      <RegimeRadar tightness={90} riskAppetite={49} tightnessThreshold={70} riskAppetiteThreshold={50} currentRegime="SCARCITY" footer={<span>How they are set</span>} />,
    );
    assert.match(html, />70<\/text>[\s\S]*>50<\/text>/);
    assert.match(html, /How they are set/);
    assert.match(route, /footer=\{[\s\S]*?href="\/trust#formula-reference"[\s\S]*?How they are set/);
  });
});

describe("/ says what changed since a visit only when the card has not", () => {
  const now = { regimeLabel: "Freezing", call: "Approve only renewals." };

  it("says nothing when nothing moved", () => {
    assert.equal(sinceLastVisitDelta(now, now, undefined), null);
  });

  it("says nothing when the change is the earlier conditions the card's stamp line names", () => {
    assert.equal(sinceLastVisitDelta({ regimeLabel: "Cloudy", call: "Hire selectively." }, now, "Cloudy"), null);
  });

  it("says the change when the visit saw other conditions than the card names", () => {
    assert.deepEqual(sinceLastVisitDelta({ regimeLabel: "Sunny", call: "Hire." }, now, "Cloudy"), { regimeChanged: true, callChanged: true });
    assert.deepEqual(sinceLastVisitDelta({ regimeLabel: "Cloudy", call: "Hire." }, now, undefined), { regimeChanged: true, callChanged: true });
  });

  it("says the guidance changed under the same conditions", () => {
    assert.deepEqual(sinceLastVisitDelta({ regimeLabel: "Freezing", call: "Freeze." }, now, "Cloudy"), { regimeChanged: false, callChanged: true });
  });

  it("carries neither what would change the guidance nor the lines-crossed sentence, which are sections below", () => {
    const mount = route.slice(route.indexOf("<SinceLastVisit"), route.indexOf("/>", route.indexOf("<SinceLastVisit")));
    assert.doesNotMatch(mount, /callChangeLine=|linesCrossedLead=/);
    assert.match(mount, /cardEarlierRegimeLabel=/);
  });
});

describe("/ opens 'What changed this week' on its table", () => {
  it("with no lead restating the card, and one sentence only when nothing was compared", () => {
    const compared = renderToStaticMarkup(<WhatChangedSection rows={[]} comparisonUnavailable={false} />);
    assert.doesNotMatch(compared, /<p class="max-w-3xl/);
    const none = renderToStaticMarkup(<WhatChangedSection rows={[]} lead="No previous week to compare the scores against." comparisonUnavailable />);
    assert.match(none, /No previous week to compare the scores against\./);
    assert.match(route, /lead=\{comparisonUnavailable \? describeWeeklyMovement/);
  });
});

describe("/ states the stage and runway in the controls alone", () => {
  it("drops the sentence over them and marks the defaults inside them", () => {
    const html = renderToStaticMarkup(<CompanyCalibration stageLabel="Series A" activeStage="series-a" />);
    assert.doesNotMatch(text(html), /Lines set for|the defaults/);
    assert.match(text(html), /First repeatable revenue \(default\)/);
    assert.match(text(html), /Follow the guidance \(default\)/);
    assert.match(html, /<section[^>]*class="[^"]*max-sm:hidden/, "on a phone the header pills are the controls, and an empty section does not print");
    /* Unless a link targets it: the shared-arrival greeting's "Scale it to your stage and runway". */
    assert.match(html, /<section[^>]*class="[^"]*\btarget:block\b/, "a link to the section shows it on a phone");
    assert.match(html, /<details class="[^"]*\bgroup-target\/calibration:block\b/, "and its controls with it");
  });
});

describe("/ ends on one line, not a Share section", () => {
  it("names the published brief by its week, with no third and fourth date", () => {
    const html = renderToStaticMarkup(<ShareLinks currentRecordDate="2026-10-07" />);
    assert.doesNotMatch(html, /<h2/);
    assert.doesNotMatch(text(html), /The reading above is from|frozen record is dated/);
    assert.match(text(html), /Published brief for the week of Oct 5, 2026 →/);
    assert.match(html, /href="\/brief\/2026-w41"/);
  });
});

describe("the desktop sticky strip waits for the card to leave the screen", () => {
  it("is gated on the card, as the running head is", () => {
    const strip = readFileSync("app/components/StickyCallStrip.tsx", "utf8");
    assert.match(strip, /\{showStrip && heroLeft \? \(/);
  });
});

describe("/history prints each record fact once", () => {
  it("held months on the stamp and the tile, the counts on their tiles, the margin study as its headline", async () => {
    const page = await import("../app/history/page");
    const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
    const visible = text(html.replace(/<p class="sr-only">[\s\S]*?<\/p>/g, ""));

    assert.match(visible, /Last completed month/);
    assert.equal((visible.match(/Current conditions held/g) ?? []).length, 1);
    assert.doesNotMatch(visible, /held \d+ months? since|month-end conditions had been/);
    assert.doesNotMatch(visible, /\d+ changes in conditions/, "the change count is its tile's");
    const readings = /Months on record (\d+)/.exec(visible)?.[1];
    assert.ok(readings, "the readings tile prints the count");
    assert.ok(!visible.includes(`${readings} month-end readings`), "the reading count is its tile's");
    assert.doesNotMatch(visible, /Record starts|Fixed historical snapshot/);

    const margin = visible.slice(visible.indexOf("How often a close call held"));
    assert.match(margin, /^How often a close call held Across \d+ month-to-month comparisons, conditions were the same the following month \d+ times, or \d+%\./);
    assert.doesNotMatch(html, /Points from the line/, "the band table is /calibration's");
    assert.match(html, /href="\/calibration"/);
  });
});
