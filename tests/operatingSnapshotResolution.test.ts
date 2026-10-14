import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";

import { macroSeries } from "../lib/macroSnapshot";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import {
  assessReadingReadiness,
  assessSnapshotReadiness,
  resolveOperatingSnapshot,
} from "../lib/operatingState/resolveSnapshot";
import { snapshotData } from "../lib/snapshot";
import { liveMacroSeries } from "./fixtures/reportFixtures";

/*
 * "The current snapshot", asked one way.
 *
 * Five senders answered it five ways when nothing was stored: the weekly email
 * refused, the month-end pulse returned nothing, the alert delivery and the
 * regime check fell back to a report read, and the Slack post skipped the store
 * for the report. The answer is one function now, and the miss policy is the
 * caller's, named at the call. Readiness is one function too: the email judged
 * a snapshot's own flags and the Slack post the treasury's stamp, so a reading
 * marked one way and not the other was sendable by one and refused by the other.
 */

const NOW = new Date("2026-08-31T12:00:00.000Z");

const liveSnapshot = (recordDate = "2026-08-28") =>
  buildOperatingSnapshot({
    treasury: { ...snapshotData, isLive: true, record_date: recordDate, fetched_at: `${recordDate}T12:00:00.000Z` },
    macroSeries: liveMacroSeries,
    now: NOW,
  });

afterEach(() => {
  resetOperatingSnapshotStore();
});

describe("resolveOperatingSnapshot", () => {
  it("uses a given snapshot as given, with its own weekly call unless one is passed", async () => {
    resetOperatingSnapshotStore();
    const given = liveSnapshot();
    await resetOperatingSnapshotStore().write(liveSnapshot("2026-08-21"));

    const reading = await resolveOperatingSnapshot({ given: { snapshot: given }, onMiss: "refuse" });

    assert.ok(reading);
    assert.equal(reading.source, "given");
    assert.equal(reading.snapshot.recordDate, "2026-08-28", "the cron's snapshot, not the stored one");
    assert.deepEqual(reading.weeklyCall, given.weeklyCall);
  });

  it("reads the stored snapshot for a manual run that passes nothing", async () => {
    await resetOperatingSnapshotStore().write(liveSnapshot("2026-08-21"));

    const reading = await resolveOperatingSnapshot({ onMiss: "refuse" });

    assert.ok(reading);
    assert.equal(reading.source, "stored");
    assert.equal(reading.snapshot.recordDate, "2026-08-21");
  });

  it("returns nothing on a miss when the caller refuses", async () => {
    resetOperatingSnapshotStore();
    assert.equal(await resolveOperatingSnapshot({ onMiss: "refuse" }), null);
  });

  it("reads the report on a miss when the caller asks, and the copy it serves offline is not sendable", async () => {
    resetOperatingSnapshotStore();

    const reading = await resolveOperatingSnapshot({ onMiss: "report", route: "test" });

    assert.equal(reading.source, "report");
    const readiness = assessReadingReadiness(reading, NOW);
    assert.equal(readiness.ok, false, "offline, the report read serves the bundled copy");
  });

  it("can skip the store for a caller whose report read is the source of truth", async () => {
    await resetOperatingSnapshotStore().write(liveSnapshot());

    const reading = await resolveOperatingSnapshot({ onMiss: "report", consultStore: false, route: "test" });

    assert.equal(reading.source, "report");
  });
});

describe("assessSnapshotReadiness", () => {
  it("sends a live reading dated inside the window", () => {
    assert.deepEqual(assessSnapshotReadiness(liveSnapshot(), NOW), { ok: true });
  });

  it("refuses a reading that is live by its flag but carries a fallback stamp", () => {
    const snapshot = liveSnapshot();
    const stamped = {
      ...snapshot,
      treasury: { ...snapshot.treasury, fallback_at: "2026-08-28T12:00:00.000Z", fallback_reason: "Partial treasury data" },
    };

    const readiness = assessSnapshotReadiness(stamped, NOW);

    assert.equal(readiness.ok, false, "the email used to send this; the Slack post refused it");
    assert.match(readiness.ok ? "" : readiness.reason, /fallback snapshot, not a live reading \(Partial treasury data\)/);
  });

  it("refuses a live Treasury reading scored on a macro series the snapshot filled in", () => {
    const snapshot = liveSnapshot();
    const partial = {
      ...snapshot,
      macroSeries: snapshot.macroSeries.map((series) =>
        series.id === "HY_CREDIT_SPREAD" ? { ...series, isLive: false } : series,
      ),
    };

    const readiness = assessSnapshotReadiness(partial, NOW);

    assert.equal(readiness.ok, false);
    assert.match(readiness.ok ? "" : readiness.reason, /Macro inputs are snapshot values/);
  });

  it("refuses the bundled snapshot, which is what an outage serves", () => {
    const fallback = buildOperatingSnapshot({ treasury: snapshotData, macroSeries, now: NOW });
    assert.equal(assessSnapshotReadiness(fallback, NOW).ok, false);
  });
});
