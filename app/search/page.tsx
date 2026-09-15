import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import {
  groupSearchResultsByJob,
  searchIndex,
  searchJobLabels,
  type SearchEntityJob,
} from "../../lib/search/searchIndex";
import { writeAnalytics } from "../../lib/telemetry/analyticsEngine";
import { noindexRobots } from "../../lib/seo/indexationPolicy";
import { PageShell } from "../components/pageShell";
import { Breadcrumbs } from "../components/ui/breadcrumbs";
import { ActionLink } from "../components/ui/actionLink";
import { buildToolkitLibraryHref } from "../resolve/components/toolkitLibraryPanels";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Search Whether Guidance",
  description:
    "Route a question to Evidence, Planning, Resolve, or Trust instead of browsing the full site.",
  path: "/search",
  imageAlt: "Whether search",
});

metadata.robots = noindexRobots;

const searchJobOrder: SearchEntityJob[] = ["check", "approve", "resolve", "risk", "trust"];

const isSearchEntityJob = (value: string): value is SearchEntityJob =>
  searchJobOrder.includes(value as SearchEntityJob);

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
      : "/resolve#unresolved-question-router";
  }

  if (commandJob === "risk") {
    return "/trust#revisit-call";
  }

  if (commandJob === "trust") {
    return "/trust#trust-snapshot";
  }

  if (commandJob === "approve") {
    return "/planning#ops-monthly-action-summary";
  }

  return "/signals#decision-summary";
};

/**
 * What a search did, without what it said.
 *
 * The page recorded nothing, so the one question it can answer — are people
 * finding anything — had no data behind it. What is recorded is the routed job,
 * the number of entities matched, and whether the query matched none of them;
 * a zero-result rate is the signal worth acting on. The query text is
 * deliberately not stored: this product tells readers it runs no trackers, and
 * free text typed into a box is the thing that promise is about.
 */
const recordSearch = (resultCount: number, routedJob: SearchEntityJob | null, filtered: boolean) => {
  writeAnalytics(
    "search",
    { type: "search", resultCount, routedJob, filtered, zeroResults: resultCount === 0 },
    { doubles: [resultCount] },
  );
};

const SearchForm = ({ query }: { query: string }) => (
  <search>
  <form action="/search" className="flex flex-wrap items-center gap-2">
    <label htmlFor="search-query" className="sr-only">Search Whether guidance</label>
    <input
      id="search-query"
      name="q"
      type="search"
      defaultValue={query}
      placeholder="What do you need to decide?"
      className="weather-surface min-h-[44px] min-w-0 flex-1 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500"
    />
    <button type="submit" className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
      Search
    </button>
  </form>
  </search>
);

/**
 * Results, rather than a redirect.
 *
 * Every request used to end in a 308 — to the toolkit library on an empty
 * query, and otherwise to whichever hub the top match belonged to. A reader
 * never saw what matched or whether anything had, a typo landed them somewhere
 * unexplained, and the intent behind the search left no trace. The redirect
 * target is still offered, as the first action, because going straight to the
 * hub is usually right; it is now a link the reader can decline.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; job?: string }>;
}) {
  const { q = "", job = "" } = await searchParams;
  const query = q.trim();
  const normalizedJob = job.trim().toLowerCase();
  const activeJob = isSearchEntityJob(normalizedJob) ? normalizedJob : undefined;

  const matchingResults = query ? searchIndex(query) : [];
  const results = activeJob
    ? matchingResults.filter((entry) => entry.job === activeJob)
    : matchingResults;
  const commandHref = query ? resolveSearchCommandHref(query, results, activeJob) : null;
  const grouped = groupSearchResultsByJob(results);

  if (query) {
    recordSearch(results.length, activeJob ?? results[0]?.job ?? null, Boolean(activeJob));
  }

  return (
    <PageShell backdropVariant="hub">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <article className="weather-panel space-y-6 px-5 py-5">
        <header className="space-y-3">
          <h1 className="text-fluid-2xl font-semibold text-slate-100">Search</h1>
          <p className="text-sm text-slate-300">
            Route a question to the surface that answers it: evidence, guardrails, toolkits, or the method behind the call.
          </p>
          <SearchForm query={query} />
        </header>

        {!query ? (
          <section aria-labelledby="search-start-heading" className="space-y-3">
            <h2 id="search-start-heading" className="type-eyebrow">Start from a job</h2>
            <div className="flex flex-wrap gap-2">
              <ActionLink href="/signals#decision-summary" variant="pill">{searchJobLabels.check}</ActionLink>
              <ActionLink href="/operate" variant="pill">{searchJobLabels.approve}</ActionLink>
              <ActionLink href={buildToolkitLibraryHref()} variant="pill">{searchJobLabels.resolve}</ActionLink>
              <ActionLink href="/trust#revisit-call" variant="pill">{searchJobLabels.risk}</ActionLink>
              <ActionLink href="/trust#trust-snapshot" variant="pill">{searchJobLabels.trust}</ActionLink>
            </div>
          </section>
        ) : results.length === 0 ? (
          <section aria-labelledby="search-empty-heading" className="space-y-3">
            <h2 id="search-empty-heading" className="type-eyebrow">Nothing matched “{query}”</h2>
            <p className="text-sm text-slate-300">
              The index covers toolkits, failure modes, and the site&apos;s main surfaces. Try a decision word — hiring,
              runway, rollback, pricing — or start from one of these.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionLink href="/signals" variant="pill">Evidence</ActionLink>
              <ActionLink href="/operate" variant="pill">Operating guardrails</ActionLink>
              <ActionLink href={buildToolkitLibraryHref()} variant="pill">Toolkit library</ActionLink>
              <ActionLink href="/trust" variant="pill">Trust</ActionLink>
            </div>
          </section>
        ) : (
          <>
            {commandHref ? (
              <section aria-labelledby="search-command-heading" className="space-y-2">
                <h2 id="search-command-heading" className="type-eyebrow">Go straight there</h2>
                <ActionLink href={commandHref} variant="primary">
                  {activeJob ? searchJobLabels[activeJob] : searchJobLabels[results[0].job]}
                </ActionLink>
              </section>
            ) : null}

            {searchJobOrder
              .filter((jobKey) => grouped[jobKey].length > 0)
              .map((jobKey) => (
                <section key={jobKey} aria-labelledby={`search-job-${jobKey}`} className="space-y-3">
                  <h2 id={`search-job-${jobKey}`} className="type-eyebrow">{searchJobLabels[jobKey]}</h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {grouped[jobKey].map((entity) => (
                      <li key={entity.id}>
                        <Link
                          href={entity.href}
                          className="weather-surface block space-y-1 px-4 py-4 text-sm text-slate-100 hover:border-sky-500/50"
                        >
                          <span className="block font-semibold">{entity.title}</span>
                          <span className="block text-fluid-xs text-slate-400">{entity.summary}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </>
        )}
      </article>
    </PageShell>
  );
}
