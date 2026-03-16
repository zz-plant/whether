import type { Metadata } from "next";
import {
  canonicalPositioningLine,
} from "../seo";
import {
  loadHomeSharePreview,
  type HomeShareSearchParams as HomePageSearchParams,
} from "./homeSharePreview";

export type { HomePageSearchParams };

const HOME_TITLE = "Startup market weather, weekly posture, and founder decisions — Whether";
const HOME_DESCRIPTION = `${canonicalPositioningLine} Weekly answer: what to change now across hiring, fundraising, and runway.`;

type HomeMetadataDependencies = {
  loadHomeSharePreview: typeof loadHomeSharePreview;
};

const defaultDependencies: HomeMetadataDependencies = {
  loadHomeSharePreview,
};

export const buildHomeMetadata = async (
  searchParams?: Promise<HomePageSearchParams>,
  dependencies: Partial<HomeMetadataDependencies> = {},
): Promise<Metadata> => {
  const resolvedDependencies = {
    ...defaultDependencies,
    ...dependencies,
  } satisfies HomeMetadataDependencies;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const hasTimeMachineParams = Boolean(resolvedSearchParams?.month || resolvedSearchParams?.year);
  const preview = await resolvedDependencies.loadHomeSharePreview(resolvedSearchParams);

  return {
    title: preview.title || HOME_TITLE,
    description: preview.description || HOME_DESCRIPTION,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: preview.url,
      title: preview.title || HOME_TITLE,
      description: preview.description || HOME_DESCRIPTION,
      siteName: "Whether — Startup Market Weather & Weekly Operating Posture",
      images: [
        {
          url: preview.imageUrl,
          width: 1200,
          height: 630,
          alt: preview.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: preview.title || HOME_TITLE,
      description: preview.description || HOME_DESCRIPTION,
      images: [preview.imageUrl],
    },
    robots: hasTimeMachineParams
      ? {
        index: false,
        follow: true,
      }
      : undefined,
  };
};
