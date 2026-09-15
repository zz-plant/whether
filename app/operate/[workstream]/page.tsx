import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { RunwayPlannerPanel } from "../components/runwayPlannerPanel";
import { ScenarioStudioSimulator } from "../components/scenarioStudioSimulator";
import { CompactWorkstreamSwitcher } from "../components/planningWorkstreamNav";
import { WorkstreamNavFallback } from "../../components/suspenseFallbacks";
import { operationsSectionLinks } from "../../../lib/navigation/planningNavigation";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";

import { WORKSTREAMS, isWorkstream, workstreamSlugs } from "../workstreams";

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
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const { trustStatusTone } = snapshot.trustStatus;

  return (
    <ReportShell
      model={{
        status: { statusLabel, recordDateLabel, fetchedAtLabel },
        page: {
          pageTitle: entry.pageTitle,
          pageSummary: entry.pageSummary,
          sectionLinks: operationsSectionLinks[entry.slug] ?? operationsSectionLinks.plan,
        },
        trust: {
          trustStatusTone,
          showOfflineBadge: isFallback && !reportData.historicalSelection,
        },
      }}
    >
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Plan", href: "/operate" },
            { label: entry.pageTitle },
          ]}
        />
        <Suspense fallback={<WorkstreamNavFallback />}>
          <CompactWorkstreamSwitcher currentPath={currentPath} />
        </Suspense>
        {entry.slug === "financial" ? (
          <div id="ops-runway-planner">
            <RunwayPlannerPanel assessment={assessment} sensors={sensors} macroSeries={macroSeries} recordDateLabel={recordDateLabel} />
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
