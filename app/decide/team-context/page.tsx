import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Team context profile — moved into planning workflow",
  description: "This compatibility route now returns operators to Planning instead of maintaining a separate personalization branch.",
  path: "/decide/team-context",
  imageAlt: "Team context profile",
});

metadata.robots = noindexRobots;

export default async function TeamContextPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  await searchParams;
  permanentRedirect("/operations#ops-monthly-action-summary");
}
