import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { DecisionAnswerPageContent } from "../answers/decisionAnswerPageContent";
import { findDecisionPage } from "../answers/decisionPages";

const slug = "is-it-risk-on-or-risk-off-for-startups";
const page = findDecisionPage(slug);

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: page?.title ?? "Is it risk-on or risk-off for startups?",
  description: page?.shortAnswer ?? "Direct answer with live posture and bounded rules.",
  path: "/is-it-risk-on-or-risk-off-for-startups",
  imageAlt: page?.title ?? "Whether direct answer",
});

export default async function IsItRiskOnOrRiskOffForStartupsPage() {
  return <DecisionAnswerPageContent slug={slug} route="/is-it-risk-on-or-risk-off-for-startups" />;
}
