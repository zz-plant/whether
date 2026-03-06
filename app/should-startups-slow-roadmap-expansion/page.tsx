import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { DecisionAnswerPageContent } from "../answers/decisionAnswerPageContent";
import { findDecisionPage } from "../answers/decisionPages";

const slug = "should-startups-slow-roadmap-expansion";
const page = findDecisionPage(slug);

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: page?.title ?? "Should startups slow roadmap expansion?",
  description: page?.shortAnswer ?? "Direct answer with live posture and bounded rules.",
  path: "/should-startups-slow-roadmap-expansion",
  imageAlt: page?.title ?? "Whether direct answer",
});

export default async function ShouldStartupsSlowRoadmapExpansionPage() {
  return <DecisionAnswerPageContent slug={slug} route="/should-startups-slow-roadmap-expansion" />;
}
