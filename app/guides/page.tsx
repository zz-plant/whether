import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";
import { buildGuidedTranslationHref, type GuidedTranslationSearchParams } from "../decide/components/guidedTranslationPanels";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides — translate the call for one team",
  description:
    "Downstream translation library for one function, leader, or company stage after Decision Tools has already narrowed the translation need.",
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
