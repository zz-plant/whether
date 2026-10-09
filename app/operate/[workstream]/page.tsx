import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { PremiumGate } from "../components/PremiumGate";
import { RunwayPlannerPanel } from "../components/runwayPlannerPanel";
import { ScenarioStudioSimulator } from "../components/scenarioStudioSimulator";
import { operationsSectionLinks } from "../../../lib/navigation/planningNavigation";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../../lib/navigation/breadcrumbs";

import { WORKSTREAMS, isWorkstream, workstreamSlugs } from "../workstreams";
import { isSavedCopy } from "../../../lib/report/provenanceStatus";

export const runtime = "edge";

type Params = { workstream: string };

export const generateStaticParams = () => workstreamSlugs.map((workstream) => ({ workstream }));

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { workstream } = await params;
  if (!isWorkstream(workstream)) return {};
  const entry = WORKSTREAMS[workstream];
  return buildPageMetadata({
    title: entry.title,
    description: entry.description,
    path: `/operate/${entry.slug}`,
    imageAlt: entry.imageAlt,
    imageParams: {
      template: "operations",
      title: entry.pageTitle,
      subtitle: entry.pageSummary,
    },
  });
}

export default async function OperateWorkstreamPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { workstream } = await params;
  if (!isWorkstream(workstream)) notFound();
  const entry = WORKSTREAMS[workstream];
  const currentPath = `/operate/${entry.slug}` as const;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(resolvedSearchParams, { route: "/operate" });
  const { assessment, sensors, macroSeries, recordDateLabel, fetchedAtLabel, statusLabel, treasury } = reportData;
  const isFallback = isSavedCopy(treasury);
  const { trustStatusTone } = snapshot.trustStatus;

  return (
    <ReportShell
      model={{
        status: { statusLabel, regime: assessment.regime, recordDateLabel, fetchedAtLabel },
        page: {
          pageTitle: entry.pageTitle,
          pageSummary: entry.pageSummary,
          sectionLinks: operationsSectionLinks[entry.slug] ?? operationsSectionLinks.plan,
          currentPath,
          tabsQuery: new URLSearchParams(
            Object.entries(resolvedSearchParams ?? {}).flatMap(([key, value]) => (value ? [[key, value]] : [])),
          ).toString() || undefined,
        },
        trust: {
          trustStatusTone,
          showOfflineBadge: isFallback && !reportData.historicalSelection,
        },
      }}
    >
      <div className="space-y-6">
        <Breadcrumbs items={toVisibleBreadcrumbs(buildGroupBreadcrumbs(currentPath))} />
        {entry.slug === "financial" ? (
          <div id="ops-runway-planner">
            <PremiumGate
              source="runway_planner"
              title="Runway planner"
              description="Enter cash in the bank, monthly spend and monthly revenue to see how far your runway goes in this week's conditions."
            >
              <RunwayPlannerPanel assessment={assessment} sensors={sensors} macroSeries={macroSeries} recordDateLabel={recordDateLabel} />
            </PremiumGate>
          </div>
        ) : (
          <Suspense fallback={null}>
            <ScenarioStudioSimulator liveTreasury={treasury} liveAssessment={assessment} />
          </Suspense>
        )}
      </div>
    </ReportShell>
  );
}
