import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { noindexRobots } from "../../../../lib/seo/indexationPolicy";

type Params = { slug: string };

export const runtime = "edge";
export const revalidate = 86400;

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Failure mode redirect",
    description:
      "Failure-mode detail pages now route back into the Trust workflow so operators stay inside the live weekly decision flow.",
    path: "/learn/failure-modes",
    imageAlt: "Failure mode redirect",
  }),
  robots: noindexRobots,
};

export default async function FailureModeDetailPage(_props: { params: Promise<Params> }) {
  permanentRedirect("/trust#revisit-call");
}
