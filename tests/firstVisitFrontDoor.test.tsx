import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FirstVisitDecisionPicker, type DecisionPickerOption } from "../app/components/home/FirstVisitDecisionPicker";
import { findLeadAnswerForArea } from "../app/answers/decisionPages";
import { findRecentCallChanges } from "../lib/report/lastTimeCallChanged";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";
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
 * The first-visit front door on `/`: the brief below the call folds away for a
 * browser that has never rendered it, and one question takes its place.
 *
 * The homepage itself does not render in this suite (it suspends at the report
 * read path), so the picker is rendered on its own and the fold is checked as
 * the configuration it is — a stylesheet rule and a bootstrap line.
 */

const OPTIONS: DecisionPickerOption[] = decisionAreaOrder.map((area) => ({
  area,
  rule: `Rule for ${area}`,
  pause: { line: "Funding pressure > 76", distance: "crossed" },
  resume: { line: "Funding pressure < 66", distance: "17 pts away" },
}));

describe("first-visit decision picker", () => {
  const html = renderToStaticMarkup(
    <FirstVisitDecisionPicker
      options={OPTIONS}
      regime="SCARCITY"
      scores={{ tightness: 90, riskAppetite: 44 }}
      flipCondition="Funding pressure falls to or below 70."
      lastTime="The last time conditions moved this way was Sep 2022 (Stormy to Freezing)."
      turningPoints={[{ label: "Sep 2022, Stormy to Freezing", href: "/?month=9&year=2022" }]}
    />,
  );

  it("renders only for a first visit, so the default page is unchanged", () => {
    assert.match(html, /data-first-visit-only="true"/);
  });

  it("asks one question with an answer for every area", () => {
    assert.match(html, /What are you deciding this week\?/);
    for (const question of ["Hire someone", "Change the roadmap", "Raise money", "Approve new spend", "Start something new"]) {
      assert.ok(html.includes(question), `missing option: ${question}`);
    }
  });

  it("offers the alerts-only signup beside the condition it watches", () => {
    assert.match(html, /Tell me when this changes/);
    assert.match(html, /Next change to watch: Funding pressure falls to or below 70\./);
    assert.match(html, /No weekly newsletter/);
  });

  it("says what each score means before any line quotes one", () => {
    const scores = html.indexOf("Funding pressure 90/100: money is hard to raise");
    assert.ok(scores > 0, "funding pressure printed without its meaning");
    assert.match(html, /Risk appetite 44\/100: investors are selective about risk/);
    assert.ok(scores < html.indexOf("Next change to watch"), "the alert box quotes a score before the page says what it means");
  });

  it("answers whether this has happened before on the page, and only when the week has an answer", () => {
    assert.match(html, /The last time conditions moved this way was Sep 2022 \(Stormy to Freezing\)\./);
    const quietWeek = renderToStaticMarkup(
      <FirstVisitDecisionPicker
        options={OPTIONS}
        regime="SCARCITY"
        scores={{ tightness: 90, riskAppetite: 44 }}
        turningPoints={[]}
      />,
    );
    assert.doesNotMatch(quietWeek, /The last time conditions moved/);
  });

  it("links the turning points into the time machine and offers the full brief", () => {
    assert.match(html, /href="\/\?month=9&amp;year=2022"/);
    assert.match(html, /Show the full brief/);
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

describe("the fold is configuration, and defaults to the full brief", () => {
  const css = readFileSync(new URL("../app/styles/home-flow.css", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

  it("hides the picker unless the bootstrap marked a first visit", () => {
    assert.match(css, /html:not\(\[data-home-first-visit="true"\]\) \[data-first-visit-only="true"\]\s*\{\s*display: none !important;/);
    assert.match(css, /html\[data-home-first-visit="true"\] \[data-first-visit-collapsible="true"\]\s*\{\s*display: none !important;/);
  });

  it("hides the phone header's stage and runway only on a page that offers the fold", () => {
    const header = readFileSync(new URL("../app/components/globalHeaderRouteGate.tsx", import.meta.url), "utf8");
    assert.match(
      css,
      /html\[data-home-first-visit="true"\]:has\(\[data-first-visit-only="true"\]\) \[data-first-visit-header-choices="true"\]\s*\{\s*display: none !important;/,
    );
    assert.match(header, /data-first-visit-header-choices="true"/);
  });

  it("decides first visit from the key the activation tracker writes on every visit", () => {
    assert.match(layout, /activationLastWeekStorageKey/);
    assert.match(layout, /root\.dataset\.homeFirstVisit = dismissed \|\| seenBefore \? "false" : "true"/);
  });
});
