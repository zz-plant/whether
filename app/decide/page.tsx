import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Decide — signal-driven operating calls",
  description: "Review live evidence, confidence, and posture to make near-term operating decisions.",
  path: "/decide",
  imageAlt: "Whether decide hub",
});

export default function DecidePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decide</h1>
        <p className="text-sm text-slate-300">
          Validate the current posture with live evidence, then choose what to prioritize this cycle.
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/signals" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Signals</h2>
          <p className="text-sm text-slate-300">Inspect thresholds, trend context, and source recency.</p>
        </Link>
        <Link href="/operations" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Operations decisions</h2>
          <p className="text-sm text-slate-300">Translate posture into sequencing, guardrails, and action plans.</p>
        </Link>
        <Link href="/posture/capital-preservation" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Posture playbooks</h2>
          <p className="text-sm text-slate-300">Review posture-specific guidance and trade-off framing.</p>
        </Link>
      </section>
      <section className="weather-panel flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm">
        <p className="text-slate-300">Next step: turn your decision read into execution sequencing.</p>
        <Link href="/plan" className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2">Go to Plan</Link>
      </section>
    </main>
  );
}
