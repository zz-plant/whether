import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Decision Shield Overview",
  description: "Understand how Decision Shield translates posture and threshold logic into actionable governance recommendations.",
  path: "/resources/decision-shield-overview",
  imageAlt: "Decision Shield overview",
});

export default function DecisionShieldOverviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decision Shield Overview</h1>
        <p className="text-sm text-slate-200">
          Decision Shield is the governance bridge between macro posture signals and real operating choices. Use it to enforce
          thresholds, classify reversibility risk, and preserve audit-ready decision memory.
        </p>
        <Link href="/operations" className="weather-button inline-flex items-center justify-center" data-conversion-event="demo/contact">
          Open Decision Shield in Operations
        </Link>
      </section>
    </main>
  );
}
