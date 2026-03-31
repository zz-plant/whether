import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";
import { buildToolkitLibraryHref } from "../decide/components/toolkitLibraryPanels";

export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: "Toolkits — supporting instruments for Decision Tools",
  description: "Downstream toolkit library under Decision Tools. Use it only after the question has already been narrowed to a runnable instrument.",
  path: "/toolkits",
  imageAlt: "Whether toolkits",
});

metadata.robots = noindexRobots;

export default async function ToolkitsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  permanentRedirect(buildToolkitLibraryHref(resolvedSearchParams?.q));
}
