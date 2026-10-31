import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionPicker, type DecisionPickerOption } from "../app/components/home/DecisionPicker";
import { findLeadAnswerForArea } from "../app/answers/decisionPages";
import { findRecentCallChanges } from "../lib/report/lastTimeCallChanged";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";
import { parseHomeDecision } from "../lib/report/home/homeSectionModel";
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
      ? { line: "Risk appetite < 40", distance: "4 pts away", points: 4, met: false, metric: "riskAppetite" }
      : { line: "Funding pressure > 76", distance: "crossed", points: 14, met: true, metric: "tightness" },
  resume: { line: "Funding pressure < 66", distance: "17 pts away", points: 17, met: false, metric: "tightness" },
}));

describe("decision picker", () => {
  const html = renderToStaticMarkup(
    <DecisionPicker options={OPTIONS} regime="SCARCITY">
      <p data-child>Folded table</p>
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

  it("prints what it is handed after the choices", () => {
    assert.ok(html.indexOf("data-child") > html.indexOf("<fieldset"), "the folded table follows the choices");
  });

  /* The scores print on the conditions map and in "What changed" at every width;
     the picker restated them as a "This week's scores" list (2026-10-09). */
  it("does not restate the two scores", () => {
    assert.doesNotMatch(html, /This week(&#x27;|')s scores/);
    assert.doesNotMatch(html, /\/100: /);
  });

  it("puts each area's standing on its choice, so the answers are on the page before a click", () => {
    const choices = html.slice(html.indexOf("<fieldset"), html.indexOf("</fieldset>"));
    assert.equal((choices.match(/On hold/g) ?? []).length, 4);
    assert.match(choices, /4 pts from pausing/);
    /* The shared state badge: a crossed line in the line state's own red with
       the pause glyph, a close one with the dashed circle, so the two differ in
       shape. */
    assert.match(
      choices,
      /data-line-state-badge="crossed" class="[^"]*text-line-crossed-fg[^"]*"><svg[^>]*lucide-pause[\s\S]*?<\/svg><span>On hold</,
      "a crossed line is drawn as a state, in the crossed ink",
    );
    assert.match(choices, /data-line-state-badge="near"[^>]*><svg[^>]*lucide-circle-dashed[\s\S]*?<\/svg><span>4 pts from pausing</);
    /* Each choice is a card, so its area glyph is the 20px size. */
    assert.equal((choices.match(/data-concept-icon="area"/g) ?? []).length, 5);
    assert.equal((choices.match(/class="lucide [^"]*size-5" data-concept-icon="area"/g) ?? []).length, 5);
  });

  it("counts the crossed pause lines once, over the choices", () => {
    /* The expectation line and the count used to contradict each other in
       consecutive lines: "4 of 5 areas are on hold" over "most weeks neither
       happens". It prints only when it is true of this week. */
    assert.match(html, /Held means the call above already applies to that area\./);
    assert.doesNotMatch(html, /Most weeks neither happens\./);
    const count = html.indexOf("4 of 5 areas are on hold.");
    assert.ok(count > html.indexOf("Your decisions this week"), "the count sits under the heading");
    assert.ok(count < html.indexOf("<fieldset"), "and over the choices it sums");
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

describe("a link can carry the decision (`/?decision=`)", () => {
  const render = (initialSelected?: DecisionPickerOption["area"]) =>
    renderToStaticMarkup(
      <DecisionPicker
        options={OPTIONS}
        regime="SCARCITY"
       
        initialSelected={initialSelected}
      />,
    );

  it("opens on the decision the URL names, in the first paint", () => {
    const html = render("product-tempo");
    assert.match(html, /aria-live="polite"[^>]*>[\s\S]*Rule for product-tempo/, "the named area's answer is server-rendered open");
    assert.match(html, /Why this line governs roadmap:/i, "renders zero-input corporate transmission intuition");
    assert.match(html, /Shared rule of thumb:/i, "renders team ritual rule of thumb");
    assert.match(html, /Startup math:/i, "renders concrete unit economics math");
    assert.match(html, /Copy takeaway for Slack/i, "renders 1-click Slack takeaway action");
    assert.match(html, /checked=""[^>]*value="product-tempo"|value="product-tempo"[^>]*checked=""/);
    assert.doesNotMatch(render(), /aria-live="polite"[^>]*>[\s\S]*Rule for product-tempo/, "no answer open without one");
  });

  it("reads only an area from the parameter, and writes every choice back to it", () => {
    assert.equal(parseHomeDecision("hiring"), "hiring");
    assert.equal(parseHomeDecision("payroll"), undefined);
    assert.equal(parseHomeDecision(undefined), undefined);
    const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    assert.match(page, /initialSelected=\{parseHomeDecision\(searchParams\?\.\[HOME_DECISION_PARAM\]\)\}/);
    const picker = readFileSync(new URL("../app/components/home/DecisionPicker.tsx", import.meta.url), "utf8");
    assert.match(picker, /url\.searchParams\.set\(HOME_DECISION_PARAM, area\)/);
    assert.match(picker, /window\.history\.replaceState\(/, "a choice replaces the entry rather than adding one for Back to retrace");
  });
});
