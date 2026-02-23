import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Treasury yield curve signals for product roadmapping — Whether",
  description:
    "Use Treasury yield curve changes to sequence roadmap bets, adjust pricing posture, and reduce product delivery risk.",
  path: "/solutions/product-roadmapping",
  imageAlt: "Treasury signals for product roadmapping",
});

const roadmapMoves = [
  "Prioritize retention and expansion bets when conditions tighten.",
  "Stage launches with faster feedback loops during market volatility.",
  "Protect core reliability and activation flows before long-horizon initiatives.",
] as const;

export default function ProductRoadmappingPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Product planning under macro pressure
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          Treasury yield curve signals for product roadmapping.
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Whether translates rate and curve shifts into practical product priorities so teams can
          sequence bets with less strategic drift.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">How to apply macro signals this quarter</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {roadmapMoves.map((move) => (
            <li key={move} className="weather-surface px-4 py-3">
              {move}
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Use this page with the live report</h2>
        <p className="text-sm text-slate-300">
          Review the weekly briefing first, then align product planning decisions against current
          regime confidence and evidence.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Open weekly macro briefing
          </Link>
          <Link
            href="/signals"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Review macro signal matrix
          </Link>
        </div>
      </section>
    </main>
  );
}
