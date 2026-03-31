import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { postureDefinitions } from "../../../lib/decisionDomainCatalog";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../../components/secondaryPageShell";
import { ButtonLink } from "../../components/ui/buttonLink";
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
  const { slug } = await params;
  const posture = postureDefinitions.find((entry) => entry.slug === slug);

  if (!posture) {
    notFound();
  }

  return (
    <SecondaryPageShell width="compact">
      <ButtonLink href="/posture" variant="pill" className="w-fit">
        Back to posture overview
      </ButtonLink>
      <SecondaryPageHeader
        title={posture.title}
        description={posture.summary}
        aside={(
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Trigger</p>
            <p className="text-sm text-slate-200">{posture.trigger}</p>
          </div>
        )}
      />
      <SecondaryPageSection title="What to do by default">
        <ul className="space-y-2 text-sm text-slate-300">
          {posture.defaults.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
}
