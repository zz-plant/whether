import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QuietWeekFold } from "../app/components/home/QuietWeekFold";

/*
 * Most Mondays nothing moves (seven changes in 177 months), and the page printed
 * every explanatory section anyway. On a quiet week they fold under one line, and
 * the line above the fold says the email does the watching (2026-11-03).
 */
describe("a quiet week folds the explanation", () => {
  const sections = <section id="what-changed"><h2>What changed since Sep 30</h2></section>;

  it("prints the sections open on any week that is not quiet", () => {
    const html = renderToStaticMarkup(<QuietWeekFold quiet={false} regimeLabel="Sunny">{sections}</QuietWeekFold>);
    assert.doesNotMatch(html, /<details/);
    assert.doesNotMatch(html, /data-quiet-week/);
    assert.match(html, /id="what-changed"/);
  });

  it("folds them under the full reading, with the alert's promise above, on a quiet week", () => {
    const html = renderToStaticMarkup(<QuietWeekFold quiet regimeLabel="Sunny">{sections}</QuietWeekFold>);
    assert.match(html, /Nothing is close to changing this week\./);
    assert.match(html, /href="#subscribe"[^>]*>Get an email the day an area pauses or restarts</);
    assert.match(html, /skip the Mondays when nothing moves\./);
    assert.match(html, /<details[^>]*data-quiet-week-fold[^>]*>\s*<summary[^>]*>The full reading: what changed, why conditions are Sunny and what would change them<\/summary>/);
    assert.ok(html.indexOf('id="what-changed"') > html.indexOf("<details"), "the sections are inside the fold, still server-rendered");
  });

  it("is quiet only on a live, compared week where nothing moved and nothing is close", () => {
    const page = readFileSync("app/page.tsx", "utf8");
    const rule = page.slice(page.indexOf("const quietWeek ="), page.indexOf(";", page.indexOf("const quietWeek =")));
    for (const guard of [
      "!historicalSelection",
      "!savedCopy",
      "!isDegraded",
      "!comparisonUnavailable",
      'guidanceChange === "held"',
      "!trustStripProps.couldChangeNextWeek",
      'confidenceLabel !== "LOW"',
      'lineStateBand?.state !== "near"',
    ]) {
      assert.ok(rule.includes(guard), `the quiet-week rule checks ${guard}`);
    }
    const fold = page.slice(page.indexOf("<QuietWeekFold"), page.indexOf("</QuietWeekFold>"));
    for (const section of ["<WhatChangedSection", "<WhyConditionsSection", "<WhatWouldChangeSection", "<RecordSection"]) {
      assert.ok(fold.includes(section), `${section} folds on a quiet week`);
    }
    for (const answer of ["<DecisionHero", "<DecisionPicker", "<CompanyCalibration", "<AlertSection"]) {
      assert.ok(!fold.includes(answer), `${answer} stays open: it is the answer, or the alert the fold points to`);
    }
  });
});
