import type { Metadata } from "next";
import Link from "next/link";
import { loadReportDataSafe } from "../../lib/report/reportData";
import { buildHomeBriefModel } from "../../lib/report/homeBriefModel";
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
  description: "Start from this week’s live call, then translate it by role, situation, or runnable tool.",
  path: "/decide",
  imageAlt: "Whether decision paths",
  imagePath: "/social/decide.svg",
});

export default async function DecidePage() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/decide" },
      ]),
    ),
  };
  const reportResult = await loadReportDataSafe(undefined, { route: "/decide" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const homeBriefModel = buildHomeBriefModel(reportData);
  const liveCall = {
    posture: homeBriefModel.postureWithStageLabel,
    action: reportData.actionNowShort ?? homeBriefModel.operatingStanceLine,
    guardrail: homeBriefModel.guardrail,
    flip: reportData.flipThreshold ?? homeBriefModel.reversalTrigger,
  };

  return (
    <HubPageShell width="standard">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Decide" }]} />
      <HubHero
        eyebrow="Decision translation"
        title="Translate this week’s live call without leaving the operator loop."
        description="Start from the current posture, then choose the narrowest path that turns it into a role-specific or situation-specific decision."
        actions={(
          <>
            <Link href="/" className="weather-button inline-flex items-center justify-center">Return to Weekly Brief</Link>
            <Link href="/decide/ship-checklist" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">Run ship checklist</Link>
          </>
        )}
        aside={(
          <div className="weather-hub-card space-y-3 px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Current weekly call</p>
            <p className="text-sm font-semibold text-slate-100">{liveCall.posture}</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="font-semibold text-slate-100">Do now:</span> {liveCall.action}</li>
              <li><span className="font-semibold text-slate-100">Guardrail:</span> {liveCall.guardrail}</li>
              <li><span className="font-semibold text-slate-100">Flip when:</span> {liveCall.flip}</li>
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
        id="start-from-this-weeks-call"
        title="Start from this week’s live call"
        description="Use the same bounded weekly decision everywhere below so translation never drifts from the canonical brief."
        className="scroll-mt-28"
      >
        <div className="weather-page-grid-3">
          <article className="weather-hub-card space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Posture</p>
            <p className="text-sm font-semibold text-slate-100">{liveCall.posture}</p>
          </article>
          <article className="weather-hub-card space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Action now</p>
            <p className="text-sm text-slate-200">{liveCall.action}</p>
          </article>
          <article className="weather-hub-card space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Guardrail and flip</p>
            <p className="text-sm text-slate-200">{liveCall.guardrail}</p>
            <p className="text-xs text-slate-400">Flip: {liveCall.flip}</p>
          </article>
        </div>
      </HubSection>

      <HubSection
        id="run-this-now"
        title="Run this now"
        description="Use the shortest runnable path when the live call already tells you the direction and you only need execution translation."
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
        description="Use these only when the live call needs bounded validation or company context before you act."
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
