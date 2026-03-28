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
  title: "Toolkits — supporting instruments for Decision Tools",
  description: "Supporting instrument library for Decision Tools with practical toolkits, checklists, templates, and misuse warnings.",
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
        eyebrow="Supporting surface under Decision Tools"
        title="Run one instrument to close the last execution question."
        description="Search by the decision job you need to finish now. Toolkits are for execution when the direction is already clear and one runnable checker or template will unblock action."
        actions={(
          <>
            <Link href="#find-the-runnable-instrument" className="weather-button inline-flex items-center justify-center">Find a toolkit</Link>
            <Link href="/decide" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">Decision Tools</Link>
          </>
        )}
        stats={[
          { label: "Results", value: `${filteredToolkits.length} toolkit${filteredToolkits.length === 1 ? "" : "s"}` },
          { label: "Best use", value: "Action after direction" },
          { label: "Search mode", value: query ? `Intent: ${query}` : "Browse all", detail: "Search by decision job, not by abstract framework language." },
        ]}
      />
      <HubSection id="find-the-runnable-instrument" title="Find the runnable instrument" description="Search by the decision you need to make this week. Each toolkit is designed to move a team from posture to one bounded action." >
        <form action="/toolkits" className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="toolkits-search-input" className="sr-only">Search toolkits by decision</label>
          <input
            id="toolkits-search-input"
            type="search"
            name="q"
            defaultValue={resolvedSearchParams?.q ?? ""}
            className="weather-input w-full px-4 py-2"
            placeholder="Search toolkits (e.g., rollback, roadmap, PMF)…"
            autoComplete="off"
            aria-label="Search toolkits"
          />
          <button type="submit" className="weather-button">Search</button>
          {query ? (<Link href="/toolkits" className="weather-button inline-flex items-center justify-center">Clear</Link>) : null}
        </form>
        <p className="text-xs text-slate-300">Use concrete decision jobs first, then refine by workflow context.</p>
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

      <HubSection title="Runnable toolkits" description="Start with the decision this session, not the framework label.">
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
          <div className="flex flex-wrap gap-2">
            <Link href="/decide" className="weather-hub-chip">Open Decision Tools for guided routing</Link>
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
        </section>
      ) : null}
      <NextStepRail currentPath="/toolkits" />
    </HubPageShell>
  );
}
