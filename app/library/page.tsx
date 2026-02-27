import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";

const quickDiagnostics = [
  { slug: "premature-scaling", label: "Premature scaling" },
  { slug: "proxy-lock-in", label: "Proxy lock-in" },
  { slug: "complexity-debt", label: "Complexity debt" },
  { slug: "risk-externalization", label: "Risk externalization" },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "Library — failure modes and concepts",
  description: "Use one library for diagnostics (failure modes) and deeper concepts.",
  path: "/library",
  imageAlt: "Whether library",
});

export default function LibraryPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Library</h1>
        <p className="text-sm text-slate-300">Start with Failure Modes when something feels off. Use Concepts when you want the underlying reasoning.</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/library/failure-modes" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Failure Modes</h2>
          <p className="text-sm text-slate-300">Spot the pattern, then jump to the toolkit that helps prevent it.</p>
        </Link>
        <Link href="/concepts" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Concepts</h2>
          <p className="text-sm text-slate-300">Concept pages that explain why the tools work and when to apply them.</p>
        </Link>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Quick diagnostics</h2>
        <p className="text-sm text-slate-300">Jump straight into known failure modes when you need to triage quickly.</p>
        <div className="flex flex-wrap gap-2">
          {quickDiagnostics.map((diagnostic) => (
            <Link
              key={diagnostic.slug}
              href={`/library/failure-modes/${diagnostic.slug}`}
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
            >
              {diagnostic.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
