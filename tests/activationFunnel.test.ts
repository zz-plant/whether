import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  classifyArrival,
  classifyReturnGap,
  currentWeekSlug,
  isActivationEvent,
  resolveReturnVisit,
  weeksBetweenSlugs,
} from "../lib/activationFunnel";

describe("activation event contract", () => {
  it("accepts each defined step", () => {
    assert.ok(isActivationEvent({ step: "visited", path: "/" }));
    assert.ok(isActivationEvent({ step: "oriented", path: "/" }));
    assert.ok(isActivationEvent({ step: "committed", path: "/share", commitment: "copied_slack" }));
    assert.ok(isActivationEvent({ step: "returned", path: "/", gap: "next_week" }));
  });

  it("rejects payloads the intake should not persist", () => {
    assert.equal(isActivationEvent(null), false);
    assert.equal(isActivationEvent({ step: "visited" }), false);
    assert.equal(isActivationEvent({ step: "visited", path: "" }), false);
    assert.equal(isActivationEvent({ step: "invented", path: "/" }), false);
    assert.equal(isActivationEvent({ step: "committed", path: "/", commitment: "paid_us" }), false);
    assert.equal(isActivationEvent({ step: "returned", path: "/", gap: "someday" }), false);
  });
});

describe("return detection", () => {
  it("buckets the gap rather than reporting an exact week count", () => {
    assert.equal(classifyReturnGap(0), "same_week");
    assert.equal(classifyReturnGap(1), "next_week");
    assert.equal(classifyReturnGap(4), "within_month");
    assert.equal(classifyReturnGap(5), "lapsed");
  });

  it("counts weeks across a year boundary", () => {
    assert.equal(weeksBetweenSlugs("2026-w31", "2026-w33"), 2);
    assert.equal(weeksBetweenSlugs("2025-w51", "2026-w01"), 2);
    assert.equal(weeksBetweenSlugs("nonsense", "2026-w01"), null);
  });

  it("does not count a first visit as a return", () => {
    const { gap, nextStoredSlug } = resolveReturnVisit(null, new Date("2026-08-03T12:00:00Z"));
    assert.equal(gap, null);
    assert.equal(nextStoredSlug, currentWeekSlug(new Date("2026-08-03T12:00:00Z")));
  });

  it("does not count a second visit in the same week as a return", () => {
    const now = new Date("2026-08-05T12:00:00Z");
    assert.equal(resolveReturnVisit(currentWeekSlug(now), now).gap, null);
  });

  it("counts the following week as the ritual working", () => {
    // The one number that says a weekly-ritual product succeeded.
    const now = new Date("2026-08-10T12:00:00Z");
    const lastWeek = currentWeekSlug(new Date("2026-08-03T12:00:00Z"));
    assert.equal(resolveReturnVisit(lastWeek, now).gap, "next_week");
  });

  it("ignores a stored week from the future rather than reporting a negative gap", () => {
    const now = new Date("2026-08-03T12:00:00Z");
    const ahead = currentWeekSlug(new Date("2026-09-07T12:00:00Z"));
    assert.equal(resolveReturnVisit(ahead, now).gap, null);
  });

  it("advances the stored week on every visit", () => {
    const now = new Date("2026-08-10T12:00:00Z");
    for (const stored of [null, "2026-w01", currentWeekSlug(now)]) {
      assert.equal(resolveReturnVisit(stored, now).nextStoredSlug, currentWeekSlug(now));
    }
  });
});

describe("arrival bucket", () => {
  const siteHost = "whether.work";

  it("buckets a referrer by host and keeps nothing else", () => {
    assert.equal(classifyArrival({ referrer: "", siteHost, sharedLink: false }), "direct");
    assert.equal(classifyArrival({ referrer: "https://www.google.co.uk/search?q=hiring", siteHost, sharedLink: false }), "search");
    assert.equal(classifyArrival({ referrer: "https://news.ycombinator.com/item?id=1", siteHost, sharedLink: false }), "social");
    assert.equal(classifyArrival({ referrer: "https://t.co/abc", siteHost, sharedLink: false }), "social");
    assert.equal(classifyArrival({ referrer: "https://app.slack.com/client/T1", siteHost, sharedLink: false }), "chat");
    assert.equal(classifyArrival({ referrer: "https://whether.work/signals", siteHost, sharedLink: false }), "internal");
    assert.equal(classifyArrival({ referrer: "https://someblog.example/post", siteHost, sharedLink: false }), "other");
    assert.equal(classifyArrival({ referrer: "not a url", siteHost, sharedLink: false }), "other");
  });

  it("does not mistake a lookalike host for a known one", () => {
    assert.equal(classifyArrival({ referrer: "https://notx.com/", siteHost, sharedLink: false }), "other");
    assert.equal(classifyArrival({ referrer: "https://evilslack.com/", siteHost, sharedLink: false }), "other");
  });

  it("counts the share tag as a shared link even with no referrer", () => {
    assert.equal(classifyArrival({ referrer: "", siteHost, sharedLink: true }), "shared-link");
  });
});

describe("activation intake", () => {
  it("accepts a visit with its bucket and first-visit flag", () => {
    assert.equal(isActivationEvent({ step: "visited", path: "/", arrival: "search", firstVisit: true }), true);
    assert.equal(isActivationEvent({ step: "visited", path: "/" }), true);
  });

  it("refuses an unknown bucket, a non-boolean flag, and any field a step does not carry", () => {
    assert.equal(isActivationEvent({ step: "visited", path: "/", arrival: "https://google.com" }), false);
    assert.equal(isActivationEvent({ step: "visited", path: "/", firstVisit: "yes" }), false);
    assert.equal(isActivationEvent({ step: "visited", path: "/", referrer: "https://google.com" }), false);
    assert.equal(isActivationEvent({ step: "oriented", path: "/", arrival: "search" }), false);
    assert.equal(isActivationEvent({ step: "committed", path: "/", commitment: "subscribed", email: "a@b.co" }), false);
  });
});
