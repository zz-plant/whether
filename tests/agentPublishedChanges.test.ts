import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET as getAgent } from "../app/api/agent/route";
import { buildPublishedChanges } from "../lib/agent/publishedChanges";
import { runAgentTool } from "../lib/agent/tools";
import { AgentInputError } from "../lib/agent/registry";
import { getPublishedBriefs, type PublishedBrief } from "../lib/report/publishedBriefs";

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

/* Funding pressure just inside every pause line the record states: the pauses lift. */
const belowEveryPause = Math.min(...base.decisions.flatMap((decision) => (decision.pause ?? []).filter((line) => line.metric === "tightness").map((line) => line.value))) - 1;

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
    assert.ok(result.weeks[0].changes?.conditions, "the conditions change is data");
    assert.match(result.summary, /The call changed since 2026-w10\. 2026-w13: conditions /);
    assert.equal(result.nextSince, "2026-w13");
    assert.equal(result.awaitingThisWeek, false);
  });

  it("names an area whose pause lifted, from the record's own lines and scores", () => {
    const result = buildPublishedChanges({
      since: "2026-w10",
      briefs: [week("2026-w10"), week("2026-w11", { scores: { ...scores, tightness: belowEveryPause, riskAppetite: 99 } })],
      now: NOW,
    });
    const hiring = result.weeks[0].changes?.areas.find((change) => change.area === "hiring");
    const before = buildPublishedChanges({ briefs: [week("2026-w10")], now: NOW }).weeks[0].areas.find((area) => area.area === "hiring");
    if (before?.state === "pause") {
      assert.ok(hiring && hiring.from === "pause" && hiring.to !== "pause", JSON.stringify(result.weeks[0].changes));
      assert.equal(result.changed, true);
      assert.match(result.summary, /Hiring (pause lifted|restart lines met)/);
    } else {
      assert.equal(hiring, undefined, "an area that was not paused cannot lift");
    }
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
    const latest = getPublishedBriefs()[0];
    const response = await getAgent(new Request(`https://whether.work/api/agent?view=changes&since=${latest.slug}`));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.type, "published_changes");
    assert.equal(body.changed, false);
    assert.equal(body.nextSince, latest.slug);
  });

  it("refuses a since that is not a week, another cadence, and format=jev", async () => {
    for (const query of ["view=changes&since=last-week", "view=changes&cadence=monthly", "view=changes&format=jev"]) {
      const response = await getAgent(new Request(`https://whether.work/api/agent?${query}`));
      assert.equal(response.status, 400, query);
    }
  });

  it("answers get_changes_since the same, and refuses a bad since by argument", async () => {
    const latest = getPublishedBriefs()[0];
    const result = await runAgentTool("get_changes_since", { since: latest.slug }, "http");
    assert.equal(result.changed, false);
    await assert.rejects(runAgentTool("get_changes_since", { since: "yesterday" }, "http"), (error: unknown) => {
      assert.ok(error instanceof AgentInputError);
      assert.equal(error.problems[0]?.argument, "since");
      return true;
    });
  });
});
