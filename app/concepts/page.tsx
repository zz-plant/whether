import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";

export const dynamic = "force-static";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Product management canon in macro context — Whether",
    description:
      "Concept browsing now routes back into Decision Tools so operators stay inside the weekly decision loop.",
    path: "/concepts",
    imageAlt: "Product management concept timeline with macro context",
  }),
  robots: noindexRobots,
};

export default async function ProductConceptTimelinePage() {
  permanentRedirect("/decide#guided-translation");
}
