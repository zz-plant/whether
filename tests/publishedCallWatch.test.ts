import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  describePublishedCallChange,
  parsePublishedCallState,
  PUBLISHED_CALL_POLL_MS,
} from "../lib/report/publishedCallWatch";

/**
 * What a page open since yesterday is told, and what it is not.
 *
 * The failure this guards against is not missing a change — it is announcing
 * one that did not happen. A weekly brief is left open; a banner that cries
 * "updated" on a failed poll, an unparseable body, or an unchanged week is the
 * warning-about-data-that-is-fine problem docs/agents/lessons/tests-and-copy-rules.md records, and the next one
 * gets ignored.
 */

const rendered = { week: "2026-09-14", regime: "EXPANSION" };

describe("published call watch", () => {
  it("says nothing when nothing moved", () => {
    assert.equal(describePublishedCallChange(rendered, { week: "2026-09-14", regime: "EXPANSION" }), null);
  });

  it("says nothing when the poll failed or was unreadable", () => {
    assert.equal(describePublishedCallChange(rendered, null), null);
    for (const body of [null, undefined, 42, "week", {}, { week: "2026-09-21" }, { regime: "SCARCITY" }, { week: "", regime: "SCARCITY" }]) {
      assert.equal(parsePublishedCallState(body), null, `${JSON.stringify(body)} is not a published call`);
    }
  });

  /*
   * A different call and a newer reading of the same call are different news.
   * Collapsing them into one sentence would either overstate a routine refresh
   * or understate a regime change, and only one of those is recoverable.
   */
  it("separates a changed call from a newer reading of the same one", () => {
    const changedCall = describePublishedCallChange(rendered, { week: "2026-09-21", regime: "SCARCITY" });
    assert.equal(changedCall?.kind, "call");

    const newerReading = describePublishedCallChange(rendered, { week: "2026-09-21", regime: "EXPANSION" });
    assert.equal(newerReading?.kind, "reading");

    assert.notEqual(changedCall?.message, newerReading?.message);
  });

  it("reports a changed call even on the same record date", () => {
    // The cron writes between deploys, so the regime can move inside a week.
    assert.equal(describePublishedCallChange(rendered, { week: "2026-09-14", regime: "SCARCITY" })?.kind, "call");
  });

  it("tells the reader what changed for them, not what changed in the pipeline", () => {
    for (const current of [{ week: "2026-09-21", regime: "SCARCITY" }, { week: "2026-09-21", regime: "EXPANSION" }]) {
      const message = describePublishedCallChange(rendered, current)?.message ?? "";
      assert.doesNotMatch(message, /regime|record date|revalidate|cron|cache|poll/i);
    }
  });

  /*
   * /api/posture/current is cached an hour at the edge, so no client can see a
   * change sooner than that however often it asks. A poll faster than the cache
   * is traffic that cannot return new information.
   */
  it("polls no faster than the answer can change", async () => {
    const route = await readFile("app/api/posture/current/route.ts", "utf8");
    const maxAge = /s-maxage=(\d+)/.exec(route);
    assert.ok(maxAge, "the posture endpoint no longer states its edge cache");
    assert.ok(
      PUBLISHED_CALL_POLL_MS <= Number(maxAge[1]) * 1000,
      `polling every ${PUBLISHED_CALL_POLL_MS}ms against a ${maxAge[1]}s cache asks for answers that cannot differ`,
    );
  });

  /* A background tab polling forever is the failure mode of every "check for
     updates" banner ever shipped. */
  it("does not poll a hidden tab, and polls the moment one comes back", async () => {
    const source = await readFile("app/components/publishedCallWatcher.tsx", "utf8");
    assert.match(source, /visibilityState === "visible"/);
    assert.match(source, /addEventListener\("visibilitychange"/);
    assert.match(source, /removeEventListener\("visibilitychange"/, "a listener added per mount and never removed is a leak");
  });

  /* The numbers must not move under a reader mid-decision: the page offers, the
     reader decides. A watcher that called router.refresh() would swap them. */
  it("offers a reload rather than swapping the figures", async () => {
    const source = await readFile("app/components/publishedCallWatcher.tsx", "utf8");
    assert.doesNotMatch(source, /router\.refresh|revalidate/);
    assert.match(source, /window\.location\.reload/);
  });
});
