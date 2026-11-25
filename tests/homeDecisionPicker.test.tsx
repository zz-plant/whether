import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionPicker, type DecisionPickerOption } from "../app/components/home/DecisionPicker";
import { findLeadAnswerForArea } from "../app/answers/decisionPages";
import { findRecentCallChanges } from "../lib/report/lastTimeCallChanged";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";
import {
  buildAreaGroups,
  buildHomeDecisionCookie,
  buildHomeViewHref,
  buildSharedBriefQuery,
  parseHomeDecision,
  readHomeDecisionCookie,
  resolveHomeDecision,
} from "../lib/report/home/homeSectionModel";
import { carrySharedView } from "../lib/report/briefArtifact";
import { areasMovedBy } from "../lib/report/signalFlow";
import { AreaGroups } from "../app/components/home/AreaGroups";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import type { SignalChangeRow } from "../lib/report/home/homeSectionModel";
import type { ScoreMoveHistogram } from "../lib/report/marketMoveScale";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";
import * as nextNavigation from "next/navigation";

const mockAny: any = mock;

/* The picker reads the app router; renderToStaticMarkup mounts none. Installed
   here so the file answers for its own dependencies rather than passing on
   another suite's ordering luck. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

/**
 * "What are you deciding?" on `/`: the five areas, third on the page after the
 * verdict and the stage and runway (2026-10-09). It no longer folds the brief on a
 * first visit or carries the alert, the record and a reveal button: those are
 * sections of their own in one order for every reader.
 *
 * The homepage itself does not render in this suite (it suspends at the report
 * read path), so the picker is rendered on its own.
 */

const OPTIONS: DecisionPickerOption[] = decisionAreaOrder.map((area, index) => ({
  area,
  rule: `Rule for ${area}`,
  /* Four areas past their pause line and one four points short of it, as the
     week of Oct 5, 2026 read at the default calibration. */
  pause:
    index === 1
      ? { line: "Risk appetite < 40", distance: "4 pts away", points: 4, met: false, metric: "riskAppetite", value: 40, holdsAbove: false }
      : { line: "Funding pressure > 76", distance: "crossed", points: 14, met: true, metric: "tightness", value: 76, holdsAbove: true },
  resume: { line: "Funding pressure < 66", distance: "17 pts away", points: 17, met: false, metric: "tightness", value: 66, holdsAbove: false },
}));

const GROUPS = buildAreaGroups(OPTIONS, { tightness: 83, riskAppetite: 44 });

