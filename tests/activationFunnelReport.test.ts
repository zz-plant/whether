import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  formatActivationFunnelLine,
  funnelWeekSlugs,
  loadActivationFunnelReport,
  resetActivationFunnelCacheForTests,
  summarizeActivationRows,
  type ActivationFunnelReport,
} from "../lib/telemetry/activationFunnelReport";
import { formatIsoWeekSlug, getIsoWeekInfo } from "../lib/isoWeek";

/*
 * The activation events were written by every surface and read by nothing, so
 * `ROADMAP.md`'s first open item — find the leaking step before adding surface — could
 * not be answered without running a credentialed script by hand.
 *
 * What these hold: the ISO-week bucketing (a misaligned bucket makes the week-over-week
 * comparison meaningless while still looking like a number), the refusal to report a
 * partial window as a whole one, the three states staying distinct, and the fact that the
 * line this produces is not a percentage. The funnel carries no identity on purpose, so
 * there is no conversion rate to compute and none may be added.
 */

const NOW = new Date("2026-09-25T09:00:00.000Z"); // a Friday, in 2026-w39

const row = (iso: string, event: unknown) => ({
  timestamp: iso.replace("T", " ").replace(/\.\d+Z$/, "").replace("Z", ""),
  blob2: JSON.stringify(event),
});

const visit = (path = "/") => ({ step: "visited", path } as const);
const orient = (path = "/signals") => ({ step: "oriented", path } as const);
const commit = (commitment: "copied_slack" | "subscribed", path = "/share") =>
  ({ step: "committed", path, commitment } as const);
const comeBack = (gap: "next_week" | "lapsed", path = "/") => ({ step: "returned", path, gap } as const);

