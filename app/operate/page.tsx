import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import {
  buildPlanningPageModel,
  type PlanningSearchParams,
} from "./planningPageModel";
import { operatePageDescription, operatePageName } from "./planQuestions";

export { buildActionsExpansionHref } from "./planningPageModel";


export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: operatePageName,
  description: operatePageDescription,
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
