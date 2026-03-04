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

const classifyToolkit = (title: string, whenToUse: string) => {
  const normalized = `${title} ${whenToUse}`.toLowerCase();
  if (normalized.includes("rollback") || normalized.includes("rights")) {
    return { category: "Governance", accentClass: "weather-card-accent-amber" };
  }
  if (normalized.includes("capacity")) {
    return { category: "Capacity", accentClass: "weather-card-accent-violet" };
  }
  if (normalized.includes("launch")) {
    return { category: "Launch", accentClass: "weather-card-accent-sky" };
  }
  if (normalized.includes("positioning") || normalized.includes("pricing")) {
    return { category: "Market", accentClass: "weather-card-accent-teal" };
  }
  if (normalized.includes("pmf")) {
    return { category: "Discovery", accentClass: "weather-card-accent-teal" };
  }
  return { category: "Execution", accentClass: "weather-card-accent-sky" };
};

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
    return `${toolkit.title} ${toolkit.whenToUse}`.toLowerCase().includes(query);
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel-hero space-y-4 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Runnable instruments</p>
        <h1 className="type-section text-slate-100">Toolkits</h1>
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
          <button type="submit" className="weather-button-primary">Search</button>
          {query ? (<Link href="/toolkits" className="weather-button inline-flex items-center justify-center">Clear</Link>) : null}
        </form>
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
        {filteredToolkits.map((toolkit) => {
          const kitCategory = classifyToolkit(toolkit.title, toolkit.whenToUse);
          return (
            <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className={`weather-panel weather-card-accent ${kitCategory.accentClass} space-y-2 px-4 py-3`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/45 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                  Toolkit
                </span>
                <span className="inline-flex w-fit items-center rounded-full border border-slate-700/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                  {kitCategory.category}
                </span>
              </div>
              <h2 className="text-base font-semibold text-slate-100">{toolkit.title}</h2>
              <p className="text-[15px] text-slate-200 sm:text-base">{toolkit.whenToUse}</p>
            </Link>
          );
        })}
      </section>
      {filteredToolkits.length === 0 ? (
        <p className="weather-panel px-6 py-5 text-[15px] text-slate-200 sm:text-base">No toolkits matched “{query}”. Try broader keywords.</p>
      ) : null}
    </main>
  );
}
