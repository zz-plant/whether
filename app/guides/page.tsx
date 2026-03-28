import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { stageGuides } from "./stageGuides";
import { stakeholderGuides } from "./stakeholderGuides";
import { SecondarySurfaceStartBlock } from "../components/secondarySurfaceStartBlock";

export const metadata: Metadata = buildPageMetadata({
  title: "Role & Stage Guides — Whether",
  description:
    "Downstream role and stage helper guides for translating the weekly brief into bounded team decisions and review-ready operating calls.",
  path: "/guides",
  imageAlt: "Whether guides overview",
  imagePath: "/social/guides.svg",
});

const featuredStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
  "operations-leaders",
] as const;

export default function GuidesPage() {
  const featuredStakeholders = stakeholderGuides.filter((guide) =>
    featuredStakeholderSlugs.includes(guide.slug as (typeof featuredStakeholderSlugs)[number]),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <SecondarySurfaceStartBlock surface="guides" />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Guides overview</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Pick the fastest guide for this week&apos;s operating decision
        </h1>
        <p className="text-sm text-slate-200">
          Use stakeholder guides when you need role-specific actions. Use stage guides when you need
          company-maturity context for pacing, spend, and planning discipline.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
          >
            Weekly Brief
          </Link>
          <Link
            href="/method"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Trust
          </Link>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-100">Stakeholder guides</h2>
          <Link
            href="/guides/stage"
            className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Browse by company stage →
          </Link>
        </div>
        <p className="text-sm text-slate-300">
          Role-level pages with bounded actions you can use in leadership meetings and planning
          reviews.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {featuredStakeholders.map((guide) => (
            <article key={guide.slug} className="weather-surface space-y-2 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{guide.title}</h3>
              <p className="text-sm text-slate-300">{guide.tagline}</p>
              <p className="text-sm text-slate-200">{guide.positioning}</p>
              <Link
                href={`/guides/${guide.slug}`}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                Open {guide.title} guide →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Company stage guides</h2>
        <p className="text-sm text-slate-300">
          Stage-level pages to calibrate operating intensity and planning cadence as coordination
          cost increases.
        </p>
        <ul className="space-y-2 text-sm text-slate-200">
          {stageGuides.map((stage) => (
            <li key={stage.slug} className="weather-surface flex items-center justify-between gap-4 px-4 py-3">
              <span>
                <span className="font-semibold text-slate-100">{stage.title}</span> — {stage.primaryValue}
              </span>
              <Link
                href={`/guides/stage/${stage.slug}`}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                Open →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
