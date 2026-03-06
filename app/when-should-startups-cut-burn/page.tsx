import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { DecisionAnswerPageContent } from "../answers/decisionAnswerPageContent";
import { findDecisionPage } from "../answers/decisionPages";

const slug = "when-should-startups-cut-burn";
const page = findDecisionPage(slug);

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: page?.title ?? "When should startups cut burn?",
  description: page?.shortAnswer ?? "Direct answer with live posture and bounded rules.",
  path: "/when-should-startups-cut-burn",
  imageAlt: page?.title ?? "Whether direct answer",
});

export default async function WhenShouldStartupsCutBurnPage() {
  return <DecisionAnswerPageContent slug={slug} route="/when-should-startups-cut-burn" />;
}
