import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
          url: "/decide/ceo/capital-raising",
        },
      ],
      metricsByUrl: {
        "/decide/ceo/capital-raising": {
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
    assert.equal(result.statusByUrl["/decide/ceo/capital-raising"]?.slaState, "due-soon");
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
  });
});
