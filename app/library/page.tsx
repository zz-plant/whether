import type { Metadata } from "next";
import Link from "next/link";
import { failureModes } from "../../lib/informationArchitecture";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Library — failure modes and canon",
  description: "Use one library for diagnostics (failure modes) and deeper concepts (canon).",
  path: "/library",
  imageAlt: "Whether library",
});

const titleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function LibraryPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Library</h1>
        <p className="text-sm text-slate-300">
          Start with Failure Modes when something feels off. Use Canon when you want the underlying
          reasoning.
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/library/failure-modes" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Failure Modes</h2>
          <p className="text-sm text-slate-300">
            Spot the pattern, then jump to the toolkit that helps prevent it.
          </p>
        </Link>
        <Link href="/concepts" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Canon</h2>
          <p className="text-sm text-slate-300">
            Concept pages that explain why the tools work and when to apply them.
          </p>
        </Link>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Quick diagnostics</h2>
        <p className="text-sm text-slate-300">
          Jump straight to a known failure mode when you already recognize the pattern.
        </p>
        <div className="flex flex-wrap gap-2">
          {failureModes.map((slug) => (
            <Link
              key={slug}
              href={`/library/failure-modes/${slug}`}
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
            >
              {titleCase(slug)}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
