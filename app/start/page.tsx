import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import {
  postureDefinitions,
  startSituationRoutes,
  startSituations,
  toolkitDefinitions,
} from "../../lib/informationArchitecture";

export const metadata: Metadata = buildPageMetadata({
  title: "Start Here — Whether onboarding",
  description:
    "Learn the posture → instrument loop: pick posture, pick situation, then run the right toolkit.",
  path: "/start",
  imageAlt: "Whether Start Here",
});

export default function StartHerePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Start here</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Get clear on posture, then move to action.</h1>
        <p className="text-sm text-slate-300 sm:text-base">
          Whether helps you turn market conditions into practical decisions. Choose the posture that fits today, pick the situation you&apos;re facing, then use the toolkit that gives you a clear next move.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Step 1: Pick your posture</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {postureDefinitions.map((posture) => (
            <Link key={posture.slug} href={`/posture/${posture.slug}`} className="weather-surface min-h-[44px] space-y-2 px-4 py-4">
              <p className="text-sm font-semibold text-slate-100">{posture.title}</p>
              <p className="text-xs text-slate-300">{posture.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Step 2: Pick your situation</h2>
        <div className="flex flex-wrap gap-2">
          {startSituations.map((situation) => (
            <Link
              key={situation}
              href={startSituationRoutes[situation]}
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
            >
              {situation}
            </Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Step 3: Run a toolkit</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {toolkitDefinitions.map((toolkit) => (
            <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-surface min-h-[44px] px-4 py-4 text-sm text-slate-200">
              <span className="font-semibold text-slate-100">{toolkit.title}</span>
              <p className="mt-2 text-xs text-slate-300">{toolkit.whenToUse}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
