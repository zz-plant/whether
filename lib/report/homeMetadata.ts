import type { Metadata } from "next";
import { websiteName } from "../seo";
import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { buildHomeSharePath, type HomeShareSearchParams as HomePageSearchParams } from "./homeSharePreview";
import { decisionTransmissionSearchDescription } from "./decisionTransmissionCopy";
import { type HomeReportData } from "./homeBriefModel";

export type { HomePageSearchParams };

// Keeps "macro" (the search term people actually type) while leading with the
// ruled stance noun and naming the operator this is built for rather than
// "leadership teams", which describes a buying committee nobody has met yet.
const HOME_TITLE = "Weekly Operating Call for Startup Leaders";
const HOME_DESCRIPTION = decisionTransmissionSearchDescription;

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
): Promise<Metadata> => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const hasTimeMachineParams = Boolean(resolvedSearchParams?.month || resolvedSearchParams?.year);
  const sharePath = buildHomeSharePath(resolvedSearchParams);
  const imageUrl = buildOgImageUrl(buildImageParams(resolvedSearchParams, reportData));

  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: buildCanonicalUrl(sharePath),
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      siteName: websiteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Whether weekly operating posture preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
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
