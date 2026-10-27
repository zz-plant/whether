import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { assessPublishReadiness } from "../lib/report/briefPublishGuard";
import { type PublishedBrief } from "../lib/report/publishedBriefs";

describe("freeze script append-only & correction semantics", () => {
  const sampleBrief: PublishedBrief = {
    slug: "2026-w31",
    year: 2026,
    week: 31,
    publishedAt: "2026-07-30T00:00:00.000Z",
    recordDate: "2026-07-30",
    recordDateLabel: "Jul 30, 2026",
    headline: "Guarded Expansion — Late — week of Jul 30, 2026",
    summary: "Keep expansion selective",
    postureLabel: "Guarded Expansion — Late",
    regime: "EXPANSION",
    confidenceLabel: "MED",
    whatChanged: "Pressure increased by +1.2 this week.",
    actionNow: "Conditions tightening",
    guardrailThreshold: "Over-engineering",
    flipThreshold: "No flip condition",
    decisions: [],
    evidence: [],
    sourceLabel: "Canonical snapshot",
    freshnessLabel: "Aug 1, 2026",
    correction: "Correction note from audit",
  };

  it("preserves existing correction and original publishedAt when updating a record", () => {
    const existing = [sampleBrief];
    const slug = "2026-w31";
    const existingRecord = existing.find((b) => b.slug === slug);

    const updatedRecord: PublishedBrief = {
      ...sampleBrief,
      publishedAt: existingRecord?.publishedAt ?? new Date().toISOString(),
      summary: "Updated summary text",
      correction: existingRecord?.correction ?? null,
    };

    assert.equal(updatedRecord.publishedAt, "2026-07-30T00:00:00.000Z");
    assert.equal(updatedRecord.correction, "Correction note from audit");
  });

  it("strictly refuses degraded snapshots", () => {
    const readiness = assessPublishReadiness({
      degraded: true,
      isFallback: false,
      isLive: true,
      macroSeries: [],
      recordDate: "2026-08-27",
      now: new Date("2026-08-29T04:00:00Z"),
    });

    assert.equal(readiness.ok, false);
  });

  it("strictly refuses fallback data", () => {
    const readiness = assessPublishReadiness({
      degraded: false,
      isFallback: true,
      isLive: false,
      fallbackReason: "Provider unavailable",
      macroSeries: [],
      recordDate: "2026-08-27",
      now: new Date("2026-08-29T04:00:00Z"),
    });

    assert.equal(readiness.ok, false);
    assert.match(readiness.ok === false ? readiness.reason : "", /fallback/i);
  });
});
