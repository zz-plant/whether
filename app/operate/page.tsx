import type { Metadata } from "next";
import { Suspense } from "react";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { OperationsWorkstreamNav } from "./components/planningWorkstreamNav";
import { WorkstreamNavFallback } from "../components/suspenseFallbacks";
import {
  buildPlanningPageModel,
  type PlanningSearchParams,
} from "./planningPageModel";

export { buildActionsExpansionHref } from "./planningPageModel";


export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: "Planning — Guardrails, Runway, and the Team Brief",
  description:
    "Approve the weekly plan, guardrails, finance direction, and share-ready brief for the current market backdrop.",
  path: "/operate",
  imageAlt: "Whether planning view",
  imagePath: "/social/planning.svg",
});

export default async function OperationsPage({
  searchParams,
}: {
  searchParams?: Promise<PlanningSearchParams>;
}) {
  const { reportShellModel, children } = await buildPlanningPageModel(searchParams);
  return (
    <ReportShell model={reportShellModel}>
      {children}
      <Suspense fallback={<WorkstreamNavFallback />}>
        <OperationsWorkstreamNav currentPath="/operate" />
      </Suspense>
    </ReportShell>
  );
}
