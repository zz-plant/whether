import Link from "next/link";
import { decideHomeRecommendedToolkitSlugs, findToolkitDefinition, toolkitDefinitions } from "../../../lib/decisionDomainCatalog";

const suggestedToolkitQueries = ["rollback", "roadmap", "pmf", "pricing", "capacity"] as const;

export function buildToolkitLibraryHref(query?: string) {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) {
    return "/resources#toolkit-library";
  }

  const params = new URLSearchParams();
  params.set("toolkitQuery", normalizedQuery);
  return `/resources?${params.toString()}#toolkit-library`;
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
        <h2 className="text-sm type-eyebrow text-slate-300">
          {normalizedQuery ? "Tool results" : "Recommended tools"}
        </h2>
        <p className="text-sm text-slate-300">
          {normalizedQuery
            ? "Matched from search. Clear to see the full shortlist."
            : "Each opens a one-decision worksheet. Search the site with ⌘K."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span className="rounded-sm border border-slate-700/70 px-3 py-1 font-semibold">
          {`${filteredToolkits.length} ${filteredToolkits.length === 1 ? "result" : "results"}`}
        </span>
        {suggestedToolkitQueries.map((intent) => (
          <Link key={intent} href={buildToolkitLibraryHref(intent)} className="weather-hub-chip">
            {intent}
          </Link>
        ))}
      </div>

      {normalizedQuery ? (
        <div className="rounded-md border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
          Showing the tools that match your search.
        </div>
      ) : (
        <div className="rounded-md border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
          {routedShortlist.map((toolkit) => toolkit.title.replace(/ Toolkit$/, "")).join(", ")}.
        </div>
      )}

      {filteredToolkits.length > 0 ? (
        <div className="weather-page-grid-3">
          {filteredToolkits.map((toolkit) => (
            <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-hub-link-card space-y-2 text-sm text-slate-100">
              <p className="font-semibold">{toolkit.title}</p>
              <p className="text-xs text-slate-300">{toolkit.decisionThisSession}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-slate-700/70 bg-slate-950/40 px-4 py-4 text-sm text-slate-200">
          <p>No tool matched “{normalizedQuery}”. Try a broader task label, or one of the direct answers above.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/resources#answers" className="weather-hub-chip">Try direct answers</Link>
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
