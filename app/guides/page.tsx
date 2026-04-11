import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";
import { buildGuidedTranslationHref, type GuidedTranslationSearchParams } from "../decide/components/guidedTranslationPanels";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides — team-specific help",
  description:
    "Compatibility route for team-specific help after Decision Tools has already narrowed the question.",
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
