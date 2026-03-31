import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import {
  groupSearchResultsByJob,
  searchEntityTypeLabels,
  searchJobDescriptions,
  searchJobLabels,
  searchPrimaryHubByJob,
  searchIndex,
  type SearchEntityJob,
} from "../../lib/search/searchIndex";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";
import { noindexRobots } from "../../lib/seo/indexationPolicy";
import { buildToolkitLibraryHref } from "../decide/components/toolkitLibraryPanels";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Search — route the next workflow step",
  description:
    "Use search as a command surface: route into Evidence, Planning, Decision Tools, or Trust instead of browsing the full corpus.",
  path: "/search",
  imageAlt: "Whether search",
});

metadata.robots = noindexRobots;

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

export const resolveSearchCommandHref = (query: string, results: ReturnType<typeof searchIndex>, activeJob?: SearchEntityJob) => {
  const normalizedQuery = query.trim().toLowerCase();
  const commandJob = activeJob
    ?? (
      (/(failure|risk|break|fragility)/.test(normalizedQuery) && results.some((entry) => entry.job === "risk"))
        ? "risk"
        : (/(trust|confidence|source|sources|formula|formulas)/.test(normalizedQuery) && results.some((entry) => entry.job === "trust"))
            ? "trust"
            : results[0]?.job
    );
  if (!commandJob) {
    return null;
  }

  if (commandJob === "resolve") {
    return results.some((entry) => entry.type === "toolkit")
      ? buildToolkitLibraryHref(query)
      : "/decide#unresolved-question-router";
  }

  if (commandJob === "risk") {
    return "/method#revisit-call";
  }

  if (commandJob === "trust") {
    return "/method#trust-snapshot";
  }

  if (commandJob === "approve") {
    return "/operations#ops-monthly-action-summary";
  }

  return "/signals#decision-summary";
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
  const countsByJob = groupSearchResultsByJob(matchingResults);
  const commandJob = activeJob ?? results[0]?.job;
  const commandHref = resolveSearchCommandHref(query, results, activeJob);
  const commandHub = commandJob ? searchPrimaryHubByJob[commandJob] : null;
  const supportingMatches = results.slice(0, 6);

  return (
    <HubPageShell>
      <HubHero
        eyebrow="Command search"
        title="Route this query into the next surface, not a new library."
        description="Use search when you know the operator question but not the right workflow surface. The goal is to send you to Evidence, Planning, Decision Tools, or Trust fast."
        aside={(
          <div className="weather-hub-card space-y-3 px-5 py-5">
            <p className="weather-hub-section-eyebrow">Search scope</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>Route into one primary workflow</li>
              <li>Find the next bounded decision aid</li>
              <li>Pressure-test risk or trust quickly</li>
              <li>Avoid browsing secondary libraries first</li>
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

          {commandJob && commandHref && commandHub ? (
            <HubSection title="Recommended next step" description={searchJobDescriptions[commandJob]}>
              <div className="weather-hub-card space-y-3 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Command route</p>
                <h3 className="text-lg font-semibold text-slate-100">{commandHub.label}</h3>
                <p className="text-sm text-slate-300">{commandHub.summary}</p>
                <p className="text-sm text-slate-200">
                  This query reads most like <span className="font-semibold text-slate-100">{searchJobLabels[commandJob]}</span>.
                </p>
                <Link href={commandHref} className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
                  Open recommended route
                </Link>
              </div>
            </HubSection>
          ) : null}

          {supportingMatches.length > 0 ? (
            <HubSection title="Best supporting matches" description="Use these only after the command route above is no longer enough.">
              <ul className="grid gap-3">
                {supportingMatches.map((entry) => (
                  <li key={entry.id}>
                    <Link href={entry.href} className="weather-hub-link-card space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-200">{entry.intentLabel}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">
                        {searchEntityTypeLabels[entry.type]} · {entry.recommendedHubLabel}
                      </p>
                      <p className="text-base font-semibold text-slate-100">{entry.title}</p>
                      <p className="text-sm text-slate-300">{entry.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </HubSection>
          ) : null}

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
        <section className="weather-hub-section space-y-3 text-sm text-slate-300">
          <p>Enter a query to route into the next workflow surface, then open supporting matches only if the primary route is still not enough.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/signals" className="weather-hub-chip">Evidence</Link>
            <Link href="/operations" className="weather-hub-chip">Planning</Link>
            <Link href="/decide" className="weather-hub-chip">Decision Tools</Link>
            <Link href="/method" className="weather-hub-chip">Trust</Link>
          </div>
        </section>
      )}
    </HubPageShell>
  );
}
