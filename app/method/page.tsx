import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Method — transparency and trust",
  description: "Transparency hub for formulas, sources, cadence, and limitations.",
  path: "/method",
  imageAlt: "Whether method and trust hub",
});

export default function MethodPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Method</h1>
        <p className="text-sm text-slate-300">Use Method for transparency only: formulas, source provenance, and limitations. For operating decisions, return to Signals or Decide.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signals" className="weather-button inline-flex items-center justify-center">Review Signals</Link>
          <Link href="/decide" className="weather-button inline-flex items-center justify-center">Open Decide</Link>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/methodology" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Methodology</h2>
          <p className="text-sm text-slate-300">Inspect formulas, assumptions, and source-linked model definitions.</p>
        </Link>
        <Link href="/about" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">About and contact</h2>
          <p className="text-sm text-slate-300">Review sources, FAQ context, updates, and contact details.</p>
        </Link>
      </section>
    </main>
  );
}
