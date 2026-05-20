import type { Metadata } from "next";
import {
  canonicalPositioningLine,
  websiteName,
} from "../seo";
import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { buildHomeSharePath, type HomeShareSearchParams as HomePageSearchParams } from "./homeSharePreview";
import { decisionTransmissionSearchDescription } from "./decisionTransmissionCopy";

export type { HomePageSearchParams };

const HOME_TITLE = "Weekly Macro Brief for Leadership Teams — Whether";
const HOME_DESCRIPTION =
  "Macro context for weekly operating decisions. Whether helps leadership teams pressure-test hiring, fundraising, spending, and expansion against current public macro signals.";

const buildImageParams = (searchParams: HomePageSearchParams | undefined) => {
  const params: Record<string, string> = { template: "report" };

  if (searchParams?.month) {
    params.month = searchParams.month;
  }

  if (searchParams?.year) {
    params.year = searchParams.year;
  }

  return params;
};

export const buildHomeMetadata = async (
  searchParams?: Promise<HomePageSearchParams>,
): Promise<Metadata> => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const hasTimeMachineParams = Boolean(resolvedSearchParams?.month || resolvedSearchParams?.year);
  const sharePath = buildHomeSharePath(resolvedSearchParams);
  const imageUrl = buildOgImageUrl(buildImageParams(resolvedSearchParams));

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
