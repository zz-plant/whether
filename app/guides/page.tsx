import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";
import { buildGuidedTranslationHref, type GuidedTranslationSearchParams } from "../decide/components/guidedTranslationPanels";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides — team-specific help",
  description:
    "Legacy route for team-specific help. Redirects to the matching path in Decision Tools.",
  path: "/guides",
  imageAlt: "Whether guides overview",
  imagePath: "/social/guides.svg",
});

metadata.robots = noindexRobots;

type GuidesPageProps = {
  searchParams?: Promise<GuidedTranslationSearchParams>;
};

export default async function GuidesPage({ searchParams }: GuidesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  permanentRedirect(buildGuidedTranslationHref(resolvedSearchParams));
}
