import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { findDecisionPage, highValueAnswerStaticParams, highValueStaticAnswerSlugs } from "../decisionPages";
import { DecisionAnswerPageContent } from "../decisionAnswerPageContent";
import { buildSeoDecisionPayload } from "../../../lib/report/seoDecisionPayload";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";

type DecisionPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;
export const revalidate = 900;

export function generateStaticParams() {
  return highValueAnswerStaticParams;
}

export const buildDecisionAnswerMetadata = ({
  title,
  slug,
  payload,
}: {
  title: string;
  slug: string;
  payload: ReturnType<typeof buildSeoDecisionPayload>;
}): Metadata => {
  const metadata = buildPageMetadata({
    title: `${title} (Live operator answer)`,
    description: `${payload.currentCall} Action: ${payload.immediateAction}`,
    path: `/answers/${slug}`,
    imageAlt: title,
    imagePath: "/social/answers.svg",
  });

  if (payload.noindex) {
    metadata.robots = {
      index: false,
      follow: true,
    };
  }

  return metadata;
};

export async function generateMetadata({ params }: DecisionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = findDecisionPage(slug);
  if (!page) {
    return buildPageMetadata({
      title: "Operator decision answer",
      description: "Macro-backed operator decision answer pages.",
      path: "/answers",
      imageAlt: "Whether operator answer",
      imagePath: "/social/answers.svg",
    });
  }

  const route = highValueStaticAnswerSlugs.includes(slug) ? "/answers/[slug]" : "/answers/[slug]:isr";
  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route });
  const homeBriefModel = snapshot.homeBriefModel;
  const mappedRules = homeBriefModel.decisionRules.filter((rule) => page.mappedDecisionAreas.includes(rule.area));
  const payload = buildSeoDecisionPayload({
    assessment: reportData.assessment,
    mappedRules,
    mappedDecisionAreas: page.mappedDecisionAreas,
    fallbackCurrentCall: page.shortAnswer,
    fallbackImmediateAction: page.directAnswer,
    reportEvidenceItems: reportData.reportEvidenceItems,
    freshnessLabel: reportData.fetchedAtLabel,
    recordDateLabel: reportData.recordDateLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    isFallbackSnapshot: degraded,
    provenanceStatusLabel: reportData.treasuryProvenance?.statusLabel,
    fetchedAtIso: reportData.treasury.fetched_at,
    pageKey: `/answers/${page.slug}`,
    provenanceLinks: [reportData.treasury.source, reportData.macroSeries[0]?.sourceUrl].filter((link): link is string => Boolean(link)),
  });

  return buildDecisionAnswerMetadata({ title: page.title, slug: page.slug, payload });
}

export default async function DecisionAnswerPage({ params }: DecisionPageProps) {
  const { slug } = await params;

  return <DecisionAnswerPageContent slug={slug} route={highValueStaticAnswerSlugs.includes(slug) ? "/answers/[slug]" : "/answers/[slug]:isr"} />;
}
