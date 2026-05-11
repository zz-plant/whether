import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";

export const metadata: Metadata = buildPageMetadata({
  title: "Posture guides — canonical on Weekly Brief",
  description: "Legacy route. The live posture now lives in the Weekly Brief.",
  path: "/posture",
  imageAlt: "Whether posture",
  imagePath: "/social/posture.svg",
});

metadata.robots = noindexRobots;

export default async function PosturePage() {
  permanentRedirect("/");
}
