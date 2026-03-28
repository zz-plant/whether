import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { stageGuides } from "./stageGuides";
import { stakeholderGuides } from "./stakeholderGuides";
import { SecondarySurfaceStartBlock } from "../components/secondarySurfaceStartBlock";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ButtonLink } from "../components/ui/buttonLink";
import { ActionLink } from "../components/ui/actionLink";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides — translate the call for one team",
  description:
    "Translate the weekly brief into bounded calls for one function, leader, or company stage after the main decision is already set.",
  path: "/guides",
  imageAlt: "Whether guides overview",
  imagePath: "/social/guides.svg",
});

const featuredStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
  "operations-leaders",
] as const;

export default function GuidesPage() {
  const featuredStakeholders = stakeholderGuides.filter((guide) =>
    featuredStakeholderSlugs.includes(guide.slug as (typeof featuredStakeholderSlugs)[number]),
  );

  return (
    <SecondaryPageShell>
      <SecondarySurfaceStartBlock surface="guides" />
      <SecondaryPageHeader
        eyebrow="Translation library"
        title="Translate this week's call for one team or stage"
        description="Start with the owner or stage that needs a tailored operating frame right now. Each guide translates the live call into bounded actions without reopening the whole brief."
        actions={(
          <>
            <ButtonLink href="#featured-owner-paths" variant="primary">
              Open featured paths
            </ButtonLink>
            <ButtonLink href="/decide" variant="pill">
              Decision Tools
            </ButtonLink>
          </>
        )}
      />

      <SecondaryPageSection
        className="scroll-mt-28"
        title="Featured owner paths"
        description="Pick the team or leader that needs the call translated now."
        actions={(
          <ActionLink href="/decide#guided-translation" variant="inline">
            Need help choosing a path?
          </ActionLink>
        )}
      >
        <div id="featured-owner-paths" className="grid gap-4 md:grid-cols-2">
          {featuredStakeholders.map((guide) => (
            <article key={guide.slug} className="weather-surface space-y-2 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{guide.title}</h3>
              <p className="text-sm text-slate-300">{guide.tagline}</p>
              <p className="text-sm text-slate-200">{guide.positioning}</p>
              <ActionLink href={`/guides/${guide.slug}`} variant="inline">
                Open {guide.title} guide
              </ActionLink>
            </article>
          ))}
        </div>
      </SecondaryPageSection>

      <details className="weather-panel space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Open the rest of the stage library ({stageGuides.length})
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {stageGuides.map((stage) => (
            <article key={stage.slug} className="weather-surface space-y-2 px-4 py-4">
              <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
              <p className="text-xs text-slate-300">{stage.primaryValue}</p>
              <ActionLink href={`/guides/stage/${stage.slug}`} variant="inline">
                Open stage guide
              </ActionLink>
            </article>
          ))}
        </div>
      </details>
    </SecondaryPageShell>
  );
}
