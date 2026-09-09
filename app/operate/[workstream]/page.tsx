import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { RunwayPlannerPanel } from "../components/runwayPlannerPanel";
import { ScenarioStudioSimulator } from "../components/scenarioStudioSimulator";
import { OperationsWorkstreamNav } from "../components/planningWorkstreamNav";
import { WorkstreamNavFallback } from "../../components/suspenseFallbacks";
import { operationsSectionLinks } from "../../../lib/navigation/planningNavigation";

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
  banner: { label: string; decision: string; horizon: string; confidence?: string; evidenceHref: string };
  intro?: string;
};

const WORKSTREAMS: Record<Workstream["slug"], Workstream> = {
  financial: {
    slug: "financial",
    title: "Financial Strategy — Capital Posture This Week",
    description: "CFO and financial operating guardrails aligned with current interest rates and credit conditions.",
    imageAlt: "Whether financial strategy view",
    pageTitle: "Financial strategy",
    pageSummary: "CFO runway planning and capital efficiency settings for the current macro regime.",
    banner: {
      label: "CFO Align",
      decision: "Set capital allocation discipline, test runway limits, and export aligned board updates.",
      horizon: "This quarter",
      evidenceHref: "#ops-runway-planner",
    },
    intro: "This financial workspace lets you run scenario planning based on your startup stage and sector sensitivity, and export macro-aligned budget planning memos for your board.",
  },
  scenarios: {
    slug: "scenarios",
    title: "Scenario Studio — Counterfactual Macro Simulator",
    description: "Interactive counterfactual simulation: test rate cuts, inversions, and stress scenarios against live posture.",
    imageAlt: "Whether scenario studio counterfactual simulator view",
    pageTitle: "Scenario studio",
    pageSummary: "Simulate counterfactual macro conditions, rate cuts, or deeper inversions to stress-test your operating plan.",
    banner: {
      label: "Scenario Studio",
      decision: "Simulate policy rate and curve slope shifts to test how your operating commitments hold under stress.",
      horizon: "Counterfactual Model",
      confidence: "Hypothetical",
      evidenceHref: "#sliders-controls-heading",
    },
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
    imagePath: "/social/planning.svg",
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
  const { trustStatusLabel, trustStatusDetail, trustStatusAction, trustStatusTone } = snapshot.trustStatus;
  const weeklyCall = snapshot.weeklyCall;

  return (
    <ReportShell
      model={{
        status: { statusLabel, recordDateLabel, fetchedAtLabel, treasurySource: treasury.source },
        page: {
          pageTitle: entry.pageTitle,
          currentPath,
          pageSummary: entry.pageSummary,
          sectionLinks: operationsSectionLinks.plan,
        },
        trust: {
          trustStatusLabel,
          trustStatusDetail,
          trustStatusAction,
          trustStatusTone,
          showOfflineBadge: isFallback && !reportData.historicalSelection,
        },
        actions: {
          primaryCta: { href: "/operate", label: "Operations Checklists" },
          secondaryCta: { href: "/", label: "Weekly Brief" },
        },
        payloads: {
          decisionBanner: {
            ...entry.banner,
            confidence: entry.banner.confidence ?? trustStatusLabel,
            effectiveDate: recordDateLabel,
          },
          commandBar: {
            regime: assessment.regime,
            call: weeklyCall.currentCall,
            doNow: weeklyCall.doNowBullets,
            flipConditions: [weeklyCall.changeCourseIf, ...weeklyCall.flipConditionLabels].slice(0, 4),
            updatedAt: fetchedAtLabel,
          },
        },
      }}
    >
      <div className="space-y-6">
        {entry.intro ? (
          <p className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2 text-fluid-xs leading-5 text-slate-400">
            {entry.intro}
          </p>
        ) : null}
        {entry.slug === "financial" ? (
          <div id="ops-runway-planner">
            <RunwayPlannerPanel assessment={assessment} sensors={sensors} macroSeries={macroSeries} recordDateLabel={recordDateLabel} />
          </div>
        ) : (
          <Suspense fallback={null}>
            <ScenarioStudioSimulator liveTreasury={treasury} liveAssessment={assessment} />
          </Suspense>
        )}
        <Suspense fallback={<WorkstreamNavFallback />}>
          <OperationsWorkstreamNav currentPath={currentPath} />
        </Suspense>
      </div>
    </ReportShell>
  );
}
