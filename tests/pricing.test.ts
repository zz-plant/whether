import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  FREE_FOREVER_PROMISE,
  findPricingPlan,
  formatMonthlyPrice,
  pricingPlans,
} from "../lib/pricing";
import { PREMIUM_INTENT_SOURCES } from "../lib/premiumFunnel";
import { utilityLinks } from "../lib/navigation/informationArchitecture";

describe("pricing offer", () => {
  it("prices the paid plans rather than leaving them to be guessed at", () => {
    // A page without prices measures curiosity; the point of shipping one is to
    // measure willingness to pay.
    assert.equal(findPricingPlan("pro")?.monthlyPriceUsd, 49);
    assert.equal(findPricingPlan("team")?.monthlyPriceUsd, 199);
    assert.equal(formatMonthlyPrice(findPricingPlan("pro")!), "$49/mo");
  });

  it("renders the free plan as a promise, not as a zero", () => {
    const free = findPricingPlan("free");
    assert.equal(free?.monthlyPriceUsd, null);
    assert.equal(formatMonthlyPrice(free!), "Free forever");
    assert.equal(free?.promise, FREE_FOREVER_PROMISE);
  });

  it("keeps the call, the API, MCP, and embeds on the free plan", () => {
    // This is the claim the launch rests on and the one that cannot be walked
    // back later, so it is asserted rather than left to copy review.
    const free = findPricingPlan("free")!;
    const text = [free.promise ?? "", ...free.features].join(" ").toLowerCase();

    for (const promised of ["api", "mcp", "embed"]) {
      assert.ok(text.includes(promised), `free plan no longer promises ${promised}`);
    }
    assert.match(free.promise ?? "", /free forever/i);
  });

  it("never puts the weekly call behind a paid plan", () => {
    for (const plan of pricingPlans.filter((candidate) => candidate.monthlyPriceUsd !== null)) {
      for (const feature of plan.features) {
        assert.ok(
          !/^the weekly operating call/i.test(feature),
          `${plan.id} claims the call itself: ${feature}`,
        );
      }
    }
  });

  it("has a dedicated intent source so priced demand is separable", () => {
    assert.ok(PREMIUM_INTENT_SOURCES.includes("pricing_page"));
  });

  it("is reachable from navigation", () => {
    assert.ok(utilityLinks.some((link) => link.href === "/pricing"));
  });
});
