import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";

export const runtime = "edge";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Failure Modes library",
    description:
      "Failure-mode diagnostics now route back into the Trust workflow so operators stay inside the weekly decision loop.",
    path: "/learn/failure-modes",
    imageAlt: "Failure mode redirect",
  }),
  robots: noindexRobots,
};

export default async function FailureModesPage() {
  permanentRedirect("/trust#revisit-call");
}
