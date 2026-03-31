import Link from "next/link";
import { decideHomeRecommendedToolkitSlugs, findToolkitDefinition, toolkitDefinitions } from "../../../lib/decisionDomainCatalog";

export type ToolkitLibrarySearchParams = {
  toolkitQuery?: string;
};

const suggestedToolkitQueries = ["rollback", "roadmap", "pmf", "pricing", "capacity"] as const;

export function buildToolkitLibraryHref(query?: string) {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) {
    return "/decide#toolkit-library";
  }

  const params = new URLSearchParams();
  params.set("toolkitQuery", normalizedQuery);
  return `/decide?${params.toString()}#toolkit-library`;
}

export function resolveToolkitLibraryState(query?: string) {
  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  const routedShortlist = decideHomeRecommendedToolkitSlugs
    .map((slug) => findToolkitDefinition(slug))
    .filter((toolkit): toolkit is NonNullable<typeof toolkit> => Boolean(toolkit));
  const filteredToolkits = normalizedQuery
    ? toolkitDefinitions.filter((toolkit) =>
        `${toolkit.title} ${toolkit.whenToUse} ${toolkit.decisionThisSession}`.toLowerCase().includes(normalizedQuery),
      )
    : routedShortlist;
  const closestToolkits = normalizedQuery
    ? toolkitDefinitions
        .filter((toolkit) => toolkit.whenToUse.toLowerCase().includes(normalizedQuery.split(" ")[0] ?? ""))
        .slice(0, 3)
    : [];

  return {
    closestToolkits,
    filteredToolkits,
    normalizedQuery,
    routedShortlist,
    suggestedToolkitQueries,
  };
}

export function ToolkitLibraryPanels({
  query,
}: {
  query?: string;
}) {
  const {
    closestToolkits,
    filteredToolkits,
    normalizedQuery,
    routedShortlist,
  } = resolveToolkitLibraryState(query);

  return (
    <section id="toolkit-library" className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
          {normalizedQuery ? "Toolkit results" : "Toolkit shortlist"}
        </h2>
        <p className="text-sm text-slate-300">
          {normalizedQuery
            ? "You already know you need a runnable instrument. Use the filtered shortlist below instead of browsing the full toolkit catalog."
            : "Default to this routed shortlist. Search only when you already know the instrument class and still need a tighter match."}
        </p>
      </div>

      <form action="/decide" className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="decide-toolkit-search-input" className="sr-only">Search toolkit shortlist by decision job</label>
        <input
          id="decide-toolkit-search-input"
          type="search"
          name="toolkitQuery"
          defaultValue={query ?? ""}
          className="weather-input w-full px-4 py-2"
          placeholder="Search toolkit intent (e.g. rollback, roadmap, PMF)…"
          autoComplete="off"
          aria-label="Search toolkit shortlist"
        />
        <button type="submit" className="weather-button">Search</button>
        {normalizedQuery ? (
          <Link href="/decide#toolkit-library" className="weather-button inline-flex items-center justify-center">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span className="rounded-full border border-slate-700/70 px-3 py-1 font-semibold tracking-[0.1em]">
          {filteredToolkits.length} result{filteredToolkits.length === 1 ? "" : "s"}
        </span>
        {suggestedToolkitQueries.map((intent) => (
          <Link key={intent} href={buildToolkitLibraryHref(intent)} className="weather-hub-chip">
            {intent}
          </Link>
        ))}
      </div>

      {normalizedQuery ? (
        <div className="rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
          Search mode is for a known instrument class. If you are still choosing between an answer, a translation, or a toolkit, go back to the top router.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
          Showing the routed shortlist: {routedShortlist.map((toolkit) => toolkit.title).join(", ")}.
        </div>
      )}

      {filteredToolkits.length > 0 ? (
        <div className="weather-page-grid-3">
          {filteredToolkits.map((toolkit) => (
            <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-hub-link-card space-y-2 text-sm text-slate-100">
              <span className="weather-hub-chip w-fit">Toolkit</span>
              <p className="font-semibold">{toolkit.title}</p>
              <p className="text-xs text-slate-300">Run this now: {toolkit.decisionThisSession}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-4 text-sm text-slate-200">
          <p>No toolkit matched “{normalizedQuery}”. Try a broader job label or return to the question router above.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/decide#unresolved-question-router" className="weather-hub-chip">Return to question router</Link>
            <Link href="/decide#direct-answers" className="weather-hub-chip">Try direct answers</Link>
          </div>
          {closestToolkits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {closestToolkits.map((toolkit) => (
                <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-hub-chip">
                  Try {toolkit.title}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
