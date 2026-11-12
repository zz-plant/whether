import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET as getAgent } from "../app/api/agent/route";
import { buildPublishedChanges } from "../lib/agent/publishedChanges";
import { runAgentTool } from "../lib/agent/tools";
import { AgentInputError } from "../lib/agent/registry";
import { getPublishedBriefs, type PublishedBrief } from "../lib/report/publishedBriefs";

const only = <Item>(items: readonly Item[], index = 0): Item => {
  const item = items[index];
  if (item === undefined) throw new Error(`expected an item at ${index}, got ${items.length}`);
  return item;
};

/*
 * The change feed answers "did the call change since the week I last saw" from the frozen
 * records. The fixtures are one real record restamped as other weeks, so each test changes
 * exactly one thing and the rest is a record as the freeze writes it.
 */

const base = getPublishedBriefs().find((brief) => brief.scores && brief.decisions.some((decision) => decision.area === "hiring" && decision.pause?.length));
if (!base?.scores) throw new Error("the archive has no record with scores and hiring lines");
const scores = base.scores;

const week = (slug: string, change: Partial<PublishedBrief> = {}): PublishedBrief => ({ ...base, slug, ...change });
const NOW = new Date("2026-03-25T12:00:00Z"); // 2026-w13

/* Scores that put every area's pause on (funding pressure past each of its pause lines) and
   every pause off (inside each line on both scores), from the record's own lines, so the test
   does not depend on which week the newest record happened to be. */
const pauseLines = base.decisions.flatMap((decision) => decision.pause ?? []);
const tightnessLines = pauseLines.filter((line) => line.metric === "tightness").map((line) => line.value);
const appetiteLines = pauseLines.filter((line) => line.metric === "riskAppetite").map((line) => line.value);
const paused = { ...scores, tightness: Math.max(...tightnessLines) + 1 };
const unpaused = { ...scores, tightness: Math.min(...tightnessLines) - 1, riskAppetite: Math.max(...appetiteLines, 0) + 1 };

