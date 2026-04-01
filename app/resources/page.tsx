import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/pageMetadata";
import { noindexRobots } from "../../lib/seo/indexationPolicy";

export const metadata: Metadata = buildPageMetadata({
  title: "Resources — deeper governance artifacts",
  description:
    "Downstream governance artifact library for operators who need board-ready material after Planning is already set.",
  path: "/resources",
  imageAlt: "Whether resources hub",
  imagePath: "/social/resources.svg",
});

metadata.robots = noindexRobots;

export default function ResourcesPage() {
  permanentRedirect("/operations#ops-export-briefs");
}
