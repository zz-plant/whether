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
  title: "This week's plan: hiring, spending and runway rules",
  description:
    "Set the rules in advance: this week's guidance, your runway, and your own pause and restart lines, so changing course is a line being crossed.",
  path: "/operate",
  imageAlt: "Whether planning view",
  imageParams: {
    template: "operations",
    title: "Plan: rules, runway and the brief",
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
