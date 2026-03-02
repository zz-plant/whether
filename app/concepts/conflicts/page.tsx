import type { Metadata } from "next";
import Link from "next/link";
import { getConceptConflicts } from "../../../lib/conceptConflicts";
import { buildPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Concept conflict map — Whether",
  description: "See where canonical PM concepts disagree and which one tends to win by regime.",
  path: "/concepts/conflicts",
  imageAlt: "Concept conflict map",
});

const regimes = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const;

export default function ConceptConflictMapPage() {
  const conflicts = getConceptConflicts();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Concept conflict map</h1>
        <p className="text-sm text-slate-300">Canonical essays often disagree. This map shows which framework tends to win under each regime.</p>
      </section>

      <section className="space-y-4">
        {conflicts.map((entry) => (
          <article key={entry.id} className="weather-panel space-y-3 px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-100">{entry.left.title} vs {entry.right.title}</h2>
            <p className="text-sm text-slate-300">{entry.conflict}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {regimes.map((regime) => (
                <div key={regime} className="weather-surface px-3 py-3 text-sm text-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{regime}</p>
                  <p className="mt-1">Winner: {entry.winnerByRegime[regime] === entry.left.slug ? entry.left.title : entry.right.title}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <Link href="/concepts" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
        Back to concepts timeline
      </Link>
    </main>
  );
}
