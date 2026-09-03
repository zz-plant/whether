import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageShell } from "../components/pageShell";
import { ActionLink } from "../components/ui/actionLink";
import { buildCanonicalUrl } from "../../lib/seo";
import {
  FREE_FOREVER_PROMISE,
  formatMonthlyPrice,
  pricingPlans,
  type PricingPlan,
} from "../../lib/pricing";

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
      <div className="space-y-1">
        <h2 className="text-fluid-sm font-semibold text-white">{plan.name}</h2>
        <p className="text-fluid-xs text-slate-400">{plan.audience}</p>
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
            Tell us you want {plan.name}
          </ActionLink>
        )}
      </div>
    </article>
  );
}

export default function PricingPage() {
  return (
    <PageShell backdropVariant="hub">
      <div className="mx-auto max-w-[64rem] space-y-8 px-4 py-8">
        <header className="space-y-3">
          <h1 className="text-fluid-lg font-semibold text-white">Pricing</h1>
          <p className="max-w-2xl text-fluid-sm text-slate-300">{FREE_FOREVER_PROMISE}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Saying this out loud costs nothing and answers the question a visitor
            would otherwise have to guess at. A pricing page that implies you can
            buy today, when you cannot, spends credibility this product does not
            have to spare. */}
        {/* Prose needs a measure. The promise line above is capped at max-w-2xl;
            this block ran the full 64rem panel, so the page set its intro at ~90
            characters a line and its explanation at ~140. */}
        <section className="weather-panel space-y-3 px-5 py-5">
          <h2 className="type-eyebrow">Pro and Team are not on sale yet</h2>
          <p className="max-w-2xl text-fluid-xs text-slate-300">
            These prices are real and the plans are not buyable today. We are working out whether
            enough people want them at this price before building the billing around them, so the
            buttons above register interest rather than take your money. The free tier is not a trial
            and does not expire.
          </p>
          <p className="max-w-2xl text-fluid-xs text-slate-400">
            Questions about a plan, or want something that is not listed?{" "}
            <Link href="/contact" className="underline decoration-slate-600 underline-offset-4 hover:text-white">
              Tell us
            </Link>
            .
          </p>
        </section>
      </div>
    </PageShell>
  );
}
