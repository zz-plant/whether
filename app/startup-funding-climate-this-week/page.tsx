import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { DecisionAnswerPageContent } from "../answers/decisionAnswerPageContent";
import { findDecisionPage } from "../answers/decisionPages";

const slug = "startup-funding-climate-this-week";
const page = findDecisionPage(slug);

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: page?.title ?? "Startup funding climate this week",
  description: page?.shortAnswer ?? "Direct answer with live posture and bounded rules.",
  path: "/startup-funding-climate-this-week",
  imageAlt: page?.title ?? "Whether direct answer",
});

export default async function StartupFundingClimateThisWeekPage() {
  return <DecisionAnswerPageContent slug={slug} route="/startup-funding-climate-this-week" />;
}
