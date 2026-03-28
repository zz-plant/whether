import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbTrail } from "../components/breadcrumbTrail";
import { buildPageMetadata } from "../../lib/seo";
import { postureDefinitions } from "../../lib/decisionDomainCatalog";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { SecondaryPageHeader, SecondaryPageShell, SecondaryPageSection } from "../components/secondaryPageShell";
import { ButtonLink } from "../components/ui/buttonLink";
import { Tag } from "../components/ui/tag";

export const metadata: Metadata = buildPageMetadata({
  title: "Posture guides — routed from Weekly Brief",
  description: "Use the Weekly Brief for the live posture call; this page is a reference index for posture detail pages.",
  path: "/posture",
  imageAlt: "Whether posture",
  imagePath: "/social/posture.svg",
});

export default async function PosturePage() {
  const { snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/posture" });
  const { displayRegime } = snapshot;

  return (
    <SecondaryPageShell width="narrow">
      <BreadcrumbTrail items={[{ label: "Home", href: "/" }, { label: "Posture" }]} />
      <SecondaryPageHeader
        eyebrow="Operator reference (canonical posture hub)"
        title="Posture guides"
        description="Use this page as the in-product posture reference. For the live weekly call, start in Weekly Brief and run the core loop."
        actions={(
          <>
            <ButtonLink href="/" variant="primary">Start core loop: Weekly Brief</ButtonLink>
            <ButtonLink href="/signals" variant="ghost">Then Evidence</ButtonLink>
            <ButtonLink href="/decide" variant="ghost">Then Decision Tools</ButtonLink>
            <ButtonLink href="/operations" variant="ghost">Then Planning</ButtonLink>
          </>
        )}
        aside={(
          <div className="weather-surface space-y-3 px-4 py-4">
            <Tag tone="sky">Current weekly brief posture</Tag>
            <p className="text-sm font-semibold text-slate-100">{displayRegime.label}</p>
            <p className="text-xs text-slate-400">{displayRegime.canonicalRegime}</p>
          </div>
        )}
      />
      <SecondaryPageSection title="Reference postures" description="Use this page as the canonical posture reference surface.">
        <div className="grid gap-3 sm:grid-cols-3">
        {postureDefinitions.map((posture) => (
          <Link key={posture.slug} href={`/posture/${posture.slug}`} className="weather-panel space-y-2 px-4 py-4">
            <Tag tone="sky">Posture reference</Tag>
            <h2 className="text-lg font-semibold text-slate-100">{posture.title}</h2>
            <p className="text-sm text-slate-300">{posture.summary}</p>
          </Link>
        ))}
        </div>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
}
