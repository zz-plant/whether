import Link from "next/link";
import { findStageGuide, stageGuides } from "../../guides/stageGuides";
import { findStakeholderGuide, stakeholderGuides } from "../../guides/stakeholderGuides";

export type GuidedTranslationSearchParams = {
  stakeholder?: string;
  stage?: string;
  library?: string;
};

const defaultFeaturedStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
  "operations-leaders",
] as const;

export function buildGuidedTranslationHref(params?: GuidedTranslationSearchParams) {
  const query = new URLSearchParams();
  if (params?.stakeholder) {
    query.set("stakeholder", params.stakeholder);
  }
  if (params?.stage) {
    query.set("stage", params.stage);
  }
  if (params?.library) {
    query.set("library", params.library);
  }

  const search = query.toString();
  return search ? `/resolve?${search}#guided-translation` : "/resolve#guided-translation";
}

export function resolveGuidedTranslationState(params?: GuidedTranslationSearchParams) {
  const selectedStakeholder = params?.stakeholder
    ? findStakeholderGuide(params.stakeholder)
    : undefined;
  const selectedStage = params?.stage
    ? findStageGuide(params.stage)
    : undefined;
  const featuredStakeholders = stakeholderGuides.filter((guide) =>
    defaultFeaturedStakeholderSlugs.includes(guide.slug as (typeof defaultFeaturedStakeholderSlugs)[number]),
  );
  const showStageLibrary = params?.library === "stages" || Boolean(selectedStage);
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

  return {
    featuredStakeholders,
    relatedStakeholderGuides,
    selectedStage,
    selectedStakeholder,
    showStageLibrary,
  };
}

export function GuidedTranslationPanels({
  searchParams,
}: {
  searchParams?: GuidedTranslationSearchParams;
}) {
  const {
    featuredStakeholders,
    relatedStakeholderGuides,
    selectedStage,
    selectedStakeholder,
    showStageLibrary,
  } = resolveGuidedTranslationState(searchParams);
  const hasActiveTranslationSelection = Boolean(
    selectedStakeholder || selectedStage || showStageLibrary,
  );

  if (!hasActiveTranslationSelection) {
    return null;
  }

  return (
    <section id="guided-translation-results" className="space-y-4" aria-label="Selected view details">
      {selectedStakeholder ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">Team view</p>
                <h3 className="text-lg font-semibold text-slate-100">{selectedStakeholder.title}</h3>
              </div>
              <Link
                href={buildGuidedTranslationHref(selectedStage ? { stage: selectedStage.slug } : undefined)}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100"
              >
                Clear team choice
              </Link>
            </div>
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

          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">How this changes by stage</p>
            <ul className="space-y-3 text-sm text-slate-200">
              {selectedStakeholder.stageSpecificContent.map((entry) => {
                const stage = findStageGuide(entry.stageSlug);
                return (
                  <li key={entry.stageSlug} className="rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                    <p className="font-semibold text-slate-100">{stage?.title}</p>
                    <p className="mt-1">{entry.guidance}</p>
                    <Link
                      href={buildGuidedTranslationHref({ stakeholder: selectedStakeholder.slug, stage: entry.stageSlug })}
                      className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
                    >
                      Open {stage?.title ?? "stage"} view
                    </Link>
                  </li>
                );
              })}
            </ul>
            {selectedStakeholder.promotionAccelerator ? (
              <div className="rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3">
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
      ) : null}

      {selectedStage ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">Stage view</p>
                <h3 className="text-lg font-semibold text-slate-100">{selectedStage.title}</h3>
              </div>
              <Link
                href={buildGuidedTranslationHref(selectedStakeholder ? { stakeholder: selectedStakeholder.slug } : undefined)}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100"
              >
                Clear stage choice
              </Link>
            </div>
            <p className="text-sm text-slate-200">{selectedStage.summary}</p>
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
              <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                <span className="font-semibold">Failure mode:</span> {selectedStage.failureMode}
              </p>
            ) : null}
          </article>

          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">How each team should read this stage</p>
            <ul className="space-y-3 text-sm text-slate-200">
              {relatedStakeholderGuides.map((guide) => (
                <li key={guide.slug} className="rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                  <p className="font-semibold text-slate-100">{guide.title}</p>
                  <p className="mt-1">{guide.guidance}</p>
                  <Link
                    href={buildGuidedTranslationHref({ stakeholder: guide.slug, stage: selectedStage.slug })}
                    className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
                  >
                    Open {guide.title} view
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {featuredStakeholders.map((guide) => (
          <article key={guide.slug} className="weather-hub-card space-y-2 px-4 py-4">
            <h3 className="text-base font-semibold text-slate-100">{guide.title}</h3>
            <p className="text-sm text-slate-300">{guide.tagline}</p>
            <p className="text-sm text-slate-200">{guide.positioning}</p>
            <Link
              href={buildGuidedTranslationHref({ stakeholder: guide.slug, stage: selectedStage?.slug })}
              className="inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
            >
              Open {guide.title} view
            </Link>
          </article>
        ))}
      </div>

      <details className="weather-panel weather-auto-chevron space-y-3 px-5 py-5">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          {showStageLibrary ? "Browse the other stages" : `Open the other stages (${stageGuides.length})`}
        </summary>
        <div className="mt-4 space-y-4">
          {showStageLibrary ? (
            <div className="overflow-x-auto weather-hub-card px-4 py-4">
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
              <article key={stage.slug} className="weather-hub-card space-y-2 px-4 py-4">
                <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                <p className="text-xs text-slate-300">{stage.primaryValue}</p>
                <Link
                  href={buildGuidedTranslationHref({ stage: stage.slug, stakeholder: selectedStakeholder?.slug })}
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
                >
                  Open stage view
                </Link>
              </article>
            ))}
          </div>
          {!showStageLibrary ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildGuidedTranslationHref({ stakeholder: selectedStakeholder?.slug, library: "stages" })}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100"
              >
                Open full stage list
              </Link>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
