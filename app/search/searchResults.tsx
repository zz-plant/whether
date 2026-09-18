/**
 * Search that answers while you type.
 *
 * `/search` was a `<form action="/search">`: every query was a full navigation,
 * a server render and a repaint, for an index that is a static array this
 * browser already has. `searchIndex` is a pure function over
 * `decisionDomainCatalog`, so the round trip was buying nothing.
 *
 * Three things are kept rather than traded away for the interaction:
 *
 * - **The URL stays the result.** Every settled query is written back with
 *   `router.replace`, so a search is still something you can send someone, and
 *   `?q=` typed directly still server-renders. `replace` rather than `push`:
 *   a history entry per keystroke turns the back button into a rubout key.
 * - **It works with no JavaScript.** The form keeps its `action` and its
 *   submit button, and the page still renders results on the server for the
 *   first paint, so hydration continues a page rather than replacing one.
 * - **Telemetry records a search, not a keystroke.** This is the part that
 *   would have quietly broken: the stream exists to measure a zero-result
 *   *rate*, and every prefix of every word is a zero-result. Only the settled
 *   query is recorded, so "hirin" never counts as someone failing to find
 *   anything.
 */
"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  groupSearchResultsByJob,
  searchIndex,
  searchJobLabels,
  type SearchEntityJob,
} from "../../lib/search/searchIndex";
import { ActionLink } from "../components/ui/actionLink";
import { buildToolkitLibraryHref } from "../resolve/components/toolkitLibraryPanels";
import { SearchTelemetry } from "./searchTelemetry";
import { resolveSearchCommandHref, SEARCH_JOB_ORDER } from "./searchCommand";

/** Long enough that a typist is not measured mid-word, short enough to feel immediate. */
const SETTLE_MS = 700;

const StartFromAJob = () => (
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
);

const NothingMatched = ({ query }: { query: string }) => (
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
);

export const SearchResults = ({
  initialQuery,
  activeJob,
}: {
  initialQuery: string;
  activeJob?: SearchEntityJob;
}) => {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  /* Keeps the input responsive while the list re-renders. The index is small
     enough that this rarely matters and cheap enough that it costs nothing. */
  const deferredQuery = useDeferredValue(query);
  const [settledQuery, setSettledQuery] = useState(initialQuery);

  const trimmed = deferredQuery.trim();
  const results = useMemo(() => {
    const matched = trimmed ? searchIndex(trimmed) : [];
    return activeJob ? matched.filter((entry) => entry.job === activeJob) : matched;
  }, [trimmed, activeJob]);

  const grouped = useMemo(() => groupSearchResultsByJob(results), [results]);
  const commandHref = trimmed ? resolveSearchCommandHref(trimmed, results, activeJob) : null;

  /* One timer, restarted on every keystroke: the URL and the telemetry both key
     off a query the reader has stopped changing. */
  useEffect(() => {
    const typed = query.trim();
    if (typed === settledQuery) return;

    const timer = window.setTimeout(() => setSettledQuery(typed), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [query, settledQuery]);

  useEffect(() => {
    if (settledQuery === initialQuery.trim()) return;

    const params = new URLSearchParams();
    if (settledQuery) params.set("q", settledQuery);
    if (activeJob) params.set("job", activeJob);
    const search = params.toString();
    router.replace(search ? `/search?${search}` : "/search", { scroll: false });
  }, [settledQuery, initialQuery, activeJob, router]);

  const settledResults = useMemo(() => {
    const matched = settledQuery ? searchIndex(settledQuery) : [];
    return activeJob ? matched.filter((entry) => entry.job === activeJob) : matched;
  }, [settledQuery, activeJob]);

  return (
    <>
      <SearchTelemetry
        query={settledQuery}
        routedJob={activeJob ?? settledResults[0]?.job ?? null}
        resultCount={settledResults.length}
        filtered={Boolean(activeJob)}
      />

      <search>
        {/* Keeps `action` and a submit button: with no JavaScript this is still
            the GET form it always was, and the page still renders `?q=` on the
            server. */}
        <form
          action="/search"
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-wrap items-center gap-2"
        >
          <label htmlFor="search-query" className="sr-only">Search Whether guidance</label>
          {activeJob ? <input type="hidden" name="job" value={activeJob} /> : null}
          <input
            id="search-query"
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you need to decide?"
            className="weather-surface min-h-[44px] min-w-0 flex-1 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <button type="submit" className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
            Search
          </button>
        </form>
      </search>

      {activeJob ? (
        <p className="text-fluid-xs text-slate-400">
          Filtered to “{searchJobLabels[activeJob]}”.{" "}
          <Link href={`/search?q=${encodeURIComponent(trimmed)}`} className="text-sky-200 underline decoration-sky-600">
            Show every job
          </Link>
        </p>
      ) : null}

      {!trimmed ? (
        <StartFromAJob />
      ) : results.length === 0 ? (
        <NothingMatched query={trimmed} />
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

          {SEARCH_JOB_ORDER.filter((jobKey) => grouped[jobKey].length > 0).map((jobKey) => (
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
    </>
  );
};
