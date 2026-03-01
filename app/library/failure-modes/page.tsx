import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { failureModes } from "../../../lib/informationArchitecture";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Failure Modes library",
  description: "Diagnostic pages that show what's going wrong and where to go next.",
  path: "/library/failure-modes",
  imageAlt: "Failure modes library",
});

const titleCase = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export default async function FailureModesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim().toLowerCase() ?? "";
  const filteredFailureModes = failureModes.filter((slug) => titleCase(slug).toLowerCase().includes(query));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Failure Modes</h1>
        <p className="text-base text-slate-200">Filter diagnostics by keyword to jump directly to the pattern you want to investigate.</p>
        <form action="/library/failure-modes" className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={resolvedSearchParams?.q ?? ""}
            className="weather-input w-full px-4 py-2"
            placeholder="Search failure modes"
            aria-label="Search failure modes"
          />
          <button type="submit" className="weather-button">Search</button>
          <Link href="/library/failure-modes" className="weather-button inline-flex items-center justify-center">Clear</Link>
        </form>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {filteredFailureModes.map((slug) => (
          <Link key={slug} href={`/library/failure-modes/${slug}`} className="weather-panel space-y-2 px-4 py-4 text-sm text-slate-100">
            <span className="inline-flex w-fit items-center rounded-full border border-rose-400/45 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200">
              Failure mode
            </span>
            <p className="font-semibold text-slate-100">{titleCase(slug)}</p>
          </Link>
        ))}
      </section>
      {filteredFailureModes.length === 0 ? (
        <p className="weather-panel px-6 py-5 text-sm text-slate-200">No failure modes matched “{query}”.</p>
      ) : null}
    </main>
  );
}
