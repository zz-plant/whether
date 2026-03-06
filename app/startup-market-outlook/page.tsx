import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { DecisionAnswerPageContent } from "../answers/decisionAnswerPageContent";
import { findDecisionPage } from "../answers/decisionPages";

const slug = "startup-market-outlook";
const page = findDecisionPage(slug);

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: page?.title ?? "Startup market outlook",
  description: page?.shortAnswer ?? "Direct answer with live posture and bounded rules.",
  path: "/startup-market-outlook",
  imageAlt: page?.title ?? "Whether direct answer",
});

export default async function StartupMarketOutlookPage() {
  return <DecisionAnswerPageContent slug={slug} route="/startup-market-outlook" />;
}
