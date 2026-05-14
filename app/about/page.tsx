import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "About Whether",
    description: "About Whether now lives under Trust.",
    path: "/about",
    imageAlt: "About Whether redirect",
  }),
  robots: noindexRobots,
};

export default async function AboutPage() {
  permanentRedirect("/trust");
}
