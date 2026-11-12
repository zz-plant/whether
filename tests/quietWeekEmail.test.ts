import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { briefIsQuietWeek } from "../lib/export/briefBuilders";
import { buildOperatingSnapshot } from "../lib/operatingState/snapshot";
import { briefSourceFromSnapshot, buildBriefDocument } from "../lib/report/briefDocument";
import type { BriefDocument } from "../lib/report/briefArtifact";
import { snapshotData } from "../lib/snapshot";
import { liveMacroSeries } from "./fixtures/reportFixtures";

/*
 * Most Mondays nothing moves (2026-11-03). On those weeks the homepage folds its
 * explanation and the Monday email leaves out the two readings and their basis.
 * The rule is `briefIsQuietWeek`: an earlier reading was compared, no area paused or
 * restarted, the conditions held, the room before a change is plenty, and the
 * guidance is not on hold.
 */
const ordinaryDocument = (): BriefDocument => {
  const snapshot = buildOperatingSnapshot({
    treasury: { ...snapshotData, isLive: true, record_date: "2026-08-28", fetched_at: "2026-08-28T12:00:00.000Z" },
    macroSeries: liveMacroSeries,
    now: new Date("2026-08-31T12:00:00.000Z"),
  });
  return buildBriefDocument(briefSourceFromSnapshot(snapshot), snapshot.weeklyCall);
};

const withPrevious = (document: BriefDocument, previous: BriefDocument["readings"]["previous"]): BriefDocument => ({
  ...document,
  readings: { ...document.readings, previous },
});

describe("a quiet week, by the brief document", () => {
  const document = ordinaryDocument();
  const same = { tightness: document.readings.scores.tightness, riskAppetite: document.readings.scores.riskAppetite, label: "Jul 31" };

  it("is quiet when nothing moved since a compared reading and there is plenty of room", () => {
    assert.equal(document.slots.policyOverrideActive, false, "the fixture is an ordinary week");
    assert.equal(briefIsQuietWeek({ ...withPrevious(document, same), confidence: "HIGH" }), true);
  });

  it("is not quiet with nothing compared, with less room, or on a held week", () => {
    assert.equal(briefIsQuietWeek({ ...withPrevious(document, null), confidence: "HIGH" }), false, "nothing compared");
    assert.equal(briefIsQuietWeek({ ...withPrevious(document, same), confidence: "MED" }), false, "only some room");
    assert.equal(
      briefIsQuietWeek({ ...withPrevious(document, same), confidence: "HIGH", slots: { ...document.slots, policyOverrideActive: true } }),
      false,
      "the guidance is on hold, and the readings explain it",
    );
  });

  it("is not quiet in a week whose conditions changed, even with both scores where they were", () => {
    // 2026-11-09: 90 and 53 at both readings, conditions from Cloudy to Freezing. The email would
    // have left out the two readings as a week in which nothing happened.
    assert.equal(briefIsQuietWeek({ ...withPrevious(document, { ...same, regimeChanged: true }), confidence: "HIGH" }), false);
  });

  it("is not quiet on a week a score moved an area", () => {
    const moved = { ...same, riskAppetite: same.riskAppetite > 50 ? 30 : 80 };
    assert.equal(briefIsQuietWeek({ ...withPrevious(document, moved), confidence: "HIGH" }), false);
  });
});
