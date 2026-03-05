import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { StaticHubNav } from "../components/staticHubNav";

export const metadata: Metadata = buildPageMetadata({
  title: "Learn — concepts and diagnostics",
  description: "Diagnostics and concept references only; use this hub to audit reasoning, not to generate new operating calls.",
  path: "/learn",
  imageAlt: "Whether learn hub",
});

export default function LearnPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <StaticHubNav currentPath="/learn" />
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Learn</h1>
        <p className="text-sm text-slate-300">Use Learn for operator education only: failure modes, interpretation patterns, and worked examples. For canonical formulas, source definitions, and trust surfaces, use Method.</p>
        <div>
          <Link href="/method" className="weather-button inline-flex items-center justify-center">Open Method</Link>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/library/failure-modes" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Diagnostics library</h2>
          <p className="text-sm text-slate-300">Diagnose common failure patterns and trace the underlying concepts.</p>
        </Link>
        <Link href="/concepts" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Concepts</h2>
          <p className="text-sm text-slate-300">Understand the reasoning model used in Whether guidance.</p>
        </Link>
      </section>
    </main>
  );
}
