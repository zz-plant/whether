import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import {
  decideHomeRecommendedToolkitSlugs,
  findToolkitDefinition,
  situationUseCaseDefinitions,
  useCaseRoles,
} from "../../lib/decisionDomainCatalog";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { NextStepRail } from "../components/nextStepRail";

export const metadata: Metadata = buildPageMetadata({
  title: "Decide — role and situation paths",
  description: "Choose guidance by role or situation, then run supporting decision tools.",
  path: "/decide",
  imageAlt: "Whether decision paths",
});

export default function DecidePage() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/decide" },
      ]),
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Decide" }]} />
      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Step 2 of 3 · choose path</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decision paths</h1>
        <p className="text-sm text-slate-300">Choose one entrypoint: role for a full decision map, or situation for the fastest route to next action.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/start" className="weather-button inline-flex items-center justify-center">Back to Start Here</Link>
          <Link href="/decide/ship-checklist" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">Next: run ship checklist</Link>
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Explore by role</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {useCaseRoles.map((role) => (
            <Link key={role.slug} href={`/decide/${role.slug}`} className="weather-surface px-4 py-4 text-sm font-semibold text-slate-100">{role.title}</Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Explore by situation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {situationUseCaseDefinitions.map((situation) => (
            <Link key={situation.slug} href={`/decide/${situation.slug}`} className="weather-surface px-4 py-4 text-sm text-slate-100">{situation.title}</Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Run this now</h2>
        <p className="text-sm text-slate-300">Jump straight into a toolkit if you already know the decision workflow you need today.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decideHomeRecommendedToolkitSlugs.map((toolkitSlug) => {
            const toolkit = findToolkitDefinition(toolkitSlug);
            if (!toolkit) return null;

            return (
              <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-surface space-y-2 px-4 py-4 text-sm text-slate-100">
                <p className="font-semibold">{toolkit.title}</p>
                <p className="text-xs text-slate-300">Decide now: {toolkit.decisionThisSession}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Optional supporting tools</h2>
        <p className="text-sm text-slate-300">After choosing a role or situation path, use these only if you need additional validation for today&apos;s decision.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/signals" className="weather-panel space-y-2 px-4 py-4">
            <h2 className="text-lg font-semibold text-slate-100">Signals evidence</h2>
            <p className="text-sm text-slate-300">Check live evidence before committing to irreversible moves.</p>
          </Link>
          <Link href="/decide/ship-checklist" className="weather-panel space-y-2 px-4 py-4">
            <h2 className="text-lg font-semibold text-slate-100">Whether to ship checklist</h2>
            <p className="text-sm text-slate-300">Get a go/wait/kill recommendation tied to the current regime.</p>
          </Link>
          <Link href="/decide/team-context" className="weather-panel space-y-2 px-4 py-4">
            <h2 className="text-lg font-semibold text-slate-100">Team context profile</h2>
            <p className="text-sm text-slate-300">Personalize the mandate by stage, sector, and team size.</p>
          </Link>
        </div>
      </section>
      <NextStepRail currentPath="/decide" />
    </main>
  );
}
