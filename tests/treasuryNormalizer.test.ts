/**
 * Treasury normalization unit tests for API payload mapping.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTreasuryResponse } from "../lib/treasury/treasuryNormalizer";

describe("treasury normalizer", () => {
  it("maps API payload into normalized row", () => {
    const payload = {
      data: [
        {
          record_date: "2026-02-01",
          bc_1month: "5.12",
          bc_2year: "4.8",
          bc_10year: "4.6",
        },
      ],
    };

    const normalized = normalizeTreasuryResponse(payload, {
      fetched_at: "2026-02-02T00:00:00Z",
      source: "Treasury",
      isLive: true,
    });

    assert.ok(normalized);
    assert.equal(normalized?.record_date, "2026-02-01");
    assert.equal(normalized?.yields.oneMonth, 5.12);
    assert.equal(normalized?.isLive, true);
  });

  it("returns null for invalid payload shape", () => {
    const normalized = normalizeTreasuryResponse(
      { data: "not-an-array" },
      {
        fetched_at: "2026-02-02T00:00:00Z",
        source: "Treasury",
        isLive: true,
      }
    );

    assert.equal(normalized, null);
  });

});
