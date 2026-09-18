/**
 * The offer.
 *
 * The billing substrate has existed since before this file: `pro` and `team`
 * plans, a working checkout endpoint, and intent telemetry across five surfaces.
 * What was missing was a price. Intent measured against no stated price counts
 * curiosity, not willingness to pay, and those are the two things the pre-reveal
 * go/no-go in docs/premium-launch-readiness.md most needs to tell apart.
 *
 * So this is a demand test before it is a paywall: the prices are real and the
 * checkout is not wired to them yet. The CTA registers interest and emits a
 * `premium_intent` event carrying the plan the visitor chose after seeing what
 * it costs.
 *
 * The free tier is the load-bearing half. The weekly call, the API, MCP, and
 * embeds are free permanently, and saying so in writing is what makes the paid
 * tiers legible rather than threatening — this product's credibility with the
 * audience it launches to rests on not being a bait-and-switch. Paid packages
 * continuity and team ritual, never access to the call itself.
 */
type PricingPlanId = "free" | "pro" | "team";

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  /** Display price. `null` renders as "Free forever" rather than "$0". */
  monthlyPriceUsd: number | null;
  tagline: string;
  audience: string;
  features: string[];
  /** Shown on the free plan: the promise, stated so it can be held to. */
  promise?: string;
};

/**
 * Whether Pro and Team can be bought today. False means /pricing registers interest
 * and every PremiumGate renders its children ungated — the entitlement rail behind
 * checkout is wired (see docs/premium-launch-readiness.md) but nothing sells it.
 * Flip this, not the gate, when the plans go on sale, so the two cannot disagree.
 */
export const PAID_PLANS_ON_SALE = false;

export const FREE_FOREVER_PROMISE =
  "The weekly operating call, the API, the MCP endpoint, and embeds are free forever. No signup, no key, no trackers. Paid plans buy continuity and team ritual — never access to the call itself.";

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPriceUsd: null,
    tagline: "The whole call, permanently",
    audience: "Any operator who wants the Monday call",
    promise: FREE_FOREVER_PROMISE,
    features: [
      "The weekly operating call, scored and dated",
      "Published scoring, thresholds, and reversal conditions",
      "Copyable Slack, email, and meeting artifacts",
      "Agent API and MCP endpoint — no key, no rate card",
      "Embeds for a dashboard or wiki",
      "The full call history and archive",
      /* Split because the two are stored in different places, and saying
         "saved in this browser" of both contradicted /privacy 2.4, which tells
         a reader that recorded decisions are held in Cloudflare KV against the
         browser identifier. Understating where a reader's data goes is the
         direction that costs trust. */
      "Decisions you record, kept against this browser's identifier",
      "Week close-outs and what you have already reviewed, in this browser",
      "Email when the call changes between Mondays",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPriceUsd: 49,
    tagline: "The ritual runs itself",
    audience: "One operator running the Monday meeting",
    features: [
      "Monday delivery to your inbox before the meeting",
      "Threshold alerts — when a score crosses a pause or reopen line, not only when the call flips",
      "Decision memory that follows you across devices and survives a cleared browser",
      "Exports in your own framing rather than the default",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthlyPriceUsd: 199,
    tagline: "One call the whole team is reading",
    audience: "A leadership team aligning weekly",
    features: [
      "Everything in Pro, for the whole leadership team",
      "Slack delivery into the channel where the decision happens",
      "Shared decision log across the team",
      "Board- and investor-ready brief packaging",
    ],
  },
];

export const findPricingPlan = (id: PricingPlanId) => pricingPlans.find((plan) => plan.id === id);

export const formatMonthlyPrice = (plan: PricingPlan) =>
  plan.monthlyPriceUsd === null
    ? "Free forever"
    : `${plan.monthlyPriceUsd.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })}/mo`;
