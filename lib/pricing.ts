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
 * audience it launches to rests on not being a bait-and-switch. Paid plans add
 * delivery and memory, never access to the call itself.
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
  "The weekly operating guidance, the API, the MCP endpoint, and embeds are free forever. No signup, no key, no trackers. Paid plans add Monday delivery to email and Slack — never access to the guidance itself.";

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPriceUsd: null,
    tagline: "All the guidance, permanently",
    audience: "Any operator who wants Monday's guidance",
    promise: FREE_FOREVER_PROMISE,
    features: [
      "The weekly operating guidance, scored and dated",
      "Published scoring, thresholds, and reversal conditions",
      "Copyable Slack, email, and meeting artifacts",
      "Agent API and MCP endpoint — no key, no rate card",
      "Embeds for a dashboard or wiki",
      "The full guidance history and archive",
      /* Split because the two are stored in different places, and saying
         "saved in this browser" of both contradicted /privacy 2.4, which tells
         a reader that recorded decisions are held in Cloudflare KV against the
         browser identifier. Understating where a reader's data goes is the
         direction that costs trust. */
      "Decisions you record, kept against this browser's identifier",
      "Week close-outs and what you have already reviewed, in this browser",
      "Email when conditions change between Mondays",
      /* Moved from Pro on 2026-10-01: the published-line alert ships free (and was
         promised free on the homepage), and plan lines are the use the record fits,
         so gating them behind a plan nobody can buy would make them unreachable. */
      "Email the day a score crosses a pause or resume line, or a line you set for your own plan",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPriceUsd: 49,
    tagline: "Monday delivery to your inbox",
    audience: "One person who reads the guidance every Monday",
    features: [
      "The guidance in your inbox every Monday morning",
      "Decision memory that follows you across devices and survives a cleared browser",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthlyPriceUsd: 199,
    tagline: "The same guidance for the whole team",
    audience: "A team that reads the same guidance each week",
    features: [
      "Everything in Pro, for the whole team",
      "Slack delivery into the channel where the decision happens",
      "Shared decision log across the team",
      "Briefs formatted for boards and investors",
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
