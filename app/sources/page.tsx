import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Sources and freshness — Whether",
  description: "Current source coverage, timestamps, and citation-ready provenance for this week's posture call.",
  path: "/sources",
  imageAlt: "Whether sources and freshness overview",
});

export default function SourcesPage() {
  permanentRedirect("/method#sources-freshness");
}
