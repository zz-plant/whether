import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { groupSearchResultsByType, searchEntityTypeLabels, searchIndex } from "../../lib/search/searchIndex";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Search — find workflows, toolkits, concepts, and trust docs",
  description:
    "Search the operator corpus across primary workflows, supporting toolkits, concepts, and key method/signal docs.",
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
    <HubPageShell>
      <HubHero
        eyebrow="Global search"
        title="Find the decision surface you need for this week."
        description="Search across primary workflow hubs, supporting toolkits, failure modes, concepts, and key Signals/Method docs."
        aside={(
          <div className="weather-hub-card space-y-3 px-5 py-5">
            <p className="weather-hub-section-eyebrow">Search scope</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>Primary workflows and decision paths</li>
              <li>Supporting toolkits and utilities</li>
              <li>Failure modes and concepts</li>
              <li>Signals and method reference docs</li>
            </ul>
          </div>
        )}
      />

      <HubSection title="Search the operating system" description="Use direct terms for the decision you need to make, the risk you are seeing, or the trust question you need to settle.">
        <form action="/search" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
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
      </HubSection>

      {query ? (
        <section className="space-y-6">
          <p className="px-1 text-sm text-slate-300">
            {results.length} result{results.length === 1 ? "" : "s"} for <span className="font-semibold text-slate-100">“{query}”</span>
          </p>

          {Object.entries(groupedResults).map(([type, entries]) => {
            if (entries.length === 0) return null;

            return (
              <HubSection
                key={type}
                title={searchEntityTypeLabels[type as keyof typeof groupedResults]}
                description="Each result points to one decision surface, trust reference, or tool you can act on quickly."
              >
                <ul className="grid gap-3">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <Link href={entry.href} className="weather-hub-link-card space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-200">{entry.intentLabel}</p>
                        <p className="text-base font-semibold text-slate-100">{entry.title}</p>
                        <p className="text-sm text-slate-300">{entry.summary}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </HubSection>
            );
          })}

          {results.length === 0 ? (
            <div className="weather-hub-section text-sm text-slate-300">
              No results matched. Try terms like <span className="font-semibold text-slate-100">rollback</span>,{" "}
              <span className="font-semibold text-slate-100">PMF</span>, or{" "}
              <span className="font-semibold text-slate-100">method</span>.
            </div>
          ) : null}
        </section>
      ) : (
        <section className="weather-hub-section text-sm text-slate-300">
          Enter a query to surface workflow hubs, decision tools, risks, concepts, and trust docs.
        </section>
      )}
    </HubPageShell>
  );
}
