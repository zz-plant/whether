import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

/**
 * Source-level pins for three review findings whose defect class is wiring:
 * what mounts, what a control hands to what, and what a picker receives.
 *
 * 1. `SinceLastVisit`'s effect is the only writer of `whether.lastSeenCall`.
 *    Mounting it behind the "visit" tab stopped recording ordinary homepage
 *    visits entirely, so the later comparison compared against a much older
 *    visit — or none. It must mount unconditionally, hidden at most.
 * 2. The quick card's scenario chips used to expand the same graded verdict
 *    for every scenario, discarding the clicked decision.
 * 3. The period picker is navigation coverage and must receive the full
 *    regime history; only the chart is scoped to the selected month.
 */

const read = (path: string) => readFileSync(path, "utf8");

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("weekly retrospective recording", () => {
  const card = read("app/components/home/WeeklyRetrospectiveCard.tsx");

  it("mounts SinceLastVisit unconditionally, hidden at most", () => {
    assert.match(card, /<SinceLastVisit\s+current=\{currentVisit\}\s*\/>/);
    // The conditional mount that stopped recording: no ternary may unmount it.
    assert.doesNotMatch(card, /\?\s*\(\s*<LastWeekInHindsight/);
    // The inactive panel is hidden with CSS, so the effect still runs.
    assert.match(card, /activeTab === "visit" \? "rounded-xl[^"]*" : "hidden"/);
  });
});

describe("quick card scenario application", () => {
  const card = read("app/components/hero/StressTestQuickCard.tsx");

  it("records the clicked scenario and grades the tester on it", () => {
    assert.match(card, /setSelectedScenario\(sc\)/);
    assert.match(card, /initialPlan=\{selectedScenario\?\.plan/);
    // A second chip re-grades on that decision instead of leaving the first verdict standing.
    assert.match(card, /key=\{selectedScenario\?\.id/);
  });

  it("carries a distinct plan per graded scenario", () => {
    const tester = read("app/components/DecisionPlanStressTester.tsx");
    assert.match(tester, /initialPlan\?\.text \?\? EXAMPLE_PLANS\[0\]\.text/);
    assert.match(tester, /initialPlan\?\.category \?\? EXAMPLE_PLANS\[0\]\.category/);
    // Each scenario names its own decision type: the market chip may not grade as hiring.
    assert.match(card, /category: "INFRASTRUCTURE"/);
    assert.match(card, /category: "GEOGRAPHIC_EXPANSION"/);
  });
});

describe("period picker coverage", () => {
  it("receives the unfiltered regime history, not the aligned chart series", () => {
    const page = stripComments(read("app/page.tsx"));
    const pickerCall = page.slice(page.indexOf("<TimeMachineCalendarPicker"));
    assert.match(pickerCall, /history=\{regimeHistory\}/);
    assert.doesNotMatch(pickerCall, /history=\{alignedRegimeHistory\}/);
  });
});
