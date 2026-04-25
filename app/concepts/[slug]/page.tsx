import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";

type ConceptArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const runtime = "edge";
export const revalidate = 43200;

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Concept article redirect — Whether",
    description:
      "Concept detail pages now route back into Trust so operators stay inside the live weekly decision flow.",
    path: "/concepts",
    imageAlt: "Concept redirect",
  }),
  robots: noindexRobots,
};

export default async function ConceptArticlePage(_props: ConceptArticlePageProps) {
  permanentRedirect("/method");
}
