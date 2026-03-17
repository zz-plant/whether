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
import { HubHero, HubPageShell, HubSection } from "../components/hubPageShell";
import { NextStepRail } from "../components/nextStepRail";
import { PageFlowNav } from "../components/pageFlowNav";
import { decideScrollPlan } from "../../lib/navigation/scrollPlans";

export const metadata: Metadata = buildPageMetadata({
  title: "Decide — role and situation paths",
  description: "Choose guidance by role or situation, then run supporting decision tools.",
  path: "/decide",
  imageAlt: "Whether decision paths",
  imagePath: "/social/decide.svg",
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
    <HubPageShell width="standard">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Decide" }]} />
      <HubHero
        eyebrow="Decision translation depth"
        title="Choose the path that turns posture into an operating call."
        description="Start with a runnable path or utility first. Browse roles and situations only when you need wider discovery."
        actions={(
          <>
            <Link href="/" className="weather-button inline-flex items-center justify-center">Return to Weekly Brief</Link>
            <Link href="/decide/ship-checklist" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">Run ship checklist</Link>
          </>
        )}
        aside={(
          <div className="weather-hub-card space-y-3 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Action-first</p>
          <ul className="space-y-2 text-sm text-slate-200">
            <li><span className="font-semibold text-slate-100">Need to act now?</span> Start with a toolkit.</li>
            <li><span className="font-semibold text-slate-100">Need a decision utility?</span> Use ship checklist or team context.</li>
            <li><span className="font-semibold text-slate-100">Need a full map?</span> Browse role or situation paths below.</li>
          </ul>
          </div>
        )}
      />

      <PageFlowNav
        eyebrow={decideScrollPlan.eyebrow}
        title={decideScrollPlan.title}
        description={decideScrollPlan.description}
        items={decideScrollPlan.items}
      />

      <HubSection
        id="run-this-now"
        title="Run this now"
        description="Direct toolkit shortcuts for the most common weekly decision jobs."
        className="scroll-mt-28"
      >
        <div className="weather-page-grid-3">
          {decideHomeRecommendedToolkitSlugs.map((toolkitSlug) => {
            const toolkit = findToolkitDefinition(toolkitSlug);
            if (!toolkit) return null;

            return (
              <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-hub-link-card space-y-2 text-sm text-slate-100">
                <span className="weather-hub-chip w-fit">Toolkit</span>
                <p className="font-semibold">{toolkit.title}</p>
                <p className="text-xs text-slate-300">Run this now: {toolkit.decisionThisSession}</p>
              </Link>
            );
          })}
        </div>
      </HubSection>

      <HubSection
        id="decision-utilities"
        title="Decision utilities"
        description="Use these only when the weekly call needs additional validation or personalization."
        className="scroll-mt-28"
      >
        <div className="weather-page-grid-2">
          <Link href="/decide/ship-checklist" className="weather-hub-link-card space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">Whether to ship checklist</h2>
            <p className="text-sm text-slate-300">Get a go / wait / kill recommendation tied to the current regime.</p>
          </Link>
          <Link href="/decide/team-context" className="weather-hub-link-card space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">Team context profile</h2>
            <p className="text-sm text-slate-300">Tailor the mandate by stage, sector, and team profile.</p>
          </Link>
        </div>
      </HubSection>

      <HubSection id="explore-by-role" title="Explore by role" className="scroll-mt-28">
        <div className="weather-page-grid-3">
          {useCaseRoles.map((role) => (
            <Link key={role.slug} href={`/decide/${role.slug}`} className="weather-hub-link-card text-sm font-semibold text-slate-100">{role.title}</Link>
          ))}
        </div>
      </HubSection>

      <HubSection id="explore-by-situation" title="Explore by situation" className="scroll-mt-28">
        <div className="weather-page-grid-2">
          {situationUseCaseDefinitions.map((situation) => (
            <Link key={situation.slug} href={`/decide/${situation.slug}`} className="weather-hub-link-card text-sm text-slate-100">{situation.title}</Link>
          ))}
        </div>
      </HubSection>
      <NextStepRail currentPath="/decide" />
    </HubPageShell>
  );
}
