import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import {
  buildPlanningPageModel,
  type PlanningSearchParams,
} from "./planningPageModel";

export { buildActionsExpansionHref } from "./planningPageModel";


export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: "This Week's Plan: Hiring, Spending and Runway Rules",
  description:
    "Turn this week's guidance into a plan: the rules, your runway, and the brief to share.",
  path: "/operate",
  imageAlt: "Whether planning view",
  imageParams: {
    template: "operations",
    title: "Decide: rules, runway and the brief",
    subtitle: "Turn this week's guidance into rules for each decision.",
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
      {children}
    </ReportShell>
  );
}