describe("activation funnel report", () => {
  it("reports the two most recent closed ISO weeks, oldest first", () => {
    const slugs = funnelWeekSlugs(NOW);

    assert.equal(slugs.length, 2);
    // 2026-09-25 is a Friday, in 2026-w39, so the closed weeks are w37 and w38.
    assert.deepEqual(slugs, ["2026-w37", "2026-w38"]);

    const weeks = summarizeActivationRows(
      [row("2026-09-16T10:00:00Z", visit()), row("2026-09-23T10:00:00Z", visit())],
      NOW,
    );

    assert.equal(weeks[0]?.week, "2026-w37");
    assert.equal(weeks[0]?.counts.visited, 0);
    assert.equal(weeks[1]?.week, "2026-w38");
    assert.equal(weeks[1]?.counts.visited, 1);
  });

  it("leaves the week still running out of the counts", () => {
    /*
     * The point of the whole change. On the Monday cron the running week is two days
     * old; folding it in made the delta measure the day of the week. Its events must
     * be dropped, not rounded or labelled.
     */
    const weeks = summarizeActivationRows(
      [row("2026-09-23T10:00:00Z", visit()), row("2026-09-24T10:00:00Z", visit())],
      NOW,
    );

    assert.equal(
      weeks.reduce((total, week) => total + week.counts.visited, 0),
      0,
      "both rows are in 2026-w39, which is still running",
    );
  });

  it("walks a week boundary correctly in both directions", () => {
    // A Sunday belongs to the week that began six days earlier, so on Sunday the newest
    // closed week is the one before it.
    const sunday = new Date("2026-09-20T23:00:00.000Z"); // the last day of 2026-w38
    assert.deepEqual(funnelWeekSlugs(sunday), ["2026-w36", "2026-w37"]);

    // The following Monday opens 2026-w39, and the newest closed week becomes w38.
    const monday = new Date("2026-09-21T00:30:00.000Z");
    assert.deepEqual(funnelWeekSlugs(monday), ["2026-w37", "2026-w38"]);

    // New Year's week is the one place a naive "Monday minus 14 days" slips: the week
    // containing 2026-01-02 began in December 2025, so its two closed weeks do too.
    const newYear = new Date("2026-01-02T12:00:00.000Z");
    const slugs = funnelWeekSlugs(newYear);
    assert.equal(slugs.length, 2);
    assert.equal(slugs[0], "2025-w51");
    assert.equal(slugs[1], "2025-w52");
    assert.notEqual(slugs[1], formatIsoWeekSlug(getIsoWeekInfo(newYear)), "the running week is never reported");
  });

  it("counts each step, and records which artifact carried the commitment", () => {
    const weeks = summarizeActivationRows(
      [
        row("2026-09-16T09:00:00Z", visit()),
        row("2026-09-16T09:05:00Z", orient()),
        row("2026-09-16T09:10:00Z", commit("copied_slack")),
        row("2026-09-17T09:10:00Z", commit("copied_slack")),
        row("2026-09-17T09:15:00Z", commit("subscribed")),
        row("2026-09-18T08:00:00Z", comeBack("next_week")),
      ],
      NOW,
    );

    const current = weeks[1]!;
    assert.equal(current.counts.visited, 1);
    assert.equal(current.counts.oriented, 1);
    assert.equal(current.counts.committed, 3);
    assert.equal(current.counts.returned, 1);
    assert.deepEqual(current.commitments, { copied_slack: 2, subscribed: 1 });
  });

  it("refuses to count a row whose step is not one of the four", () => {
    const weeks = summarizeActivationRows(
      [
        row("2026-09-16T09:00:00Z", visit()),
        row("2026-09-23T09:00:00Z", { step: "purchased", path: "/pricing" }),
        row("2026-09-23T09:00:00Z", { step: "visited" }),
        row("2026-09-23T09:00:00Z", "not json"),
      ],
      NOW,
    );

    assert.equal(weeks[1]?.counts.visited, 1, "only the well-formed event is counted");
  });

  it("reports an empty fortnight as zero rather than as missing", () => {
    const weeks = summarizeActivationRows([], NOW);

    assert.equal(weeks.length, 2);
    assert.deepEqual(weeks[1]?.counts, { visited: 0, oriented: 0, committed: 0, returned: 0 });
  });

  it("keeps a week with no visits distinct from a read that could not happen", async () => {
    resetActivationFunnelCacheForTests();

    // A fortnight that genuinely held nothing is a successful read of zeros. No read
    // credentials is a different fact about the pipeline, and the two must never collapse
    // into one number: the first says nobody came, the second says we cannot see.
    const empty = summarizeActivationRows([], NOW);
    assert.equal(empty[1]?.counts.visited, 0);

    const unconfigured = await loadActivationFunnelReport({ config: null });
    assert.deepEqual(unconfigured, { status: "unconfigured" });
  });

  it("refuses a window denser than one query can return instead of under-reporting", async () => {
    resetActivationFunnelCacheForTests();
    /*
     * Every response is a full page, so the reader keeps splitting the window and has to
     * hit a guard. An earlier version of this test returned an empty array and asserted
     * `ok` — it exercised the empty case twice and the dense case not at all, under a name
     * that claimed the latter.
     */
    const fullPage = JSON.stringify({
      data: Array.from({ length: 5_000 }, () => ({ timestamp: "2026-09-16 10:00:00", blob2: JSON.stringify(visit()) })),
    });
    const fetcher = (async () =>
      new Response(fullPage, { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;

    const report = await loadActivationFunnelReport({
      now: NOW,
      config: { accountId: "acct", token: "t", dataset: "whether_telemetry" },
      fetcher,
    });

    assert.equal(report.status, "unavailable", "a truncated fortnight is never reported as a whole one");
    assert.match(report.status === "unavailable" ? report.reason : "", /more than \d+ (queries|rows)|row cap/);
  });

  it("reads the closed weeks and leaves the running week's rows alone", async () => {
    resetActivationFunnelCacheForTests();
    const seen: string[] = [];
    const fetcher = (async (_url: unknown, init: unknown) => {
      seen.push(String((init as { body: string }).body));
      return new Response(
        JSON.stringify({
          data: [
            { timestamp: "2026-09-16 10:00:00", blob2: JSON.stringify(visit()) },
            { timestamp: "2026-09-24 10:00:00", blob2: JSON.stringify(visit()) },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const report = await loadActivationFunnelReport({
      now: NOW,
      config: { accountId: "acct", token: "t", dataset: "whether_telemetry" },
      fetcher,
    });

    assert.equal(report.status, "ok");
    assert.equal(seen.length, 1);
    /*
     * The window is bounded at the Monday the running week opened, not at "now". Ending
     * it at `now` fetched seven days that the bucket lookup then threw away.
     */
    assert.match(seen[0]!, /2026-09-07 00:00:00/, "starts at the Monday of the oldest closed week");
    assert.match(seen[0]!, /2026-09-21 00:00:00/, "ends where the running week opened, exclusive");
    assert.equal(report.status === "ok" && report.weeks[1]?.counts.visited, 1, "the 09-24 row is in the excluded week");
  });

  it("says a failed read is unavailable, with the reason, rather than as zero visits", async () => {
    resetActivationFunnelCacheForTests();
    const fetcher = (async () => new Response("nope", { status: 403 })) as unknown as typeof fetch;

    const report = await loadActivationFunnelReport({
      now: NOW,
      config: { accountId: "acct", token: "t", dataset: "whether_telemetry" },
      fetcher,
    });

    assert.equal(report.status, "unavailable");
    assert.match(report.status === "unavailable" ? report.reason : "", /403/);
  });

  it("never turns the counts into a percentage or into a headcount", () => {
    const report: ActivationFunnelReport = {
      status: "ok",
      generatedAt: NOW.toISOString(),
      weeks: [
        { week: "2026-w37", counts: { visited: 100, oriented: 40, committed: 4, returned: 2 }, commitments: {} },
        { week: "2026-w38", counts: { visited: 120, oriented: 30, committed: 9, returned: 5 }, commitments: {} },
      ],
    };

    const line = formatActivationFunnelLine(report);

    assert.ok(line);
    // The north star and its movement, in counts. A percentage here would be a fabricated
    // funnel: the events carry no identity, so 9 of 120 is not 7.5% of people.
    assert.equal(line, "5 returns recorded last week (+3 vs the week before)");
    assert.doesNotMatch(line, /%|percent|conversion|rate/i);
    /*
     * And not a headcount either. One browser that comes back twice records two events,
     * so "5 readers" would name five people the data cannot count.
     */
    assert.doesNotMatch(line, /reader|visitor|people|users/i);
  });

  it("does not dress a collapse as a negative number", () => {
    const report: ActivationFunnelReport = {
      status: "ok",
      generatedAt: NOW.toISOString(),
      weeks: [
        { week: "2026-w37", counts: { visited: 10, oriented: 5, committed: 3, returned: 5 }, commitments: {} },
        { week: "2026-w38", counts: { visited: 0, oriented: 0, committed: 0, returned: 0 }, commitments: {} },
      ],
    };

    // "0 returns recorded last week (-5 vs the week before)" is arithmetically true and
    // reads like a measurement error rather than a week nobody came back.
    assert.equal(formatActivationFunnelLine(report), "No returns recorded last week; 5 the week before.");
  });

  it("says nothing when both weeks are empty, and cannot be asked about a failed read", () => {
    const empty: ActivationFunnelReport = {
      status: "ok",
      generatedAt: NOW.toISOString(),
      weeks: [
        { week: "2026-w37", counts: { visited: 0, oriented: 0, committed: 0, returned: 0 }, commitments: {} },
        { week: "2026-w38", counts: { visited: 0, oriented: 0, committed: 0, returned: 0 }, commitments: {} },
      ],
    };

    assert.equal(formatActivationFunnelLine(empty), null, "two empty weeks is nothing to say, not '0 returns'");
    /*
     * The other two states cannot reach this function at all. Its parameter type carries
     * `status: "ok"`, so `formatActivationFunnelLine({ status: "unavailable" })` is a
     * compile error — which is why no runtime assertion for it is written here. The
     * handling of those states lives in the two callers that own them:
     * `recordActivationFunnel` refuses to store a non-`ok` read, and `/trust` renders on
     * the line alone.
     */
  });

  it("reads one reader per fifteen minutes and forgets a failed read", async () => {
    resetActivationFunnelCacheForTests();
    let calls = 0;
    const fetcher = (async () => {
      calls += 1;
      return new Response("nope", { status: 500 });
    }) as unknown as typeof fetch;

    const config = { accountId: "acct", token: "t", dataset: "whether_telemetry" };
    await loadActivationFunnelReport({ now: NOW, config, fetcher });
    await loadActivationFunnelReport({ now: NOW, config, fetcher });

    assert.equal(calls, 2, "a failed read is retried rather than remembered for fifteen minutes");

    resetActivationFunnelCacheForTests();
    const ok = (async () =>
      new Response(JSON.stringify({ data: [] }), { status: 200 })) as unknown as typeof fetch;
    await loadActivationFunnelReport({ now: NOW, config, fetcher: ok });
    const before = calls;
    await loadActivationFunnelReport({ now: new Date(NOW.getTime() + 60_000), config, fetcher: ok });
    assert.equal(calls, before, "a successful read is served from cache inside the window");
  });
});
