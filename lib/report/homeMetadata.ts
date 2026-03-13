import type { Metadata } from "next";
import { siteUrl } from "../siteUrl";
import {
  buildCanonicalUrl,
  buildSocialImageUrl,
  canonicalPositioningLine,
} from "../seo";
import {
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../timeMachine/timeMachineSelection";

export type HomePageSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

const HOME_TITLE = "Startup market weather, weekly posture, and founder decisions — Whether";
const HOME_DESCRIPTION = `${canonicalPositioningLine} Weekly answer: what to change now across hiring, fundraising, and runway.`;

export const buildHomeMetadata = async (
  searchParams?: Promise<HomePageSearchParams>,
): Promise<Metadata> => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selection = resolveTimeMachineSelection(resolvedSearchParams);
  const requestedSelection = parseTimeMachineRequest(resolvedSearchParams);
  const openGraphImageUrl = new URL("/api/og", siteUrl);
  openGraphImageUrl.searchParams.set("template", "report");

  if (selection) {
    openGraphImageUrl.searchParams.set("month", String(selection.month));
    openGraphImageUrl.searchParams.set("year", String(selection.year));
  } else if (requestedSelection) {
    openGraphImageUrl.searchParams.set("month", String(requestedSelection.month));
    openGraphImageUrl.searchParams.set("year", String(requestedSelection.year));
    openGraphImageUrl.searchParams.set("status", "invalid");
  }

  const hasTimeMachineParams = Boolean(resolvedSearchParams?.month || resolvedSearchParams?.year);
  const canonicalUrl = buildCanonicalUrl("/");
  const socialImageUrl = buildSocialImageUrl();

  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      siteName: "Whether — Startup Market Weather & Weekly Operating Posture",
      images: [
        {
          url: openGraphImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: "Whether Report Weekly briefing Open Graph",
        },
        {
          url: socialImageUrl,
          width: 1200,
          height: 630,
          alt: "Whether Report Weekly briefing Open Graph",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [openGraphImageUrl.toString(), socialImageUrl],
    },
    robots: hasTimeMachineParams
      ? {
        index: false,
        follow: true,
      }
      : undefined,
  };
};
