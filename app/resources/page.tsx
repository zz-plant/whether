import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/pageMetadata";
import { noindexRobots } from "../../lib/seo/indexationPolicy";

export const metadata: Metadata = buildPageMetadata({
  title: "Resources — board-ready exports",
  description:
    "Legacy route for board-ready exports. Redirects to Planning.",
  path: "/resources",
  imageAlt: "Whether resources hub",
  imagePath: "/social/resources.svg",
});

metadata.robots = noindexRobots;

export default function ResourcesPage() {
  permanentRedirect("/operations#ops-export-briefs");
}
