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
    <main className="weather-page-shell weather-page-shell-standard">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Decide" }]} />
      <section className="weather-panel grid gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Decision translation depth</p>
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decision paths</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-300">Start with a runnable path or utility first. Browse roles and situations only when you need wider discovery.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="weather-button inline-flex items-center justify-center">Return to Weekly Brief</Link>
            <Link href="/decide/ship-checklist" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">Run ship checklist</Link>
          </div>
        </div>
        <div className="weather-route-card space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Action-first</p>
          <ul className="space-y-2 text-sm text-slate-200">
            <li><span className="font-semibold text-slate-100">Need to act now?</span> Start with a toolkit.</li>
            <li><span className="font-semibold text-slate-100">Need a decision utility?</span> Use ship checklist or team context.</li>
            <li><span className="font-semibold text-slate-100">Need a full map?</span> Browse role or situation paths below.</li>
          </ul>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="text-lg font-semibold text-slate-100">Run this now</h2>
        <p className="text-sm text-slate-300">Direct toolkit shortcuts for the most common weekly decision jobs.</p>
        <div className="weather-page-grid-3">
          {decideHomeRecommendedToolkitSlugs.map((toolkitSlug) => {
            const toolkit = findToolkitDefinition(toolkitSlug);
            if (!toolkit) return null;

            return (
              <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-route-card space-y-2 text-sm text-slate-100">
                <p className="font-semibold">{toolkit.title}</p>
                <p className="text-xs text-slate-300">Run this now: {toolkit.decisionThisSession}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="text-lg font-semibold text-slate-100">Decision utilities</h2>
        <p className="text-sm text-slate-300">Use these only when the weekly call needs additional validation or personalization.</p>
        <div className="weather-page-grid-2">
          <Link href="/decide/ship-checklist" className="weather-route-card space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">Whether to ship checklist</h2>
            <p className="text-sm text-slate-300">Get a go / wait / kill recommendation tied to the current regime.</p>
          </Link>
          <Link href="/decide/team-context" className="weather-route-card space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">Team context profile</h2>
            <p className="text-sm text-slate-300">Tailor the mandate by stage, sector, and team profile.</p>
          </Link>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="text-lg font-semibold text-slate-100">Explore by role</h2>
        <div className="weather-page-grid-3">
          {useCaseRoles.map((role) => (
            <Link key={role.slug} href={`/decide/${role.slug}`} className="weather-route-card text-sm font-semibold text-slate-100">{role.title}</Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="text-lg font-semibold text-slate-100">Explore by situation</h2>
        <div className="weather-page-grid-2">
          {situationUseCaseDefinitions.map((situation) => (
            <Link key={situation.slug} href={`/decide/${situation.slug}`} className="weather-route-card text-sm text-slate-100">{situation.title}</Link>
          ))}
        </div>
      </section>
      <NextStepRail currentPath="/decide" />
    </main>
  );
}