describe("published changes", () => {
  it("does not count a reworded week as a change", () => {
    const result = buildPublishedChanges({
      since: "2026-w10",
      briefs: [week("2026-w10"), week("2026-w11", { actionNow: "The same call, in other words.", whatChanged: "Reworded." })],
      now: NOW,
    });
    assert.equal(result.changed, false);
    assert.deepEqual(result.weeks.map((entry) => entry.slug), ["2026-w11"]);
    assert.match(result.summary, /has not changed since 2026-w10/);
  });

  it("names a change in conditions, and the weeks with no brief in between", () => {
    const result = buildPublishedChanges({
      since: "2026-w10",
      briefs: [week("2026-w10"), week("2026-w13", { regime: base.regime === "VOLATILE" ? "EXPANSION" : "VOLATILE" })],
      now: NOW,
    });
    assert.equal(result.changed, true);
    assert.deepEqual(result.unpublishedWeeks, ["2026-w11", "2026-w12"]);
    assert.ok(only(result.weeks).changes?.conditions, "the conditions change is data");
    assert.match(result.summary, /The call changed since 2026-w10\. 2026-w13: conditions /);
    assert.equal(result.nextSince, "2026-w13");
    assert.equal(result.awaitingThisWeek, false);
  });

  it("names an area whose pause lifted, from the record's own lines and scores", () => {
    const result = buildPublishedChanges({
      since: "2026-w10",
      briefs: [week("2026-w10", { scores: paused }), week("2026-w11", { scores: unpaused })],
      now: NOW,
    });
    const hiring = only(result.weeks).changes?.areas.find((change) => change.area === "hiring");
    assert.deepEqual(hiring && { from: hiring.from, moved: hiring.moved === "lifted" || hiring.moved === "resumable" }, { from: "pause", moved: true });
    assert.equal(result.changed, true);
    assert.match(result.summary, /Hiring (pause lifted|restart lines met)/);
  });

  it("names a correction written into a week the caller already saw", () => {
    const corrected = week("2026-w10", { publishedAt: "2026-03-02T14:00:00.000Z", correction: "Corrected Mar 10, 2026. The Do now line was wrong." });
    const result = buildPublishedChanges({ since: "2026-w10", briefs: [corrected, week("2026-w11")], now: NOW });
    assert.deepEqual(result.correctedSince.map((entry) => entry.slug), ["2026-w10"]);
    assert.match(result.summary, /Corrected since: 2026-w10\./);
    assert.equal(buildPublishedChanges({ since: "2026-w10", briefs: [week("2026-w10"), week("2026-w11")], now: NOW }).correctedSince.length, 0);
  });

  it("says this week's brief is overdue once Monday 14:00 has passed without it", () => {
    const briefs = [week("2026-w12")];
    const mondayMorning = buildPublishedChanges({ since: "2026-w12", briefs, now: new Date("2026-03-23T09:00:00Z") });
    assert.equal(mondayMorning.awaitingThisWeek, true);
    assert.equal(mondayMorning.overdue, false);
    const wednesday = buildPublishedChanges({ since: "2026-w12", briefs, now: new Date("2026-03-25T09:00:00Z") });
    assert.equal(wednesday.overdue, true);
    assert.match(wednesday.summary, /This week's brief \(2026-w13\) is due and not published yet/);
  });

  it("compares from the last week published at or before since", () => {
    const result = buildPublishedChanges({ since: "2026-w11", briefs: [week("2026-w10"), week("2026-w12")], now: NOW });
    assert.equal(result.baseline?.slug, "2026-w10");
    assert.deepEqual(result.weeks.map((entry) => entry.slug), ["2026-w12"]);
    assert.equal(result.awaitingThisWeek, true, "w13 has no brief yet");
  });

  it("answers changed: null for a week before the record, and for no since at all", () => {
    const briefs = [week("2026-w10"), week("2026-w11")];
    assert.equal(buildPublishedChanges({ since: "2025-w01", briefs, now: NOW }).changed, null);
    assert.match(buildPublishedChanges({ since: "2025-w01", briefs, now: NOW }).summary, /before the first published week/);
    assert.equal(buildPublishedChanges({ briefs, now: NOW }).changed, null);
  });

  it("answers no newer week as unchanged", () => {
    const result = buildPublishedChanges({ since: "2026-w11", briefs: [week("2026-w10"), week("2026-w11")], now: NOW });
    assert.equal(result.changed, false);
    assert.deepEqual(result.weeks, []);
  });
});

describe("the change feed on the agent route and as a tool", () => {
  it("answers view=changes with the real archive", async () => {
    const latest = only(getPublishedBriefs());
    const response = await getAgent(new Request(`https://whether.work/api/agent?view=changes&since=${latest.slug}`));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.type, "published_changes");
    assert.equal(body.changed, false);
    assert.equal(body.nextSince, latest.slug);
  });

  it("refuses a since that is not a week, another cadence, and format=jev", async () => {
    for (const query of ["view=changes&since=last-week", "view=changes&cadence=monthly", "view=changes&format=jev", "view=changes&week=2026-w41", "view=state&period=2024-q1"]) {
      const response = await getAgent(new Request(`https://whether.work/api/agent?${query}`));
      assert.equal(response.status, 400, query);
    }
  });

  it("answers get_changes_since the same, and refuses a bad since by argument", async () => {
    const latest = only(getPublishedBriefs());
    const result = await runAgentTool("get_changes_since", { since: latest.slug }, "http");
    assert.equal(result.changed, false);
    await assert.rejects(runAgentTool("get_changes_since", { since: "yesterday" }, "http"), (error: unknown) => {
      assert.ok(error instanceof AgentInputError);
      assert.equal(error.problems[0]?.argument, "since");
      return true;
    });
  });
});
