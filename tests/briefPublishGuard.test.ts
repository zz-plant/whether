import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "bun:test";
import { PUBLISH_MAX_RECORD_AGE_DAYS, assessPublishReadiness } from "../lib/report/briefPublishGuard";

const NOW = new Date("2026-08-29T04:00:00Z");

const ready = (overrides: Partial<Parameters<typeof assessPublishReadiness>[0]> = {}) =>
  assessPublishReadiness({
    degraded: false,
    isFallback: false,
    isLive: true,
    fallbackReason: null,
    recordDate: "2026-08-27",
    now: NOW,
    ...overrides,
  });

describe("publish readiness", () => {
  it("allows a live, current reading through", () => {
    assert.deepEqual(ready(), { ok: true });
  });

  it("refuses the outage that the old guard let through", () => {
    // Observed 2026-08-29: every FRED fetch 403s, the loader falls back to the
    // bundled snapshot, report assembly succeeds, so `degraded` is false. The
    // old guard checked only `degraded` and froze week 2026-w25 from a
    // 2026-06-17 record date, then exited 0.
    const result = ready({
      degraded: false,
      isFallback: true,
      isLive: false,
      fallbackReason: "FRED Treasury fetch error: 403",
      recordDate: "2026-06-17",
    });

    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.reason : "", /fallback snapshot/i);
  });

  it("names the fallback reason so a failed run explains itself", () => {
    const result = ready({ isFallback: true, fallbackReason: "FRED Treasury fetch error: 403" });
    assert.match(result.ok === false ? result.reason : "", /403/);
  });

  it("refuses a stale record date even when nothing is flagged as fallback", () => {
    // Belt and braces: if a provider ever returns stale data without setting a
    // fallback flag, the derived week would still be the wrong week.
    const result = ready({ recordDate: "2026-06-17", isFallback: false, isLive: true });
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.reason : "", /not the week being published/);
  });

  it("allows a record date right at the staleness limit", () => {
    const atLimit = new Date(NOW.getTime() - PUBLISH_MAX_RECORD_AGE_DAYS * 24 * 60 * 60 * 1000);
    assert.equal(ready({ recordDate: atLimit.toISOString().slice(0, 10) }).ok, true);
  });

  it("still refuses when report assembly failed outright", () => {
    assert.equal(ready({ degraded: true }).ok, false);
  });

  it("refuses an unreadable or future record date rather than guessing a week", () => {
    assert.equal(ready({ recordDate: "not-a-date" }).ok, false);
    assert.equal(ready({ recordDate: "2026-12-01" }).ok, false);
  });

  it("tolerates a record date a few hours ahead of the clock", () => {
    // Timezone skew between the data provider and the runner is not a fault.
    assert.equal(ready({ recordDate: "2026-08-29" }).ok, true);
  });
});

describe("staleness boundary", () => {
  it("measures age in whole UTC days, not fractions of one", () => {
    // Record dates are date-only, so an hour-of-day on the clock must not make a
    // ten-day-old reading read as eleven.
    for (const hour of ["T00:00:00Z", "T12:00:00Z", "T23:59:59Z"]) {
      const now = new Date(`2026-08-29${hour}`);
      assert.equal(
        assessPublishReadiness({
          degraded: false,
          isFallback: false,
          isLive: true,
          recordDate: "2026-08-19",
          now,
        }).ok,
        true,
        `rejected at ${hour}`,
      );
    }
  });

  it("rejects the day past the limit at any hour", () => {
    for (const hour of ["T00:00:00Z", "T23:59:59Z"]) {
      assert.equal(
        assessPublishReadiness({
          degraded: false,
          isFallback: false,
          isLive: true,
          recordDate: "2026-08-18",
          now: new Date(`2026-08-29${hour}`),
        }).ok,
        false,
        `accepted at ${hour}`,
      );
    }
  });
});

describe("wiring", () => {
  it("is consulted by both writers that publish a current-week artifact", async () => {
    // The audit that produced this guard found the same defect in two scripts and
    // verified the other two data writers fail loudly. This asserts the writers that
    // needed it keep it — a future edit that drops the import is the regression.
    //
    // The freeze has two writers now — the script and the Workflow — and both build
    // their record through lib/report/publishedBriefRecord.ts, which is where the guard
    // is consulted for them. So the chain is asserted link by link: the shared builder
    // checks readiness, and each writer goes through the shared builder.
    const recordBuilder = await readFile("lib/report/publishedBriefRecord.ts", "utf8");
    assert.ok(
      recordBuilder.includes("assessPublishReadiness"),
      "lib/report/publishedBriefRecord.ts no longer checks publish readiness",
    );

    for (const writer of ["scripts/freezeWeeklyBrief.ts", "worker/workflows/weeklyBriefFreeze.ts"]) {
      const source = await readFile(writer, "utf8");
      assert.ok(source.includes("assembleCurrentWeekBrief"), `${writer} no longer builds its record through the guarded path`);
    }

    const freezeScript = await readFile("scripts/freezeWeeklyBrief.ts", "utf8");
    assert.ok(freezeScript.includes("process.exit(1)"), "scripts/freezeWeeklyBrief.ts no longer fails the run");

    const workflow = await readFile("worker/workflows/weeklyBriefFreeze.ts", "utf8");
    assert.ok(workflow.includes("throw new Error(`not ready to publish"), "the Workflow no longer fails its step on an unready week");

    const slackArtifact = await readFile("scripts/generateWeeklySlackBrief.ts", "utf8");
    assert.ok(slackArtifact.includes("assessPublishReadiness"), "scripts/generateWeeklySlackBrief.ts no longer checks publish readiness");
    assert.ok(slackArtifact.includes("process.exit(1)"), "scripts/generateWeeklySlackBrief.ts no longer fails the run");
  });

  it("keeps the record-age limit aligned with the homepage permalink gate", async () => {
    // Same threshold, deliberately: what may enter the archive and what the
    // homepage will advertise from it are the same judgment.
    const { PUBLISHED_BRIEF_STALE_AFTER_DAYS } = await import("../lib/report/publishedBriefs");
    assert.equal(PUBLISH_MAX_RECORD_AGE_DAYS, PUBLISHED_BRIEF_STALE_AFTER_DAYS);
  });
});
