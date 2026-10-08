import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata, withUpdatedMarker } from "../../../lib/seo";
import {
  findDecisionPage,
  highValueAnswerStaticParams,
  highValueStaticAnswerSlugs,
  isRetiredAnswerSlug,
} from "../decisionPages";
import { DecisionAnswerPageContent } from "../decisionAnswerPageContent";
import { buildSeoDecisionPayload } from "../../../lib/report/seoDecisionPayload";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { isIndexableAnswerSlug, noindexRobots } from "../../../lib/seo/indexationPolicy";

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
  shortAnswer,
  readingDateIso,
}: {
  title: string;
  slug: string;
  payload: ReturnType<typeof buildSeoDecisionPayload>;
  /** The page's own one-line answer. See the description note below. */
  shortAnswer?: string;
  /** The date of the reading the page's call comes from; the title's "(updated …)" month. */
  readingDateIso?: string;
}): Metadata => {
  /*
   * The page's own answer, and nothing that moves week to week.
   *
   * The description was `${currentCall} Action: ${immediateAction}` — both drawn
   * from the live posture filtered by the page's decision areas, so any two
   * pages leading with the same area shipped byte-identical snippets. "Should
   * startups hire engineers right now?" and "Should we expand sales headcount
   * now?" were indistinguishable in results, while each page's hand-written
   * `shortAnswer` — the one field that differs — never reached the SERP at all.
   * A later revision led with `shortAnswer` and kept the live action as a tail,
   * which still rewrote the snippet every week; the live call belongs on the
   * page and in the social card, not in a description a crawler caches.
   */
  const metadata = buildPageMetadata({
    title: withUpdatedMarker(title, readingDateIso),
    description: shortAnswer ?? `${payload.currentCall} Action: ${payload.immediateAction}`,
    path: `/answers/${slug}`,
    imageAlt: title,
    /*
     * The answers template, not the shared `solutions` lens. That lens draws a
     * fixed right-hand panel — "SOLUTIONS LENS / Decision support / Turn
     * climate calls into role-based operating guardrails" — so every answer
     * page unfurled with the same three lines and neither the question nor the
     * week's call reached the card. Here the question leads, the page's own
     * short answer sits under it, and the panel carries the live call and
     * action.
     */
    imageParams: {
      template: "answers",
      title,
      subtitle: shortAnswer ?? payload.currentCall,
      call: payload.currentCall,
      action: payload.immediateAction,
    },
  });

  if (payload.noindex || !isIndexableAnswerSlug(slug)) {
    metadata.robots = {
      ...noindexRobots,
    };
  }

  return metadata;
};

export async function generateMetadata({ params }: DecisionPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (isRetiredAnswerSlug(slug)) {
    return {
      ...buildPageMetadata({
        title: "Operator answer moved",
        description: "This answer was retired. The current direct answers are on Resolve.",
        path: "/resolve",
        imageAlt: "Whether: operator answer moved",
        imageParams: { template: "solutions", title: "Operator answer moved" },
      }),
      robots: {
        ...noindexRobots,
      },
    };
  }
  const page = findDecisionPage(slug);
  if (!page) {
    return buildPageMetadata({
      title: "Operator decision answer",
      description: "Macro-backed operator decision answer pages.",
      path: "/answers",
      imageAlt: "Whether operator answer",
      imageParams: { template: "solutions", title: "Operator decision answer" },
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

  return buildDecisionAnswerMetadata({
    title: page.title,
    slug: page.slug,
    payload,
    shortAnswer: page.shortAnswer,
    readingDateIso: reportData.treasury.record_date,
  });
}

export default async function DecisionAnswerPage({ params }: DecisionPageProps) {
  const { slug } = await params;
  if (isRetiredAnswerSlug(slug)) {
    permanentRedirect("/resolve#direct-answers");
  }

  return <DecisionAnswerPageContent slug={slug} route={highValueStaticAnswerSlugs.includes(slug) ? "/answers/[slug]" : "/answers/[slug]:isr"} />;
}
