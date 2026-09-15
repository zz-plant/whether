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

export const runtime = "edge";

/*
 * /operate/financial and /operate/scenarios were two files that differed in
 * the imported panel, the metadata, and the banner — everything else (the
 * snapshot load, the shell model, the workstream nav) was copied line for
 * line. One route, one map.
 */
type Workstream = {
  slug: "financial" | "scenarios";
  title: string;
  description: string;
  imageAlt: string;
  pageTitle: string;
  pageSummary: string;
};

const WORKSTREAMS: Record<Workstream["slug"], Workstream> = {
  financial: {
    slug: "financial",
    title: "Financial Strategy — Capital Posture This Week",
    description: "CFO and financial operating guardrails aligned with current interest rates and credit conditions.",
    imageAlt: "Whether financial strategy view",
    pageTitle: "Financial strategy",
    pageSummary: "CFO runway planning and capital efficiency settings for the current macro regime.",
  },
  scenarios: {
    slug: "scenarios",
    title: "Scenario Studio — Counterfactual Macro Simulator",
    description: "Interactive counterfactual simulation: test rate cuts, inversions, and stress scenarios against live posture.",
    imageAlt: "Whether scenario studio counterfactual simulator view",
    pageTitle: "Scenario studio",
    pageSummary: "Simulate counterfactual macro conditions, rate cuts, or deeper inversions to stress-test your operating plan.",
  },
};

const isWorkstream = (value: string): value is Workstream["slug"] => value in WORKSTREAMS;

type Params = { workstream: string };

export const generateStaticParams = () => Object.keys(WORKSTREAMS).map((workstream) => ({ workstream }));

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
        status: { statusLabel, regime: assessment.regime, recordDateLabel, fetchedAtLabel },
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
