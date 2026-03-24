import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { postureDefinitions } from "../../lib/decisionDomainCatalog";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";

export const metadata: Metadata = buildPageMetadata({
  title: "Posture guides — routed from Weekly Brief",
  description: "Use the Weekly Brief for the live posture call; this page is a reference index for posture detail pages.",
  path: "/posture",
  imageAlt: "Whether posture",
  imagePath: "/social/posture.svg",
});

export default async function PosturePage() {
  const { snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/posture" });
  const { displayRegime } = snapshot;
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Posture guides</h1>
        <p className="text-sm text-slate-300">For weekly posture selection, start from Weekly Brief. Use this page when you need direct access to posture detail pages.</p>
        <p className="text-xs text-sky-200">Current weekly brief posture: {displayRegime.label} <span className="text-slate-400">({displayRegime.canonicalRegime})</span></p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">Open Weekly Brief</Link>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {postureDefinitions.map((posture) => (
          <Link key={posture.slug} href={`/posture/${posture.slug}`} className="weather-panel space-y-2 px-4 py-4">
            <span className="inline-flex w-fit items-center rounded-full border border-sky-400/45 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">
              Posture reference
            </span>
            <h2 className="text-lg font-semibold text-slate-100">{posture.title}</h2>
            <p className="text-sm text-slate-300">{posture.summary}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
