import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Macro signals for engineering capacity planning — Whether",
  description:
    "Translate market stress signals into engineering capacity plans for hiring, delivery scope, and reliability investment.",
  path: "/solutions/engineering-capacity",
  imageAlt: "Macro signals for engineering capacity planning",
  imageParams: {
    template: "solutions",
    eyebrow: "Solution · Engineering capacity",
    title: "Align capacity plans to capital posture",
    subtitle:
      "Tune hiring velocity, staffing risk, and delivery commitments with a shared macro baseline.",
    kicker: "Whether solutions for engineering leaders.",
  },
});

const capacityChecks = [
  "Adjust hiring velocity to match macro confidence and runway protection needs.",
  "Trade long-cycle platform work against near-term reliability and customer-critical delivery.",
  "Set delivery commitments with explicit stress-case assumptions for risk review.",
] as const;

const connectedPages = [
  {
    title: "Product roadmapping",
    description: "Align roadmap sequencing with the same assumptions behind staffing and reliability trade-offs.",
    href: "/solutions/product-roadmapping",
    cta: "Open product roadmapping",
  },
  {
    title: "Career paths",
    description: "Help PMs and tech leads build promotion-ready judgment using shared market context.",
    href: "/solutions/career-paths",
    cta: "Open career paths",
  },
  {
    title: "Market regime playbook",
    description: "Carry capacity decisions into executive guardrails for hiring, spend, and delivery pace.",
    href: "/solutions/market-regime-playbook",
    cta: "Open regime playbook",
  },
] as const;

export default function EngineeringCapacityPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Engineering operating posture
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          Macro signals for engineering capacity planning.
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Whether helps engineering leaders convert Treasury-driven market signals into clear
          staffing, sequencing, and delivery risk decisions.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Capacity checklist by market regime</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {capacityChecks.map((check) => (
            <li key={check} className="weather-surface px-4 py-3">
              {check}
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Recommended workflow</h2>
        <p className="text-sm text-slate-300">
          Start in Signals to verify trend direction and thresholds, then move into Operations to
          assign owners and execution horizons.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/evidence"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Open signals dashboard
          </Link>
          <Link
            href="/operations"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Open operations playbook
          </Link>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Connect this page to the rest of Whether</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {connectedPages.map((page) => (
            <article key={page.href} className="weather-surface flex h-full flex-col gap-3 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{page.title}</h3>
              <p className="text-sm text-slate-300">{page.description}</p>
              <Link
                href={page.href}
                className="weather-pill mt-auto inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                {page.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
