import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FREE_FOREVER_PROMISE,
  PAID_PLANS_ON_SALE,
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

  /* Until 2026-10-01 Pro sold "Monday delivery to your inbox" and Team a Slack
     channel feed and briefs for boards and investors, all of which the free
     subscribe form and /share deliver. A demand test that prices free things
     measures nothing. */
  it("sells nothing on a paid plan that the free plan already delivers", () => {
    for (const plan of pricingPlans.filter((candidate) => candidate.monthlyPriceUsd !== null)) {
      for (const text of [plan.tagline, ...plan.features]) {
        assert.doesNotMatch(text, /monday|inbox|slack|board|investor/i, `${plan.id} sells a free delivery: ${text}`);
      }
    }
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

  it("does not promise a reserved rate or an onboarding schedule while nothing is on sale", async () => {
    // The cohort paragraph claims a reserved tier rate and priority onboarding.
    // Both exist only once checkout is wired; until then a request records
    // interest and nothing else, and the page has to say that instead.
    const page = await import("../app/pricing/page");
    const html = renderToStaticMarkup(page.default());
    if (PAID_PLANS_ON_SALE) {
      assert.match(html, /reserves your tier rate/);
    } else {
      assert.doesNotMatch(html, /reserves your tier rate|pilot organizations|priority onboarding/i);
      // Said on each paid card, beside its price (2026-09-30), rather than after the buttons.
      assert.equal(html.split("Cannot be bought yet").length - 1, 2, "once per paid plan");
      assert.ok(html.indexOf("Cannot be bought yet") < html.indexOf("Request Pro access"), "before the first request button");
      // A plain fact about the offer, in the neutral ink (2026-10-07): in the
      // caution amber it read as a warning about the product.
      const line = /<p class="([^"]*)">Cannot be bought yet/.exec(html)?.[1] ?? "";
      assert.ok(line, "the line renders in its own paragraph");
      assert.doesNotMatch(line, /amber|caution/);
    }
  });
});
