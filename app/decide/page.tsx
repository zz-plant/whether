import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Decide — role and situation paths",
  description: "Start from your role or the decision in front of you to get the right guidance path.",
  path: "/decide",
  imageAlt: "Whether decide hub",
});

export default function DecidePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decide</h1>
        <p className="text-sm text-slate-300">Choose the entry point that matches your situation, then move into concrete guidance.</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/decide/use-cases" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Role and situation paths</h2>
          <p className="text-sm text-slate-300">Choose by role or scenario to reach the right guidance quickly.</p>
        </Link>
        <Link href="/signals" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Signals</h2>
          <p className="text-sm text-slate-300">Check the latest climate inputs before committing to a plan.</p>
        </Link>
        <Link href="/decide/ship-checklist" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Whether to ship checklist</h2>
          <p className="text-sm text-slate-300">Get a go/wait/kill recommendation tied to the current regime.</p>
        </Link>

        <Link href="/decide/team-context" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Team context profile</h2>
          <p className="text-sm text-slate-300">Personalize the mandate by stage, sector, and team size.</p>
        </Link>
      </section>
    </main>
  );
}
