import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";
import { findStageGuide, stageGuides } from "./stageGuides";
import { findStakeholderGuide, stakeholderGuides } from "./stakeholderGuides";
import { SecondarySurfaceStartBlock } from "../components/secondarySurfaceStartBlock";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ButtonLink } from "../components/ui/buttonLink";
import { ActionLink } from "../components/ui/actionLink";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides — translate the call for one team",
  description:
    "Downstream translation library for one function, leader, or company stage after Decision Tools has already narrowed the translation need.",
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

const buildStakeholderHref = (stakeholder: string) => ({
  pathname: "/guides",
  query: { stakeholder },
});

const buildStageHref = (stage: string) => ({
  pathname: "/guides",
  query: { stage },
});

type GuidesPageProps = {
  searchParams?: Promise<{
    stakeholder?: string;
    stage?: string;
    library?: string;
  }>;
};

export default async function GuidesPage({ searchParams }: GuidesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (!resolvedSearchParams?.stakeholder && !resolvedSearchParams?.stage && !resolvedSearchParams?.library) {
    redirect("/decide#guided-translation");
  }
  const selectedStakeholder = resolvedSearchParams?.stakeholder
    ? findStakeholderGuide(resolvedSearchParams.stakeholder)
    : undefined;
  const selectedStage = resolvedSearchParams?.stage
    ? findStageGuide(resolvedSearchParams.stage)
    : undefined;
  const showStageLibrary = resolvedSearchParams?.library === "stages" || Boolean(selectedStage);
  const featuredStakeholders = stakeholderGuides.filter((guide) =>
    featuredStakeholderSlugs.includes(guide.slug as (typeof featuredStakeholderSlugs)[number]),
  );
  const relatedStakeholderGuides = selectedStage
    ? stakeholderGuides
        .map((guide) => {
          const stageGuidance = guide.stageSpecificContent.find((entry) => entry.stageSlug === selectedStage.slug);

          if (!stageGuidance) {
            return null;
          }

          return {
            slug: guide.slug,
            title: guide.title,
            guidance: stageGuidance.guidance,
          };
        })
        .filter((guide): guide is { slug: string; title: string; guidance: string } => Boolean(guide))
    : [];

  return (
    <SecondaryPageShell>
      <SecondarySurfaceStartBlock surface="guides" />
      <SecondaryPageHeader
        eyebrow="Downstream translation library"
        title="Use this only when you already know who needs translation."
        description="Decision Tools should route you here after the question is narrowed to one team or one stage. Each guide translates the live call into bounded actions without reopening the whole brief."
        actions={(
          <>
            <ButtonLink href="/decide#guided-translation" variant="primary">
              Return to Decision Tools
            </ButtonLink>
            <ButtonLink href="#featured-owner-paths" variant="pill">
              Open pinned translations
            </ButtonLink>
          </>
        )}
      />

      {selectedStakeholder ? (
        <SecondaryPageSection
          className="scroll-mt-28"
          title={`Selected team translation: ${selectedStakeholder.title}`}
          description={selectedStakeholder.seoDescription}
          actions={(
            <>
              <ButtonLink href="/" variant="primary">Weekly Brief</ButtonLink>
              <ButtonLink href="/operations" variant="pill">Planning</ButtonLink>
              <ButtonLink href="/guides" variant="ghost">Clear selection</ButtonLink>
            </>
          )}
        >
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <article className="weather-surface space-y-3 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Positioning</p>
              <p className="text-sm font-semibold text-sky-200">{selectedStakeholder.tagline}</p>
              <p className="text-sm text-slate-200">{selectedStakeholder.positioning}</p>
              <ul className="space-y-2 text-sm text-slate-200">
                {selectedStakeholder.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span aria-hidden="true" className="text-sky-300">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="weather-surface space-y-3 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Stage-specific playbook</p>
              <ul className="space-y-3 text-sm text-slate-200">
                {selectedStakeholder.stageSpecificContent.map((entry) => {
                  const stage = findStageGuide(entry.stageSlug);
                  return (
                    <li key={entry.stageSlug} className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                      <p className="font-semibold text-slate-100">{stage?.title}</p>
                      <p className="mt-1">{entry.guidance}</p>
                      <ActionLink href={buildStageHref(entry.stageSlug)} variant="inline">
                        Open {stage?.title ?? "stage"} detail
                      </ActionLink>
                    </li>
                  );
                })}
              </ul>
              {selectedStakeholder.promotionAccelerator ? (
                <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {selectedStakeholder.promotionAccelerator.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {selectedStakeholder.promotionAccelerator.summary}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {selectedStakeholder.promotionAccelerator.signals.map((signal) => (
                      <li key={signal} className="flex gap-3">
                        <span aria-hidden="true" className="text-sky-300">•</span>
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          </div>
        </SecondaryPageSection>
      ) : null}

      {selectedStage ? (
        <SecondaryPageSection
          className="scroll-mt-28"
          title={`Selected stage translation: ${selectedStage.title}`}
          description={selectedStage.summary}
          actions={(
            <>
              <ButtonLink href="/" variant="primary">Weekly Brief</ButtonLink>
              <ButtonLink href="/operations" variant="pill">Planning</ButtonLink>
              <ButtonLink href="/guides" variant="ghost">Clear selection</ButtonLink>
            </>
          )}
        >
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <article className="weather-surface space-y-3 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Where this stage gets leverage</p>
              <p className="text-sm text-slate-200"><span className="font-semibold text-slate-100">Primary value:</span> {selectedStage.primaryValue}</p>
              <p className="text-sm text-slate-200"><span className="font-semibold text-slate-100">Best use:</span> {selectedStage.bestUse}</p>
              <ul className="space-y-2 text-sm text-slate-200">
                {selectedStage.whoBenefitsMost.map((entry) => (
                  <li key={entry} className="flex gap-3">
                    <span aria-hidden="true" className="text-sky-300">•</span>
                    <span>{entry}</span>
                  </li>
                ))}
              </ul>
              {selectedStage.failureMode ? (
                <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                  <span className="font-semibold">Failure mode:</span> {selectedStage.failureMode}
                </p>
              ) : null}
            </article>

            <article className="weather-surface space-y-3 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Role-specific guidance for this stage</p>
              <ul className="space-y-3 text-sm text-slate-200">
                {relatedStakeholderGuides.map((guide) => (
                  <li key={guide.slug} className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                    <p className="font-semibold text-slate-100">{guide.title}</p>
                    <p className="mt-1">{guide.guidance}</p>
                    <ActionLink href={buildStakeholderHref(guide.slug)} variant="inline">
                      Open {guide.title} translation
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </SecondaryPageSection>
      ) : null}

      <SecondaryPageSection
        className="scroll-mt-28"
        title="Featured owner paths"
        description="Pick the team or leader that already needs the call translated now."
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
              <ActionLink href={buildStakeholderHref(guide.slug)} variant="inline">
                Open {guide.title} guide
              </ActionLink>
            </article>
          ))}
        </div>
      </SecondaryPageSection>

      <details className="weather-panel weather-auto-chevron space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          {showStageLibrary ? "Browse the rest of the stage library" : `Open the rest of the stage library (${stageGuides.length})`}
        </summary>
        <div className="mt-4 space-y-4">
          {showStageLibrary ? (
            <div className="overflow-x-auto weather-surface px-4 py-4">
              <table className="w-full min-w-[620px] text-left text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase tracking-[0.12em] text-slate-400">
                    <th className="py-2 pr-4">Stage</th>
                    <th className="py-2 pr-4">Team size</th>
                    <th className="py-2 pr-4">Primary value</th>
                    <th className="py-2 pr-4">Operational leverage</th>
                    <th className="py-2">Narrative leverage</th>
                  </tr>
                </thead>
                <tbody>
                  {stageGuides.map((stage) => (
                    <tr key={stage.slug} className="border-b border-slate-800/80 align-top">
                      <td className="py-3 pr-4 font-semibold text-slate-100">{stage.title}</td>
                      <td className="py-3 pr-4">{stage.teamSize}</td>
                      <td className="py-3 pr-4">{stage.primaryValue}</td>
                      <td className="py-3 pr-4">{stage.operationalLeverage}</td>
                      <td className="py-3">{stage.narrativeLeverage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {stageGuides.map((stage) => (
              <article key={stage.slug} className="weather-surface space-y-2 px-4 py-4">
                <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                <p className="text-xs text-slate-300">{stage.primaryValue}</p>
                <ActionLink href={buildStageHref(stage.slug)} variant="inline">
                  Open stage guide
                </ActionLink>
              </article>
            ))}
          </div>
        </div>
      </details>

      {!showStageLibrary ? (
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={{ pathname: "/guides", query: { library: "stages" } }} variant="pill">
            Open full stage map
          </ButtonLink>
        </div>
      ) : null}
    </SecondaryPageShell>
  );
}
