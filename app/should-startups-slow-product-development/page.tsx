import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { DecisionAnswerPageContent } from "../answers/decisionAnswerPageContent";
import { findDecisionPage } from "../answers/decisionPages";

const slug = "should-startups-slow-product-development";
const page = findDecisionPage(slug);

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: page?.title ?? "Should startups slow product development?",
  description: page?.shortAnswer ?? "Direct answer with live posture and bounded rules.",
  path: "/should-startups-slow-product-development",
  imageAlt: page?.title ?? "Whether direct answer",
});

export default async function ShouldStartupsSlowProductDevelopmentPage() {
  return <DecisionAnswerPageContent slug={slug} route="/should-startups-slow-product-development" />;
}
