import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { postureDefinitions } from "../../../lib/decisionDomainCatalog";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";
type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return postureDefinitions.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const posture = postureDefinitions.find((entry) => entry.slug === slug);

  if (!posture) {
    return {};
  }

  return {
    ...buildPageMetadata({
      title: `${posture.title} posture`,
      description: posture.summary,
      path: `/posture/${posture.slug}`,
      imageAlt: `${posture.title} posture`,
    }),
    robots: noindexRobots,
  };
}

export default async function PostureDetailPage({ params }: { params: Promise<Params> }) {
  await params;
  permanentRedirect("/");
}
