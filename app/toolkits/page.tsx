import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { toolkitDefinitions } from "../../lib/decisionDomainCatalog";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";
import { NextStepRail } from "../components/nextStepRail";

export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: "Toolkits — supporting instruments for Decide",
  description: "Supporting instrument library for Decide with practical toolkits, checklists, templates, and misuse warnings.",
  path: "/toolkits",
  imageAlt: "Whether toolkits",
});

export default async function ToolkitsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim().toLowerCase() ?? "";
  const suggestedIntents = ["rollback", "roadmap", "pmf", "pricing", "capacity"] as const;
  const filteredToolkits = toolkitDefinitions.filter((toolkit) => {
    if (!query) return true;
    return `${toolkit.title} ${toolkit.whenToUse} ${toolkit.decisionThisSession}`.toLowerCase().includes(query);
  });
  const closestToolkits = query
    ? toolkitDefinitions.filter((toolkit) => toolkit.whenToUse.toLowerCase().includes(query.split(" ")[0] ?? "")).slice(0, 3)
    : [];
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/toolkits" },
      ]),
    ),
  };

  return (
    <HubPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Toolkits" }]} />
      <HubHero
        eyebrow="Supporting surface under Decide"
        title="Run one instrument end to end once the weekly call is already clear."
        description="Start in Decide when you need role or situation framing, then use this library to execute the tool itself."
        actions={<Link href="/decide" className="weather-button inline-flex items-center justify-center">Open Decide</Link>}
        stats={[
          { label: "Results", value: `${filteredToolkits.length} toolkit${filteredToolkits.length === 1 ? "" : "s"}` },
          { label: "Best use", value: "Action after orientation" },
          { label: "Search mode", value: query ? `Intent: ${query}` : "Browse all", detail: "Search by decision job, not by abstract framework language." },
        ]}
      />
      <HubSection title="Find the runnable instrument" description="Search by the decision you need to make this week. Each toolkit is designed to help a team move from posture to a bounded action." >
        <form action="/toolkits" className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={resolvedSearchParams?.q ?? ""}
            className="weather-input w-full px-4 py-2"
            placeholder="Search toolkits (e.g., rollback, roadmap, PMF)"
            aria-label="Search toolkits"
          />
          <button type="submit" className="weather-button">Search</button>
          {query ? (<Link href="/toolkits" className="weather-button inline-flex items-center justify-center">Clear</Link>) : null}
        </form>
        {query ? (
          <div className="flex flex-wrap gap-2 text-xs text-slate-200">
            <span className="weather-pill inline-flex min-h-[36px] items-center px-3 py-1">Active intent: {query}</span>
            <Link href="/toolkits" className="weather-pill inline-flex min-h-[36px] items-center px-3 py-1">Remove filter</Link>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-slate-700/70 px-3 py-1 font-semibold tracking-[0.1em]">
              {filteredToolkits.length} result{filteredToolkits.length === 1 ? "" : "s"}
            </span>
            {suggestedIntents.map((intent) => (
              <Link
                key={intent}
                href={`/toolkits?q=${intent}`}
                className="weather-hub-chip"
              >
                {intent}
              </Link>
            ))}
          </div>
      </HubSection>

      <HubSection title="Toolkit library" description="Start with the decision this session, not the framework label.">
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredToolkits.map((toolkit) => (
          <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-hub-link-card space-y-2">
            <span className="weather-hub-chip w-fit">
              Toolkit
            </span>
            <h2 className="text-base font-semibold text-slate-100">{toolkit.title}</h2>
            <p className="text-sm text-slate-200">{toolkit.whenToUse}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Best for: {toolkit.decisionThisSession}</p>
          </Link>
        ))}
      </div>
      </HubSection>
      {filteredToolkits.length === 0 ? (
        <section className="weather-hub-section space-y-3 text-sm text-slate-200">
          <p>No toolkits matched “{query}”. Try broader keywords.</p>
          {closestToolkits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {closestToolkits.map((toolkit) => (
                <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-hub-chip">
                  Try {toolkit.title}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <NextStepRail currentPath="/toolkits" />
    </HubPageShell>
  );
}
