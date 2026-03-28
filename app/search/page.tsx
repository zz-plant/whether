import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import {
  groupSearchResultsByType,
  searchEntityTypeLabels,
  searchIndex,
  type SearchEntityType,
} from "../../lib/search/searchIndex";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Search — find workflows, toolkits, concepts, and trust docs",
  description:
    "Search the operator corpus across primary workflows, supporting toolkits, concepts, and key evidence/trust docs.",
  path: "/search",
  imageAlt: "Whether search",
});

const searchTypeOrder: SearchEntityType[] = ["toolkit", "failure-mode", "concept", "doc"];

const isSearchEntityType = (value: string): value is SearchEntityType =>
  searchTypeOrder.includes(value as SearchEntityType);

const buildSearchHref = (query: string, type?: SearchEntityType) => {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (type) {
    params.set("type", type);
  }
  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
};

const searchIntentPrompts = [
  {
    label: "What changed this week?",
    query: "signals thresholds",
  },
  {
    label: "Should we freeze hiring?",
    query: "hiring freeze",
  },
  {
    label: "What could break this call?",
    query: "failure mode",
  },
  {
    label: "Can we trust this posture?",
    query: "sources confidence formulas",
  },
] as const;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type = "" } = await searchParams;
  const query = q.trim();
  const normalizedType = type.trim().toLowerCase();
  const activeType = isSearchEntityType(normalizedType) ? normalizedType : undefined;
  const matchingResults = searchIndex(query);
  const results = activeType
    ? matchingResults.filter((entry) => entry.type === activeType)
    : matchingResults;
  const groupedResults = groupSearchResultsByType(results);
  const countsByType = groupSearchResultsByType(matchingResults);

  return (
    <HubPageShell>
      <HubHero
        eyebrow="Global search"
        title="Find the decision surface you need for this week."
        description="Search across primary workflow hubs, supporting toolkits, failure modes, concepts, and key Evidence/Trust docs."
        aside={(
          <div className="weather-hub-card space-y-3 px-5 py-5">
            <p className="weather-hub-section-eyebrow">Search scope</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>Primary workflows and decision paths</li>
              <li>Supporting toolkits and utilities</li>
              <li>Failure modes and concepts</li>
              <li>Evidence and trust reference docs</li>
            </ul>
          </div>
        )}
      />

      <HubSection title="Search the operating system" description="Start with your decision question, then narrow by result type if you need a tighter path.">
        <form action="/search" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label htmlFor="global-search-input" className="sr-only">Search all Whether content</label>
            <input
              id="global-search-input"
              type="search"
              name="q"
              defaultValue={q}
              className="weather-input w-full"
              placeholder="Search: rollback, PMF, regime mismatch, formulas…"
              autoComplete="off"
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
        {query ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span>Active query:</span>
            <Link href={buildSearchHref(query)} className="weather-hub-chip">
              {query}
            </Link>
            {activeType ? (
              <Link href={buildSearchHref(query)} className="weather-hub-chip">
                Type: {searchEntityTypeLabels[activeType]}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-300">Or start from common operator questions:</p>
            <div className="flex flex-wrap gap-2">
              {searchIntentPrompts.map((prompt) => (
                <Link key={prompt.query} href={buildSearchHref(prompt.query)} className="weather-hub-chip">
                  {prompt.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </HubSection>

      {query ? (
        <section className="space-y-6">
          <p className="px-1 text-sm text-slate-300" role="status" aria-live="polite">
            {results.length} result{results.length === 1 ? "" : "s"} for <span className="font-semibold text-slate-100">“{query}”</span>
          </p>

          {matchingResults.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Link href={buildSearchHref(query)} className="weather-hub-chip">
                All ({matchingResults.length})
              </Link>
              {searchTypeOrder.map((resultType) => {
                const count = countsByType[resultType].length;
                if (count === 0) return null;
                return (
                  <Link key={resultType} href={buildSearchHref(query, resultType)} className="weather-hub-chip">
                    {searchEntityTypeLabels[resultType]} ({count})
                  </Link>
                );
              })}
            </div>
          ) : null}

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
            <div className="weather-hub-section space-y-3 text-sm text-slate-300" role="status" aria-live="polite">
              <p>
                No results matched. Try terms like <span className="font-semibold text-slate-100">rollback</span>,{" "}
                <span className="font-semibold text-slate-100">PMF</span>, or{" "}
                <span className="font-semibold text-slate-100">trust</span>.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/search?q=rollback" className="weather-hub-chip">Try rollback</Link>
                <Link href="/search?q=runway" className="weather-hub-chip">Try runway</Link>
                <Link href="/search?q=trust" className="weather-hub-chip">Try trust docs</Link>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="weather-hub-section text-sm text-slate-300">
          Enter a query to surface workflow hubs, decision tools, risks, concepts, and evidence or trust docs.
        </section>
      )}
    </HubPageShell>
  );
}
