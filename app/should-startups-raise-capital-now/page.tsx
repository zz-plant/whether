import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { DecisionAnswerPageContent } from "../answers/decisionAnswerPageContent";
import { findDecisionPage } from "../answers/decisionPages";

const slug = "should-startups-raise-capital-now";
const page = findDecisionPage(slug);

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: page?.title ?? "Should startups raise capital now?",
  description: page?.shortAnswer ?? "Direct answer with live posture and bounded rules.",
  path: "/should-startups-raise-capital-now",
  imageAlt: page?.title ?? "Whether direct answer",
});

export default async function ShouldStartupsRaiseCapitalNowPage() {
  return <DecisionAnswerPageContent slug={slug} route="/should-startups-raise-capital-now" />;
}
