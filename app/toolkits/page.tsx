import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { noindexRobots } from "../../lib/seo/indexationPolicy";
import { buildToolkitLibraryHref } from "../resolve/components/toolkitLibraryPanels";

export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: "Toolkits — task tools",
  description: "Legacy route for task tools. Redirects to the toolkit library inside Decision Tools.",
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
