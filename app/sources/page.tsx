import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Sources and freshness — Whether",
  description: "Current source coverage, timestamps, and citation-ready provenance for this week's posture call.",
  path: "/sources",
  imageAlt: "Whether sources and freshness overview",
});

export default async function SourcesPage() {
  redirect("/method#sources-freshness");
}