import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Posture guide redirect — Whether",
    description: "Legacy posture detail URLs now route back into the canonical Weekly Brief.",
    path: "/posture",
    imageAlt: "Whether posture redirect",
    imagePath: "/social/posture.svg",
  }),
  robots: noindexRobots,
};

export default async function PostureDetailPage() {
  permanentRedirect("/");
}
