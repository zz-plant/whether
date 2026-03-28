import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import {
  groupSearchResultsByJob,
  searchJobDescriptions,
  searchJobLabels,
  searchPrimaryHubByJob,
  searchIndex,
  type SearchEntityJob,
} from "../../lib/search/searchIndex";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Search — decisions, guardrails, and trust checks",
  description:
    "Search the operator corpus by decision job: what changed, what to do, what could break, and how to defend the call.",
  path: "/search",
  imageAlt: "Whether search",
});

const searchJobOrder: SearchEntityJob[] = ["check", "approve", "resolve", "risk", "trust"];

const isSearchEntityJob = (value: string): value is SearchEntityJob =>
  searchJobOrder.includes(value as SearchEntityJob);

const buildSearchHref = (query: string, job?: SearchEntityJob) => {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (job) {
    params.set("job", job);
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
  searchParams: Promise<{ q?: string; job?: string }>;
}) {
  const { q = "", job = "" } = await searchParams;
  const query = q.trim();
  const normalizedJob = job.trim().toLowerCase();
  const activeJob = isSearchEntityJob(normalizedJob) ? normalizedJob : undefined;
  const matchingResults = searchIndex(query);
  const results = activeJob
    ? matchingResults.filter((entry) => entry.job === activeJob)
    : matchingResults;
  const groupedResults = groupSearchResultsByJob(results);
  const countsByJob = groupSearchResultsByJob(matchingResults);

  return (
    <HubPageShell>
      <HubHero
        eyebrow="Global search"
        title="Find the decision surface you need for this week."
        description="Search by the job you need done: check what changed, approve a plan, resolve an edge case, diagnose risk, or validate trust."
        aside={(
          <div className="weather-hub-card space-y-3 px-5 py-5">
            <p className="weather-hub-section-eyebrow">Search scope</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>What changed and why</li>
              <li>What to approve or hold this week</li>
              <li>What could break the call</li>
              <li>How to defend the call with trust checks</li>
            </ul>
          </div>
        )}
      />

      <HubSection title="Search by decision job" description="Start with the question you need answered, then narrow by result type only if you need a tighter path.">
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
            {activeJob ? (
              <Link href={buildSearchHref(query)} className="weather-hub-chip">
                Job: {searchJobLabels[activeJob]}
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
              {searchJobOrder.map((resultJob) => {
                const count = countsByJob[resultJob].length;
                if (count === 0) return null;
                return (
                  <Link key={resultJob} href={buildSearchHref(query, resultJob)} className="weather-hub-chip">
                    {searchJobLabels[resultJob]} ({count})
                  </Link>
                );
              })}
            </div>
          ) : null}

          {searchJobOrder.map((jobKey) => {
            const entries = groupedResults[jobKey];
            if (entries.length === 0) return null;
            const primaryHub = searchPrimaryHubByJob[jobKey];

            return (
              <HubSection
                key={jobKey}
                title={searchJobLabels[jobKey]}
                description={searchJobDescriptions[jobKey]}
              >
                <div className="weather-hub-card space-y-3 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Recommended next step</p>
                  <h3 className="text-lg font-semibold text-slate-100">{primaryHub.label}</h3>
                  <p className="text-sm text-slate-300">{primaryHub.summary}</p>
                  <Link href={primaryHub.href} className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
                    Open {searchJobLabels[jobKey]}
                  </Link>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Supporting matches</p>
                  <ul className="grid gap-3">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <Link href={entry.href} className="weather-hub-link-card space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-200">{entry.intentLabel}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">{entry.recommendedHubLabel}</p>
                        <p className="text-base font-semibold text-slate-100">{entry.title}</p>
                        <p className="text-sm text-slate-300">{entry.summary}</p>
                      </Link>
                    </li>
                  ))}
                  </ul>
                </div>
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
                <Link href="/signals" className="weather-hub-chip">Try Evidence</Link>
                <Link href="/operations" className="weather-hub-chip">Try Planning</Link>
                <Link href="/decide" className="weather-hub-chip">Try Decision Tools</Link>
                <Link href="/method" className="weather-hub-chip">Try Trust</Link>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="weather-hub-section text-sm text-slate-300">
          Enter a query to surface the workflow, decision aid, risk pattern, or trust check you need.
        </section>
      )}
    </HubPageShell>
  );
}
