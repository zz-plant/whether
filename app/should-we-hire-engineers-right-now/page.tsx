import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { DecisionAnswerPageContent } from "../answers/decisionAnswerPageContent";
import { findDecisionPage } from "../answers/decisionPages";

const slug = "should-startups-hire-engineers-right-now";
const page = findDecisionPage(slug);

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: page?.title ?? "Should we hire engineers right now?",
  description: page?.shortAnswer ?? "Direct answer with live posture and bounded rules.",
  path: "/should-we-hire-engineers-right-now",
  imageAlt: page?.title ?? "Whether direct answer",
});

export default async function ShouldWeHireEngineersRightNowPage() {
  return <DecisionAnswerPageContent slug={slug} route="/should-we-hire-engineers-right-now" />;
}
