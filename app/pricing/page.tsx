import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageShell } from "../components/pageShell";
import { ActionLink } from "../components/ui/actionLink";
import { buildPageMetadata } from "../../lib/seo";
import { buildPricingStructuredData } from "../../lib/seo/pageStructuredData";
import {
  FREE_FOREVER_PROMISE,
  PAID_PLANS_ON_SALE,
  PRICING_SUMMARY,
  formatMonthlyPrice,
  pricingPlans,
  type PricingPlan,
} from "../../lib/pricing";

export const runtime = "edge";

/* Through the shared builder, like every other page. The hand-written block set
   `openGraph` without `images`, and Next replaces that object rather than merging
   it, so /pricing was the one page shared with no preview image at all. */
export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description: PRICING_SUMMARY,
  path: "/pricing",
  imageAlt: "Whether pricing: free forever, with Pro and Team for plans and teams",
});

/**
 * Pricing before paywall.
 *
 * Checkout is deliberately not wired to these buttons. The page exists to state
 * an offer and to find out whether anyone wants it at a stated price — the one
 * question that intent clicks on ungated features cannot answer. The CTA
 * registers interest and carries `data-premium-intent`, which the global
 * PremiumFunnelTracker turns into a `premium_intent` event tagged with the plan.
 */
const FEATURE_PREVIEW = 4;

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-2 text-fluid-xs text-slate-300">
      {features.map((feature) => (
        <li key={feature} className="flex gap-2">
          <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanCard({ plan }: { plan: PricingPlan }) {
  const isFree = plan.monthlyPriceUsd === null;

  return (
    <article
      className={`weather-surface flex flex-col gap-4 px-5 py-5 ${
        isFree ? "!border-sky-500/40" : ""
      }`}
    >
      {/* No tier icon. Each card carried a stock glyph in a ring (a code
          bracket, a chart, a person) that said nothing the plan name did not,
          and three decorative icons in a row is the look of a template. */}
      <div className="space-y-1">
        <h2 className="text-fluid-sm font-semibold text-white">{plan.name}</h2>
        <p className="text-fluid-xs text-slate-400">{plan.audience}</p>
      </div>

      <p className="text-2xl font-bold text-white">{formatMonthlyPrice(plan)}</p>
      <p className="text-fluid-xs text-slate-300">{plan.tagline}</p>

      <FeatureList features={plan.features.slice(0, FEATURE_PREVIEW)} />
      {/* The free list ran to nine lines, which set the height of all three
          cards and put every plan button under a 900px desktop fold. */}
      {plan.features.length > FEATURE_PREVIEW ? (
        <details className="weather-auto-chevron group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-fluid-xs font-medium text-sky-300 hover:text-sky-200">
            {plan.features.length - FEATURE_PREVIEW} more included
          </summary>
          <FeatureList features={plan.features.slice(FEATURE_PREVIEW)} />
        </details>
      ) : null}

      <div className="mt-auto pt-2">
        {isFree ? (
          <ActionLink href="/" variant="primary">
            Read this week&apos;s guidance
          </ActionLink>
        ) : (
          <ActionLink
            href={`/contact?plan=${plan.id}`}
            variant="pill"
            data-premium-intent="pricing_page"
            data-premium-cta={`pricing-${plan.id}`}
            data-premium-detail={plan.id}
          >
            {plan.id === "team" ? "Request Team access" : "Request Pro access"}
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
          <h1 className="text-fluid-2xl font-semibold text-white">Pricing</h1>
          <p className="max-w-2xl text-fluid-sm text-slate-300">{FREE_FOREVER_PROMISE}</p>
          {/* The promise above is the strongest data claim this site makes, and
              until /privacy existed there was nowhere to check it. A claim a
              reader cannot verify is worth less than the work behind making it
              true, and there is real work behind this one. */}
          <p className="max-w-2xl text-fluid-xs text-slate-400">
            <Link href="/privacy" className="weather-hit text-sky-300 underline-offset-2 hover:underline">
              What that means in practice
            </Link>
            : every store, cookie and measurement, listed.
          </p>
          {/* What a request does, once, for both paid plans, and before any request
              button (2026-10-09). It was said three times: on the Pro card, on the
              Team card, and in a "What a request does" section after the buttons,
              which also restated the promise above. Above the cards, not under
              them, so nobody clicks "Request Pro access" before learning there is
              nothing to buy; in the qualifier ink, not caution amber, because it is
              a plain fact about the offer, not a warning about the product. */}
          {PAID_PLANS_ON_SALE ? null : (
            <p className="max-w-2xl text-fluid-xs text-slate-400" data-paid-plans-status>
              Pro and Team cannot be bought yet. A request records that you want one and nothing
              else, and no card is taken.
            </p>
          )}
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* The cohort paragraph claims a reserved rate and an onboarding schedule,
            which only exist once checkout is wired, so it renders only when the
            plans are on sale; until then the header says what a request does.
            Unboxed, so it sits on the page column (ui-ux-standards §XXI): a 20px
            side inset from `sm` put it out of line with the title and the cards. */}
        <section className="weather-panel space-y-3 px-0 py-5">
          {PAID_PLANS_ON_SALE ? (
            <>
              <h2 className="type-eyebrow">Priority onboarding</h2>
              <p className="max-w-2xl text-fluid-xs text-slate-300">
                Pro and Team are onboarding in staged cohorts. Requesting access reserves your tier rate
                and schedules onboarding for Slack alerts, board exports, and team decision memory. The
                weekly guidance, the API, and MCP stay free.
              </p>
            </>
          ) : null}
          <p className="max-w-2xl text-fluid-xs text-slate-400">
            Buying for several teams, or need something the plans don&apos;t cover?{" "}
            <Link href="/contact" className="weather-hit underline decoration-slate-600 underline-offset-4 hover:text-white">
              Get in touch
            </Link>
            .
          </p>
        </section>
      </div>
    </PageShell>
  );
}
