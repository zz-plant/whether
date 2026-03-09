import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { groupSearchResultsByType, searchEntityTypeLabels, searchIndex } from "../../lib/search/searchIndex";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Search — find toolkits, failure modes, concepts, and method docs",
  description:
    "Search the full operator corpus across toolkits, failure modes, concepts, and key method/signal docs.",
  path: "/search",
  imageAlt: "Whether search",
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = searchIndex(query);
  const groupedResults = groupSearchResultsByType(results);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <section className="weather-panel space-y-4 px-4 py-6 sm:px-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Global search</p>
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Find decision artifacts fast</h1>
          <p className="text-sm text-slate-300">
            Search across toolkits, failure modes, concepts, and key Signals/Method docs.
          </p>
        </div>

        <form action="/search" className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={q}
            className="weather-input w-full"
            placeholder="Search: rollback, PMF, regime mismatch, formulas"
            aria-label="Search all Whether content"
          />
          <button type="submit" className="weather-button-primary min-h-[44px] px-4">
            Search
          </button>
          {query ? (
            <Link href="/search" className="weather-button inline-flex min-h-[44px] items-center justify-center px-4">
              Clear
            </Link>
          ) : null}
        </form>
      </section>

      {query ? (
        <section className="mt-6 space-y-6">
          <p className="text-sm text-slate-300">
            {results.length} result{results.length === 1 ? "" : "s"} for <span className="font-semibold text-slate-100">“{query}”</span>
          </p>

          {Object.entries(groupedResults).map(([type, entries]) => {
            if (entries.length === 0) return null;

            return (
              <article key={type} className="weather-panel px-4 py-4 sm:px-5">
                <h2 className="text-lg font-semibold text-slate-100">{searchEntityTypeLabels[type as keyof typeof groupedResults]}</h2>
                <ul className="mt-3 space-y-3">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <Link href={entry.href} className="weather-surface block space-y-1 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-200">{entry.intentLabel}</p>
                        <p className="text-base font-semibold text-slate-100">{entry.title}</p>
                        <p className="text-sm text-slate-300">{entry.summary}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}

          {results.length === 0 ? (
            <div className="weather-panel px-4 py-4 text-sm text-slate-300">
              No results matched. Try terms like <span className="font-semibold text-slate-100">rollback</span>,{" "}
              <span className="font-semibold text-slate-100">PMF</span>, or{" "}
              <span className="font-semibold text-slate-100">method</span>.
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mt-6 weather-panel px-4 py-4 text-sm text-slate-300">
          Enter a query to surface decision toolkits, risks, concepts, and trust docs.
        </section>
      )}
    </main>
  );
}
