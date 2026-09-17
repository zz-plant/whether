/**
 * Where "go straight there" goes, and the order jobs are shown in.
 *
 * Lifted out of the page when the results list became a client component: both
 * render the same answer, and a heuristic that existed twice would drift. The
 * page still server-renders `?q=` for a first paint and for a browser with no
 * JavaScript, so this genuinely runs in both places.
 */
import { searchIndex, type SearchEntityJob } from "../../lib/search/searchIndex";
import { buildToolkitLibraryHref } from "../resolve/components/toolkitLibraryPanels";

export const SEARCH_JOB_ORDER: SearchEntityJob[] = ["check", "approve", "resolve", "risk", "trust"];

export const isSearchEntityJob = (value: string): value is SearchEntityJob =>
  SEARCH_JOB_ORDER.includes(value as SearchEntityJob);

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
    /* `/operate`, not `/planning`: next.config.js 308s the latter, and this is
       now a rendered link rather than a redirect target, so the hop would show. */
    return "/operate#ops-monthly-action-summary";
  }

  return "/signals#decision-summary";
};

