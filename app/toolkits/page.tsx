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
  const filteredToolkits = toolkitDefinitions.filter((toolkit) => {
    if (!query) return true;
    return `${toolkit.title} ${toolkit.whenToUse}`.toLowerCase().includes(query);
  });

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
          <Link href="/toolkits" className="weather-button inline-flex items-center justify-center">Clear</Link>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {filteredToolkits.map((toolkit) => (
          <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-panel space-y-2 px-4 py-4">
            <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/45 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
              Toolkit
            </span>
            <h2 className="text-base font-semibold text-slate-100">{toolkit.title}</h2>
            <p className="text-sm text-slate-200">{toolkit.whenToUse}</p>
          </Link>
        ))}
      </section>
      {filteredToolkits.length === 0 ? (
        <p className="weather-panel px-6 py-5 text-sm text-slate-200">No toolkits matched “{query}”. Try broader keywords.</p>
      ) : null}
    </main>
  );
}
