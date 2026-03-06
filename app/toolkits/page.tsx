import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { toolkitDefinitions } from "../../lib/informationArchitecture";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Toolkits — runnable instruments",
  description: "Use practical toolkits with checklists, templates, and misuse warnings.",
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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Toolkits</h1>
        <p className="text-base text-slate-200">
          Run one toolkit end-to-end for your current decision. Search by toolkit name or intent to find the right instrument faster.
        </p>
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
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold uppercase tracking-[0.1em] text-slate-200 hover:border-sky-400/70"
            >
              {intent}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {filteredToolkits.map((toolkit) => (
          <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-panel space-y-2 px-4 py-4">
            <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/45 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
              Toolkit
            </span>
            <h2 className="text-base font-semibold text-slate-100">{toolkit.title}</h2>
            <p className="text-sm text-slate-200">{toolkit.whenToUse}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Best for: {toolkit.decisionThisSession}</p>
          </Link>
        ))}
      </section>
      {filteredToolkits.length === 0 ? (
        <section className="weather-panel space-y-3 px-6 py-5 text-sm text-slate-200">
          <p>No toolkits matched “{query}”. Try broader keywords.</p>
          {closestToolkits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {closestToolkits.map((toolkit) => (
                <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
                  Try {toolkit.title}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
