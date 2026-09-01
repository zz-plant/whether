import assert from "node:assert/strict";
import { describe, it } from "bun:test";

// @ts-expect-error mjs test helper has no TS declarations
import { evaluateRefreshQueue } from "../scripts/seo-refresh-queue.mjs";

const basePage = {
  kind: "decide",
  title: "Capital planning",
  snapshot: {
    recordDate: "2026-03-01",
    fetchedAtIso: "2026-03-01T00:00:00.000Z",
    previousRecordDate: "2026-02-22",
  },
  payload: {
    noindex: false,
  },
};

describe("seo refresh queue", () => {
  it("marks stale pages for immediate noindex and P0 refresh queue", () => {
    const result = evaluateRefreshQueue({
      payloadRecords: [
        {
          ...basePage,
          url: "/answer/ceo/capital-raising",
        },
      ],
      metricsByUrl: {
        "/answer/ceo/capital-raising": {
          trafficTier: "high",
          ctaConversionRate: 0.08,
        },
      },
      previousStatusByUrl: {},
      now: new Date("2026-03-20T00:00:00.000Z"),
      staleAfterHours: 24 * 7,
    });

    assert.equal(result.queue.length, 1);
    assert.equal(result.queue[0]?.noindexNow, true);
    assert.equal(result.queue[0]?.priority, "p0");
    assert.ok(result.queue[0]?.reasons.includes("freshness-stale"));
    assert.equal(result.statusByUrl["/answer/ceo/capital-raising"]?.slaState, "due-soon");
  });

  it("queues high-tier low-conversion pages without forcing noindex", () => {
    const result = evaluateRefreshQueue({
      payloadRecords: [
        {
          ...basePage,
          url: "/signals/risk-appetite-watch/hiring",
          snapshot: {
            ...basePage.snapshot,
            fetchedAtIso: "2026-03-18T00:00:00.000Z",
          },
        },
      ],
      metricsByUrl: {
        "/signals/risk-appetite-watch/hiring": {
          organicEntrances30d: 2200,
          ctaConversionRate: 0.01,
        },
      },
      previousStatusByUrl: {},
      now: new Date("2026-03-20T00:00:00.000Z"),
      staleAfterHours: 24 * 14,
    });

    assert.equal(result.queue.length, 1);
    assert.equal(result.queue[0]?.noindexNow, false);
    assert.equal(result.queue[0]?.priority, "p1");
    assert.ok(result.queue[0]?.reasons.includes("conversion-below-tier-target"));
  });

  it("preserves prior refresh request timestamps for still-queued pages", () => {
    const result = evaluateRefreshQueue({
      payloadRecords: [
        {
          ...basePage,
          url: "/toolkits/focus/risk-appetite-watch",
        },
      ],
      metricsByUrl: {
        "/toolkits/focus/risk-appetite-watch": {
          trafficTier: "medium",
          ctaConversionRate: 0.01,
        },
      },
      previousStatusByUrl: {
        "/toolkits/focus/risk-appetite-watch": {
          lastRefreshRequestedAtIso: "2026-03-10T12:00:00.000Z",
          lastRefreshedAtIso: null,
        },
      },
      now: new Date("2026-03-12T12:00:00.000Z"),
      staleAfterHours: 24 * 14,
    });

    assert.equal(
      result.statusByUrl["/toolkits/focus/risk-appetite-watch"]?.lastRefreshRequestedAtIso,
      "2026-03-10T12:00:00.000Z",
    );
    assert.equal(
      result.statusByUrl["/toolkits/focus/risk-appetite-watch"]?.slaDueAtIso,
      "2026-03-17T12:00:00.000Z",
    );
  });

  it("marks carried-over queued pages as overdue when prior SLA has already elapsed", () => {
    const result = evaluateRefreshQueue({
      payloadRecords: [
        {
          ...basePage,
          url: "/answer/ceo/runway-planning",
        },
      ],
      metricsByUrl: {
        "/answer/ceo/runway-planning": {
          trafficTier: "high",
          ctaConversionRate: 0.01,
        },
      },
      previousStatusByUrl: {
        "/answer/ceo/runway-planning": {
          lastRefreshRequestedAtIso: "2026-03-01T00:00:00.000Z",
          lastRefreshedAtIso: null,
        },
      },
      now: new Date("2026-03-10T12:00:00.000Z"),
      staleAfterHours: 24 * 14,
    });

    assert.equal(result.statusByUrl["/answer/ceo/runway-planning"]?.slaDueAtIso, "2026-03-04T00:00:00.000Z");
    assert.equal(result.statusByUrl["/answer/ceo/runway-planning"]?.slaState, "overdue");
  });

  it("flags sustained high-intent underperformers as merge-or-prune candidates", () => {
    const result = evaluateRefreshQueue({
      payloadRecords: [
        {
          ...basePage,
          url: "/answers/should-startups-slow-roadmap-expansion",
        },
      ],
      metricsByUrl: {
        "/answers/should-startups-slow-roadmap-expansion": {
          trafficTier: "high",
          ctaConversionRate: 0.01,
        },
      },
      previousStatusByUrl: {
        "/answers/should-startups-slow-roadmap-expansion": {
          underperformingStreak: 2,
        },
      },
      now: new Date("2026-03-20T00:00:00.000Z"),
      staleAfterHours: 24 * 14,
    });

    assert.equal(result.queue.length, 1);
    assert.ok(result.queue[0]?.reasons.includes("merge-or-prune-candidate"));
    assert.equal(result.queue[0]?.pruneCandidate, true);
    assert.equal(result.statusByUrl["/answers/should-startups-slow-roadmap-expansion"]?.underperformingStreak, 3);
  });
});
