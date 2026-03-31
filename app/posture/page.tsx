import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";

export const metadata: Metadata = buildPageMetadata({
  title: "Posture guides — canonical on Weekly Brief",
  description: "Posture is now canonical on Weekly Brief. This compatibility route redirects back into the live weekly call.",
  path: "/posture",
  imageAlt: "Whether posture",
  imagePath: "/social/posture.svg",
});

metadata.robots = noindexRobots;

export default async function PosturePage() {
  permanentRedirect("/");
}
