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
  title: "Role & Stage Guides — Whether",
  description:
    "Downstream role and stage helper guides for translating the weekly brief into bounded team decisions and review-ready operating calls.",
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
        eyebrow="Guides overview"
        title="Pick the fastest guide for this week&apos;s operating decision"
        description="Use stakeholder guides when you need role-specific actions. Use stage guides when you need company-maturity context for pacing, spend, and planning discipline."
        actions={(
          <>
            <ButtonLink href="/" variant="primary">
              Weekly Brief
            </ButtonLink>
            <ButtonLink href="/method" variant="pill">
              Trust
            </ButtonLink>
          </>
        )}
      />

      <SecondaryPageSection
        title="Stakeholder guides"
        description="Role-level pages with bounded actions you can use in leadership meetings and planning reviews."
        actions={(
          <ActionLink href="/guides/stage" variant="inline">
            Browse by company stage
          </ActionLink>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
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

      <SecondaryPageSection
        title="Company stage guides"
        description="Stage-level pages to calibrate operating intensity and planning cadence as coordination cost increases."
      >
        <ul className="space-y-2 text-sm text-slate-200">
          {stageGuides.map((stage) => (
            <li key={stage.slug} className="weather-surface flex items-center justify-between gap-4 px-4 py-3">
              <span>
                <span className="font-semibold text-slate-100">{stage.title}</span> — {stage.primaryValue}
              </span>
              <ActionLink href={`/guides/stage/${stage.slug}`} variant="inline">
                Open
              </ActionLink>
            </li>
          ))}
        </ul>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
}
