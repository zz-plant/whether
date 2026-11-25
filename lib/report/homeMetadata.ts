import type { Metadata } from "next";
import { shortSiteName } from "../seo";
import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { buildHomeSharePath, type HomeShareSearchParams as HomePageSearchParams } from "./homeSharePreview";
import { decisionTransmissionSearchDescription } from "./decisionTransmissionCopy";
import { type HomeReportData } from "./homeBriefModel";
import { formatWeekAnswer } from "./briefArtifact";
import { getRegimePublicLabel } from "../regimePresentation";

export type { HomePageSearchParams };

// Keeps "macro" (the search term people actually type) while leading with the
// ruled stance noun and naming the operator this is built for rather than
// "leadership teams", which describes a buying committee nobody has met yet.
/* The words people search for first, then the category line verbatim (docs/editorial-guardrails.md):
   nobody types "operating guidance" (2026-10-28). */
const HOME_TITLE = "When to Hire, Raise and Spend: Weekly Operating Guidance for Startup Leaders";
const HOME_STANDING_DESCRIPTION = decisionTransmissionSearchDescription;

/**
 * The description as the answer to "what should a startup do this week?", in the two
 * sentences a person would say (2026-11-18): the week's action, as the page's heading
 * states it, then the two scores and the conditions they set. "This week: only say yes to
 * things that bring in cash or that a customer is already counting on. Funding pressure is
 * 90 and risk appetite is 44, so conditions are Freezing." A search result is read out of
 * context, so it carries the numbers it rests on. Without a reading, or on an archived
 * month (which is not this week, and is not indexed), the standing description.
 */
type HomeSearchAnswer = {
  /** The week's action, as the page's heading states it (`deriveBriefCallFields(...).headline.action`). */
  call: string;
  /** The reading the action rests on: its two scores and its conditions. */
  assessment: { regime: string; scores: { tightness: number; riskAppetite: number } };
};

export const describeHomeSearchAnswer = ({ call, assessment }: HomeSearchAnswer) =>
  `${formatWeekAnswer(call)} Funding pressure is ${Math.round(assessment.scores.tightness)} and risk appetite is ${Math.round(assessment.scores.riskAppetite)}, so conditions are ${getRegimePublicLabel(assessment.regime)}.`;

const buildImageParams = (searchParams: HomePageSearchParams | undefined, reportData?: HomeReportData) => {
  const params: Record<string, string> = { template: "report" };

  if (searchParams?.month) {
    params.month = searchParams.month;
  }

  if (searchParams?.year) {
    params.year = searchParams.year;
  }

  if (reportData) {
    if (reportData.assessment.regime) {
      params.regime = reportData.assessment.regime;
    }
    if (reportData.postureState?.currentState?.postureLabel) {
      params.posture = reportData.postureState.currentState.postureLabel;
    }
  }

  return params;
};

export const buildHomeMetadata = async (
  searchParams?: Promise<HomePageSearchParams>,
  reportData?: HomeReportData,
  /** The week's answer, for the description (`describeHomeSearchAnswer`). */
  answer?: HomeSearchAnswer,
): Promise<Metadata> => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const hasTimeMachineParams = Boolean(resolvedSearchParams?.month || resolvedSearchParams?.year);
  const description = answer && !hasTimeMachineParams ? describeHomeSearchAnswer(answer) : HOME_STANDING_DESCRIPTION;
  const sharePath = buildHomeSharePath(resolvedSearchParams);
  const imageUrl = buildOgImageUrl(buildImageParams(resolvedSearchParams, reportData));

  return {
    title: HOME_TITLE,
    description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: buildCanonicalUrl(sharePath),
      title: HOME_TITLE,
      description,
      siteName: shortSiteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Whether: this week's guidance",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_TITLE,
      description,
      images: [imageUrl],
    },
    robots: hasTimeMachineParams
      ? {
        index: false,
        follow: true,
      }
      : undefined,
  };
};
