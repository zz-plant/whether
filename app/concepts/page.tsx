import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";

export const dynamic = "force-static";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Product management canon in macro context — Whether",
    description:
      "Legacy route. Concept browsing now lives under Decision Tools.",
    path: "/concepts",
    imageAlt: "Product management concept timeline with macro context",
  }),
  robots: noindexRobots,
};

export default async function ProductConceptTimelinePage() {
  permanentRedirect("/method");
}
