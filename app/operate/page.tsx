import type { Metadata } from "next";
import { Suspense } from "react";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { CompactWorkstreamSwitcher } from "./components/planningWorkstreamNav";
import { WorkstreamNavFallback } from "../components/suspenseFallbacks";
import {
  buildPlanningPageModel,
  type PlanningSearchParams,
} from "./planningPageModel";

export { buildActionsExpansionHref } from "./planningPageModel";


export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: "Plan: rules, runway and the brief",
  description:
    "Turn this week's guidance into a plan: the rules, your runway, and the brief to share.",
  path: "/operate",
  imageAlt: "Whether planning view",
  imageParams: {
    template: "operations",
    title: "Plan: rules, runway and the brief",
    subtitle: "Turn this week's guidance into a plan.",
  },
});

export default async function OperationsPage({
  searchParams,
}: {
  searchParams?: Promise<PlanningSearchParams>;
}) {
  const { reportShellModel, children } = await buildPlanningPageModel(searchParams);
  return (
    <ReportShell model={reportShellModel}>
      <Suspense fallback={<WorkstreamNavFallback />}>
        <CompactWorkstreamSwitcher currentPath="/operate" />
      </Suspense>
      {children}
    </ReportShell>
  );
}