describe("decision picker", () => {
  const html = renderToStaticMarkup(
    <DecisionPicker options={OPTIONS} groups={GROUPS} regime="SCARCITY">
      <p data-child>The fold</p>
    </DecisionPicker>,
  );

  it("is the areas section, with the old anchor and an h2", () => {
    assert.match(html, /^<section id="what-it-changes"/);
    /* The heading is the question a reader would ask (2026-11-18). */
    assert.match(html, /<h2[^>]*>What’s on hold\?<\/h2>/);
    assert.doesNotMatch(html, /data-first-visit/, "nothing in it is first-visit only");
    assert.doesNotMatch(html, /Show the full brief/);
  });

  it("asks one question with an answer for every area, each under the area's own name", () => {
    for (const area of ["Hiring", "Roadmap", "Fundraising", "Spending", "New bets"]) {
      assert.ok(html.includes(area), `missing option: ${area}`);
    }
    for (const retired of ["Hire someone", "Change the roadmap", "Raise money", "Approve new spend", "Start something new"]) {
      assert.ok(!html.includes(retired), `retired verb label: ${retired}`);
    }
  });

  it("leaves the alert, the record and the stage and runway to their own sections", () => {
    assert.doesNotMatch(html, /Tell me when the guidance changes|The last time conditions|Has this happened before|Lines set for/);
  });

  it("prints what it is handed after the groups", () => {
    assert.ok(html.indexOf("data-child") > html.lastIndexOf('id="area-'), "the fold follows the rules");
  });

  /* The scores print on the conditions map and in "What changed" at every width;
     the picker restated them as a "This week's scores" list (2026-10-09). */
  it("does not restate the two scores", () => {
    assert.doesNotMatch(html, /This week(&#x27;|')s scores/);
    assert.doesNotMatch(html, /\/100: /);
  });

  it("names each area once, as the control that opens it", () => {
    /* A strip of five choices under the groups printed the five names again, and the
       badges on it said each state a second time (2026-11-03). */
    assert.doesNotMatch(html, /<fieldset|type="radio"|data-line-state-badge/);
    const toggles = [...html.matchAll(/<button type="button" aria-expanded="false"[^>]*>([^<]+)<svg/g)].map((match) => match[1]);
    assert.deepEqual(toggles, ["Hiring", "Fundraising", "Spending", "New bets", "Roadmap"], "held first, then the rest");
    assert.ok(html.indexOf("data-area-groups") > html.indexOf("What’s on hold?"), "under the heading");
  });

  /* "What's on hold?" is answered first, with the held areas by name in the page's order
     (2026-11-18); a saved copy's answer is the old reading's, in the past tense with its
     date. It replaced the count ("4 of 5 areas are on hold.") a saved copy alone printed. */
  it("answers its question with the held areas by name, and dates a saved copy's", () => {
    assert.doesNotMatch(html, /already covered by this week/);
    assert.match(html, /<\/h2><\/div><p data-section-lead="true"[^>]*>Hiring, Fundraising, Spending and New bets\.<\/p>/);
    const saved = renderToStaticMarkup(<DecisionPicker options={OPTIONS} groups={GROUPS} regime="SCARCITY" savedReadingDate="Jun 17, 2026" />);
    assert.match(saved, /Hiring, Fundraising, Spending and New bets were on hold on the Jun 17, 2026 reading\./);
    const none = renderToStaticMarkup(<DecisionPicker options={OPTIONS.map((option) => ({ ...option, pause: option.pause && { ...option.pause, met: false } }))} groups={GROUPS} regime="SCARCITY" />);
    assert.match(none, /data-section-lead="true"[^>]*>Nothing is on hold\.</);
  });

  it("carries no engine vocabulary", () => {
    assert.doesNotMatch(html, /tightness|riskAppetite|regime|posture/i);
  });
});

describe("the optional exploration folds", () => {
  const details = (html: string) => /<details class="weather-auto-chevron" data-decision-explore(="true")?([^>]*)>/.exec(html)?.[2] ?? "";

  it("closes the groups on a live week, whose brief above already carries every action", () => {
    const html = renderToStaticMarkup(<DecisionPicker options={OPTIONS} groups={GROUPS} regime="SCARCITY" rulesAbove />);
    assert.doesNotMatch(details(html), /\bopen\b/);
    assert.match(html, /Open each area’s rule, test and links/);
  });

  it("opens on the area a `?decision=` link names", () => {
    const html = renderToStaticMarkup(<DecisionPicker options={OPTIONS} groups={GROUPS} regime="SCARCITY" rulesAbove initialSelected="hiring" />);
    assert.match(details(html), /\bopen\b/);
    assert.match(html, /id="area-hiring-detail"/);
  });

  it("stays open on a saved copy or an archived month, where the groups are the five answers", () => {
    const html = renderToStaticMarkup(<DecisionPicker options={OPTIONS} groups={GROUPS} regime="SCARCITY" />);
    assert.match(details(html), /\bopen\b/);
    assert.match(html, /Every area’s rule, test and links/);
  });
});

describe("first-visit helpers", () => {
  it("finds a decision answer that leads with each area", () => {
    for (const area of decisionAreaOrder) {
      const page = findLeadAnswerForArea(area);
      assert.ok(page, `no lead answer for ${area}`);
      assert.equal(page.category, "decision");
      assert.equal(page.mappedDecisionAreas[0], area);
    }
  });

  it("lists real call changes, newest first", () => {
    const series = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
    const changes = findRecentCallChanges(series, 4);
    assert.equal(changes.length, 4);
    for (let index = 1; index < changes.length; index += 1) {
      assert.ok(changes[index - 1].recordDate > changes[index].recordDate);
    }
    for (const change of changes) {
      assert.notEqual(change.fromLabel, change.toLabel);
      assert.ok(series.some((entry) => entry.recordDate === change.recordDate), "offered a month the time machine lacks");
    }
  });
});

/* The fold is gone (2026-10-09): one order for every reader, so nothing on the
   page is keyed to a first visit, and the bootstrap no longer marks one. */
describe("no first-visit fold", () => {
  it("leaves nothing for the bootstrap or the stylesheet to fold", () => {
    const css = readFileSync(new URL("../app/styles/home-flow.css", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(css, /data-first-visit-(only|collapsible)/);
    assert.doesNotMatch(layout, /homeFirstVisit/);
    assert.doesNotMatch(page, /data-first-visit|offersFirstVisitFold/);
  });
});

describe("an opened card asks the question it answers", () => {
  const withAnswer: DecisionPickerOption[] = OPTIONS.map((option) =>
    option.area === "hiring"
      ? { ...option, answer: { href: "/answers/should-startups-hire-engineers-right-now", title: "Should startups hire engineers right now?" } }
      : option,
  );

  it("opens under the area's rule with the reader's question, once", () => {
    const html = renderToStaticMarkup(<DecisionPicker options={withAnswer} groups={GROUPS} regime="SCARCITY" initialSelected="hiring" />);
    assert.match(html, /<p data-decision-question[^>]*>Should startups hire engineers right now\?<\/p>/, "the detail asks what the reader came to ask");
    assert.ok(
      html.indexOf("Rule for hiring") < html.indexOf("Should startups hire engineers right now?"),
      "under the rule the group already prints, not a second copy of it",
    );
    assert.equal(html.match(/Should startups hire engineers right now\?/g)?.length, 1);
    assert.equal(html.match(/Rule for hiring/g)?.length, 1, "the rule is said once, in its group");
    assert.match(html, /Read the citable defense →/, "the link names what it opens, not the question again");
  });
});

describe("a link can carry the decision (`/?decision=`)", () => {
  const render = (initialSelected?: DecisionPickerOption["area"]) =>
    renderToStaticMarkup(
      <DecisionPicker
        options={OPTIONS}
        groups={GROUPS}
        regime="SCARCITY"
        initialSelected={initialSelected}
      />,
    );

  it("opens on the decision the URL names, in the first paint", () => {
    const html = render("product-tempo");
    assert.match(html, /aria-expanded="true" aria-controls="area-product-tempo-detail"[^>]*>Roadmap</, "the named area is open");
    assert.match(html, /id="area-product-tempo-detail" aria-live="polite"/, "and its detail is server-rendered");
    assert.match(html, /Why this matters for roadmap:/i, "renders zero-input corporate transmission intuition");
    assert.match(html, /Shared rule of thumb:/i, "renders team ritual rule of thumb");
    assert.match(html, /Startup math:/i, "renders concrete unit economics math");
    assert.match(html, /Copy takeaway for Slack/i, "renders 1-click Slack takeaway action");
    assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, 1, "one area open at a time");
    assert.doesNotMatch(render(), /-detail"/, "no detail open without one");
  });

  it("reads only an area from the parameter, and writes every choice back to it", () => {
    assert.equal(parseHomeDecision("hiring"), "hiring");
    assert.equal(parseHomeDecision("payroll"), undefined);
    assert.equal(parseHomeDecision(undefined), undefined);
    /* A link's decision wins, then the reader's last choice. */
    assert.equal(resolveHomeDecision({ decision: "roadmap" }, "hiring"), "hiring", "a slug that is not an area falls to the cookie");
    assert.equal(resolveHomeDecision({ decision: "product-tempo" }, "hiring"), "product-tempo");
    assert.equal(resolveHomeDecision({}, "hiring"), "hiring");
    assert.equal(resolveHomeDecision(undefined, null), undefined);
    const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    assert.match(page, /const chosenArea = resolveHomeDecision\(searchParams, data\.operatorContext\.decisionArea\);/);
    assert.match(page, /initialSelected=\{chosenArea\}/, "the picker opens on the area the rest of the page follows");
    const picker = readFileSync(new URL("../app/components/home/DecisionPicker.tsx", import.meta.url), "utf8");
    const views = readFileSync(new URL("../app/components/home/homeView.tsx", import.meta.url), "utf8");
    assert.match(picker, /showHomeView\(HOME_DECISION_PARAM, area\)/, "a choice goes to the URL through the page's views");
    assert.match(views, /url\.searchParams\.set\(key, value\)/);
    assert.match(views, /url\.searchParams\.delete\(key\)/, "closing the area takes it out of the URL");
    assert.match(views, /window\.history\.replaceState\(/, "a choice replaces the entry rather than adding one for Back to retrace");
    assert.match(picker, /document\.cookie = buildHomeDecisionCookie\(area\)/, "and is kept for the next visit");
    assert.match(picker, /if \(area\) announceDecision\(area\)/, "and the conditions chart hears it");
    assert.match(picker, /calibrationParts/, "includes stage and runway calibration context in the Slack takeaway artifact");
  });

  it("keeps the last choice in a cookie that holds only the area's slug", () => {
    assert.equal(readHomeDecisionCookie(buildHomeDecisionCookie("capital-raising").split(";")[0]), "capital-raising");
    assert.equal(readHomeDecisionCookie("whether-company-runway=12-24; whether-home-decision=hiring"), "hiring");
    assert.equal(readHomeDecisionCookie("whether-home-decision=payroll"), null, "anything that is not an area is ignored");
    assert.equal(readHomeDecisionCookie(null), null);
    assert.match(buildHomeDecisionCookie("hiring"), /^whether-home-decision=hiring; path=\/; max-age=\d+; SameSite=Lax$/);
    assert.equal(buildHomeDecisionCookie(null), "whether-home-decision=; path=/; max-age=0; SameSite=Lax", "closing it forgets it");
  });
});

/*
 * One area through the page (2026-11-18). The area open on `/` (`?decision=`, else the
 * cookie) is what the sections below the card follow: the rows of "What changed" that move
 * it say so and the rest take the lower ink, the one-month bars mark its move, and Copy
 * brief's link opens on it. Nothing hypothetical rides along.
 */
describe("the area open runs through the page", () => {
  it("names the areas each row of signals moves, by the feeds the /signals diagram draws", () => {
    assert.deepEqual(areasMovedBy("tightness"), ["hiring", "capital-raising", "burn-discipline"]);
    assert.deepEqual(areasMovedBy("riskAppetite"), ["product-tempo", "capital-raising", "expansion-bets"]);
    assert.deepEqual(areasMovedBy("baseRate", 4.1), areasMovedBy("tightness"), "the rate moves what funding pressure sets");
    assert.deepEqual(areasMovedBy("curveSlope", 0.29), areasMovedBy("riskAppetite"), "the curve sets risk appetite");
    assert.deepEqual(
      [...areasMovedBy("curveSlope", -0.4)].sort(),
      [...new Set([...areasMovedBy("riskAppetite"), ...areasMovedBy("tightness")])].sort(),
      "and adds to funding pressure only below zero",
    );
  });

  const rows: SignalChangeRow[] = [
    { key: "riskAppetite", label: "Risk appetite", value: 44, valueLabel: "44", previous: 53, previousLabel: "53", delta: -9, increaseIsPositive: true },
    { key: "tightness", label: "Funding pressure", value: 90, valueLabel: "90", previous: 88, previousLabel: "88", delta: 2, increaseIsPositive: false },
    { key: "curveSlope", label: "Recession warning gauge", value: 0.29, valueLabel: "0.29", previous: 0.32, previousLabel: "0.32", delta: -0.03, increaseIsPositive: true },
  ];

  it("marks the rows of What changed that move the open area, quiets the rest, and hides nothing", () => {
    const html = renderToStaticMarkup(
      <WhatChangedSection rows={rows} comparisonUnavailable={false} compact followsArea chosenArea="product-tempo" />,
    );
    assert.match(html, /class="group\/chosen" data-chosen="product-tempo"/);
    const funding = html.slice(html.indexOf('data-signal="tightness"'), html.indexOf('data-signal="curveSlope"'));
    assert.match(funding, /group-data-\[chosen=product-tempo\]\/chosen:text-slate-400/, "funding pressure does not move Roadmap, so it takes the lower ink then");
    assert.doesNotMatch(funding, /group-data-\[chosen=hiring\]\/chosen:text-slate-400/, "and keeps its ink for an area it moves");
    const curve = html.slice(html.indexOf('data-signal="curveSlope"'));
    assert.match(curve, /data-moves-area="product-tempo"[^>]*>Moves <a href="#area-product-tempo"/, "an input that moves the area says so in its own line");
    assert.equal((html.match(/data-signal=/g) ?? []).length, 3, "no row is hidden");
    assert.match(html, /group-data-\[chosen=product-tempo\]\/chosen:font-semibold/, "the area's name in an Affects line takes full weight while open");
  });

  it("changes nothing in What changed while no area is open, and nothing off the brief", () => {
    const none = renderToStaticMarkup(<WhatChangedSection rows={rows} comparisonUnavailable={false} compact followsArea />);
    assert.match(none, /data-chosen=""/);
    assert.doesNotMatch(none, /data-moves-area/);
    const elsewhere = renderToStaticMarkup(<WhatChangedSection rows={rows} comparisonUnavailable={false} compact />);
    assert.doesNotMatch(elsewhere, /data-chosen|group-data-\[chosen/);
  });

  const move = (points: number): ScoreMoveHistogram => ({
    score: "tightness",
    points,
    band: "a rare",
    changes: 4,
    atLeast: 1,
    since: 2012,
    bins: [
      { size: 0, count: 2, label: "2 months did not move", latest: null },
      { size: 1, count: 1, label: "1 month moved 1 point", latest: "2020-03-31" },
      { size: 2, count: 1, label: "1 month moved 2 points", latest: "2022-06-30" },
    ],
    caption: "4 one-month moves since 2012",
  });

  it("draws the one-month bars beside the open area's group, else beside the first that sizes a move", () => {
    const groups = [
      { state: "crossed" as const, status: "On hold", condition: "No restart until funding pressure falls below 66.", distance: "It is 2 points away.", history: null, move: move(2), areas: [{ area: "hiring" as const, label: "Hiring", rule: "Hold" }] },
      { state: "near" as const, status: "Close to pausing", condition: "Pauses if risk appetite falls below 44.", distance: "It is 1 point away.", history: null, move: move(1), areas: [{ area: "product-tempo" as const, label: "Roadmap", rule: "Ship" }] },
    ];
    const beside = (selected?: "hiring" | "product-tempo") => {
      const html = renderToStaticMarkup(<AreaGroups groups={groups} selected={selected} />);
      return html.slice(0, html.indexOf("data-score-move-bars")).lastIndexOf("<section") === html.indexOf("<section") ? "first" : "second";
    };
    assert.equal(beside(), "first");
    assert.equal(beside("product-tempo"), "second");
    assert.equal(beside("hiring"), "first");
    const html = renderToStaticMarkup(<AreaGroups groups={groups} selected="hiring" />);
    assert.match(html, /data-month="2020-03"/, "each linked bar carries its month");
    assert.match(html, /data-month="2022-06"/);
  });

  it("carries the open area on the shared link as the copy is made, and nothing else", () => {
    const sharedUrl = "https://whether.work/brief/2026-w46?ref=share";
    const block = `*Whether Weekly Brief — Nov 16, 2026*\n> *Guidance:* Hold hiring.\nFull brief: ${sharedUrl}`;
    const carried = carrySharedView(block, sharedUrl, buildSharedBriefQuery("hiring"));
    assert.equal(carried.url, "https://whether.work/brief/2026-w46?ref=share&decision=hiring");
    assert.equal(carried.text, block.replace(sharedUrl, carried.url), "the words do not change");
    assert.deepEqual(carrySharedView(block, sharedUrl, buildSharedBriefQuery(undefined)), { text: block, url: sharedUrl });
    assert.deepEqual(buildSharedBriefQuery("product-tempo"), { decision: "product-tempo" });
    assert.equal(carrySharedView(block, sharedUrl, { ref: "elsewhere" }).url, sharedUrl, "the share mark is not overwritten");
    const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    assert.match(page, /carryArea=\{\{ initial: chosenArea \?\? null \}\}/);
    assert.doesNotMatch(page, /carryArea=[^\n]*counted/, "the chart's counted reading never rides along");
  });

  it("links a view of the page while keeping the rest of its query", () => {
    assert.equal(buildHomeViewHref({ decision: "hiring", cadence: "monthly" }, { compare: "2022-03" }, "last-change"), "/?decision=hiring&cadence=monthly&compare=2022-03#last-change");
    assert.equal(buildHomeViewHref({ decision: "hiring", trail: "since-2012" }, { trail: null }), "/?decision=hiring");
    assert.equal(buildHomeViewHref(undefined, { trail: null }), "/");
  });
});
