import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageShell } from "../components/pageShell";
import { ActionLink } from "../components/ui/actionLink";
import { buildCanonicalUrl } from "../../lib/seo";
import { buildPricingStructuredData } from "../../lib/seo/pageStructuredData";
import {
  FREE_FOREVER_PROMISE,
  PAID_PLANS_ON_SALE,
  formatMonthlyPrice,
  pricingPlans,
  type PricingPlan,
} from "../../lib/pricing";

import {
  FreeTierGlyph,
  ProTierGlyph,
  TeamTierGlyph,
} from "../components/illustrations/PricingTierGlyphs";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "The weekly operating call, the API, MCP, and embeds are free forever. Pro and Team buy continuity and team ritual.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: buildCanonicalUrl("/pricing"),
    title: "Pricing | Whether",
    description:
      "The weekly operating call, the API, MCP, and embeds are free forever. Pro and Team buy continuity and team ritual.",
  },
};

/**
 * Pricing before paywall.
 *
 * Checkout is deliberately not wired to these buttons. The page exists to state
 * an offer and to find out whether anyone wants it at a stated price — the one
 * question that intent clicks on ungated features cannot answer. The CTA
 * registers interest and carries `data-premium-intent`, which the global
 * PremiumFunnelTracker turns into a `premium_intent` event tagged with the plan.
 */
function PlanCard({ plan }: { plan: PricingPlan }) {
  const isFree = plan.monthlyPriceUsd === null;

  return (
    <article
      className={`weather-surface flex flex-col gap-4 px-5 py-5 ${
        isFree ? "border-sky-500/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-fluid-sm font-semibold text-white">{plan.name}</h2>
          <p className="text-fluid-xs text-slate-400">{plan.audience}</p>
        </div>
        {plan.id === "free" ? (
          <FreeTierGlyph size={32} />
        ) : plan.id === "pro" ? (
          <ProTierGlyph size={32} />
        ) : (
          <TeamTierGlyph size={32} />
        )}
      </div>

      <p className="text-2xl font-bold text-white">{formatMonthlyPrice(plan)}</p>
      <p className="text-fluid-xs text-slate-300">{plan.tagline}</p>

      <ul className="space-y-2 text-fluid-xs text-slate-300">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-2">
        {isFree ? (
          <ActionLink href="/" variant="primary">
            Read this week&apos;s call
          </ActionLink>
        ) : (
          <ActionLink
            href={`/contact?plan=${plan.id}`}
            variant="pill"
            data-premium-intent="pricing_page"
            data-premium-cta={`pricing-${plan.id}`}
            data-premium-detail={plan.id}
          >
            {plan.id === "team" ? "Activate Team Workspace" : "Request Pro Access"}
          </ActionLink>
        )}
      </div>
    </article>
  );
}

export default function PricingPage() {
  return (
    <PageShell
      backdropVariant="hub"
      structuredData={buildPricingStructuredData({ plans: pricingPlans, paidPlansOnSale: PAID_PLANS_ON_SALE })}
    >
      <div className="mx-auto max-w-[64rem] space-y-5 sm:space-y-8 px-4 py-4 sm:py-8">
        <header className="space-y-2.5 sm:space-y-3">
          <h1 className="text-fluid-lg font-semibold text-white">Pricing</h1>
          <p className="max-w-2xl text-fluid-sm text-slate-300">{FREE_FOREVER_PROMISE}</p>
          {/* The promise above is the strongest data claim this site makes, and
              until /privacy existed there was nowhere to check it. A claim a
              reader cannot verify is worth less than the work behind making it
              true, and there is real work behind this one. */}
          <p className="max-w-2xl text-fluid-xs text-slate-400">
            <Link href="/privacy" className="text-sky-300 underline-offset-2 hover:underline">
              What that means in practice
            </Link>{" "}
            — every store, cookie, and measurement, itemised.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Priority onboarding and cohort rollout. Stated with institutional clarity
            while preserving the free forever promise. */}
        <section className="weather-panel space-y-3 px-5 py-5">
          <h2 className="type-eyebrow">Priority cohort onboarding</h2>
          <p className="max-w-2xl text-fluid-xs text-slate-300">
            Pro and Team tiers are currently onboarding pilot organizations in staged cohorts.
            Requesting access reserves your tier rate and schedules priority onboarding for Slack regime alerts, board presentation export, and team decision memory. The core weekly brief, API, and MCP remain free forever.
          </p>
          <p className="max-w-2xl text-fluid-xs text-slate-400">
            Questions about custom enterprise models or multi-team rollouts?{" "}
            <Link href="/contact" className="underline decoration-slate-600 underline-offset-4 hover:text-white">
              Contact us
            </Link>
            .
          </p>
        </section>
      </div>
    </PageShell>
  );
}
