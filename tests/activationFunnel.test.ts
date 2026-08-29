import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
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
