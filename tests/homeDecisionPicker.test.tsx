import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionPicker, type DecisionPickerOption } from "../app/components/home/DecisionPicker";
import { findLeadAnswerForArea } from "../app/answers/decisionPages";
import { findRecentCallChanges } from "../lib/report/lastTimeCallChanged";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";
import { buildAreaGroups, buildHomeDecisionCookie, parseHomeDecision, readHomeDecisionCookie } from "../lib/report/home/homeSectionModel";
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
    assert.match(html, /<h2[^>]*>Your decisions this week<\/h2>/);
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
    assert.ok(html.indexOf("data-area-groups") > html.indexOf("Your decisions this week"), "under the heading");
  });

  it("counts the holds only on a saved copy", () => {
    /* The count ("4 of 5 areas are on hold.") repeated the card's "On hold …" line on a
       live week, so it prints on a saved copy alone, where it carries the reading's date. */
    assert.doesNotMatch(html, /already covered by this week/);
    assert.doesNotMatch(html, /4 of 5 areas are on hold\./);
    const saved = renderToStaticMarkup(<DecisionPicker options={OPTIONS} groups={GROUPS} regime="SCARCITY" savedReadingDate="Jun 17, 2026" />);
    assert.match(saved, /4 of 5 areas were on hold on the Jun 17, 2026 reading\./);
  });

  it("carries no engine vocabulary", () => {
    assert.doesNotMatch(html, /tightness|riskAppetite|regime|posture/i);
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
    const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    assert.match(
      page,
      /initialSelected=\{parseHomeDecision\(searchParams\?\.\[HOME_DECISION_PARAM\]\) \?\? data\.operatorContext\.decisionArea \?\? undefined\}/,
      "a link's decision wins, then the reader's last choice",
    );
    const picker = readFileSync(new URL("../app/components/home/DecisionPicker.tsx", import.meta.url), "utf8");
    assert.match(picker, /url\.searchParams\.set\(HOME_DECISION_PARAM, area\)/);
    assert.match(picker, /url\.searchParams\.delete\(HOME_DECISION_PARAM\)/, "closing the area takes it out of the URL");
    assert.match(picker, /window\.history\.replaceState\(/, "a choice replaces the entry rather than adding one for Back to retrace");
    assert.match(picker, /document\.cookie = buildHomeDecisionCookie\(area\)/, "and is kept for the next visit");
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
