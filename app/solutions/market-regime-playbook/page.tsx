import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Market regime operations playbook — Whether",
  description:
    "Action framework for operating in high, moderate, and low market-stress regimes using Treasury macro signal guidance.",
  path: "/solutions/market-regime-playbook",
  imageAlt: "Market regime operations playbook",
  imageParams: {
    template: "solutions",
    eyebrow: "Solution · Regime playbook",
    title: "Operationalize each market regime",
    subtitle:
      "Move from classification to repeatable guardrails across product, engineering, and finance.",
    kicker: "Whether solutions for operating teams.",
  },
});

const regimeRows = [
  {
    regime: "High stress",
    guidance:
      "Protect cash and delivery reliability first. Delay discretionary expansion bets until confidence improves.",
  },
  {
    regime: "Moderate stress",
    guidance:
      "Balance efficiency with selective growth. Gate larger initiatives behind tighter milestone review.",
  },
  {
    regime: "Low stress",
    guidance:
      "Increase growth cadence while preserving risk controls on hiring and strategic commitments.",
  },
] as const;

export default function MarketRegimePlaybookPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Regime-aware strategy
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          Market regime operations playbook for leadership teams.
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Use this framework to match product, engineering, and finance decisions to current market
          stress and confidence levels.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Operating moves by regime</h2>
        <div className="space-y-3">
          {regimeRows.map((row) => (
            <article key={row.regime} className="weather-surface space-y-2 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{row.regime}</h3>
              <p className="text-sm text-slate-200">{row.guidance}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Next steps</h2>
        <p className="text-sm text-slate-300">
          Confirm the current regime in the weekly briefing and pressure-test assumptions in
          methodology before finalizing cross-functional plans.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Open weekly briefing
          </Link>
          <Link
            href="/methodology"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Review methodology
          </Link>
        </div>
      </section>
    </main>
  );
}
