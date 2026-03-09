import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { findDecisionPage, highValueAnswerStaticParams, highValueStaticAnswerSlugs } from "../decisionPages";
import { DecisionAnswerPageContent } from "../decisionAnswerPageContent";

type DecisionPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;
export const revalidate = 900;

export function generateStaticParams() {
  return highValueAnswerStaticParams;
}

export async function generateMetadata({ params }: DecisionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = findDecisionPage(slug);
  if (!page) {
    return buildPageMetadata({
      title: "Operator decision answer",
      description: "Macro-backed operator decision answer pages.",
      path: "/answers",
      imageAlt: "Whether operator answer",
    });
  }

  return buildPageMetadata({
    title: `${page.title} (Live operator answer)`,
    description: `${page.shortAnswer} Direct answer with bounded recommendations and threshold context.`,
    path: `/answers/${page.slug}`,
    imageAlt: page.title,
  });
}

export default async function DecisionAnswerPage({ params }: DecisionPageProps) {
  const { slug } = await params;

  return <DecisionAnswerPageContent slug={slug} route={highValueStaticAnswerSlugs.includes(slug) ? "/answers/[slug]" : "/answers/[slug]:isr"} />;
}
