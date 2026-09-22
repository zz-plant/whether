import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "bun:test";

/**
 * Source-level pins for two review findings whose defect class is wiring:
 * what mounts, and what a picker receives.
 *
 * 1. `SinceLastVisit`'s effect is the only writer of `whether.lastSeenCall`.
 *    It once mounted behind the "visit" tab of a retrospective card, which
 *    stopped recording ordinary homepage visits entirely, so the later
 *    comparison compared against a much older visit — or none. The card is gone
 *    (2026-09-15 declutter: its hindsight panel restated the hero's own delta),
 *    and the strip mounts directly under the call with no tab or ternary
 *    between it and the page — on live briefs only, for the same reason as the
 *    runway notes: an archived month must not become the "last seen" call.
 * 2. The period picker is navigation coverage and must receive the full
 *    regime history; only the chart is scoped to the selected month.
 */

const read = (path: string) => readFileSync(path, "utf8");

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("weekly retrospective recording", () => {
  const page = stripComments(read("app/page.tsx"));

  it("mounts SinceLastVisit once, directly under the call, on live briefs", () => {
    assert.equal(page.split("<SinceLastVisit").length - 1, 1, "one strip, one writer of lastSeenCall");
    const start = page.indexOf("<SinceLastVisit");
    const mount = page.slice(start, page.indexOf("/>", start) + 2);
    assert.match(mount, /current=\{\{/, "the strip receives the current call inline");
    assert.match(page.slice(0, start).trimEnd(), /!historicalSelection \? \($/, "gated on the live brief, nothing else");
    assert.ok(start > page.indexOf("<DecisionHero"), "sits under the call it compares against");
    assert.ok(start < page.indexOf("<WhatChangedSection"), "and before the signals it precedes");
    assert.ok(!existsSync("app/components/home/WeeklyRetrospectiveCard.tsx"), "no tabbed card wraps it any more");
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
