import Link from "next/link";
import { findStageGuide, stageGuides } from "../../guides/stageGuides";
import { findStakeholderGuide, stakeholderGuides } from "../../guides/stakeholderGuides";
import { HearingBubbles } from "../../components/ui/hearingBubbles";
import { ActionLink } from "../../components/ui/actionLink";

export type GuidedTranslationSearchParams = {
  stakeholder?: string;
  stage?: string;
  library?: string;
};

const defaultFeaturedStakeholderSlugs = [
  "founders-ceos",
  "heads-of-product",
  "finance-leaders",
] as const;

type FeaturedStakeholderSlug = (typeof defaultFeaturedStakeholderSlugs)[number];

function isFeaturedStakeholderSlug(slug: string): slug is FeaturedStakeholderSlug {
  return defaultFeaturedStakeholderSlugs.some((candidate) => candidate === slug);
}

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
  const { selectedStakeholder, selectedStage, showStageLibrary } = resolveGuidedTranslationState(params);
  // Results sit before the browse disclosure. A selection should land on its
  // guidance; clearing the last valid selection returns to the browse controls.
  const anchor = selectedStakeholder || selectedStage || showStageLibrary
    ? "guided-translation-results"
    : "guided-translation";
  return `/resources${search ? `?${search}` : ""}#${anchor}`;
}

export function resolveGuidedTranslationState(params?: GuidedTranslationSearchParams) {
  const selectedStakeholder = params?.stakeholder
    ? findStakeholderGuide(params.stakeholder)
    : undefined;
  const selectedStage = params?.stage
    ? findStageGuide(params.stage)
    : undefined;
  const featuredStakeholders = selectedStakeholder
    ? stakeholderGuides.filter((guide) => guide.slug !== selectedStakeholder.slug)
    : stakeholderGuides.filter((guide) => isFeaturedStakeholderSlug(guide.slug));
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

/**
 * The thread a role selection opens: what the reader may hear from that group,
 * and what the published line says back.
 *
 * The badge is initials, once, and `aria-hidden`: the heading above names the
 * group, and a drawn face on a decision page would be ornament the page has to
 * carry. The bubbles are `HearingBubbles` (`app/components/ui/hearingBubbles`),
 * the same pair the homepage section prints.
 */
function HearingThread({ guide }: { guide: (typeof stakeholderGuides)[number] }) {
  return (
    <article
      className="weather-hub-card px-4 py-4 @4xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] @4xl:gap-6"
      aria-labelledby="guided-hearing-heading"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] text-xs font-semibold uppercase text-slate-300"
        >
          {guide.avatar}
        </span>
        <div className="space-y-1">
          <p id="guided-hearing-heading" className="type-eyebrow">What you may be hearing</p>
          <p className="max-w-prose text-xs text-slate-400">
            The pushback, takes and questions that come up in the room, and the reply each line gives. Which reach you depends on who you answer to.
          </p>
        </div>
      </div>
      <HearingBubbles entries={guide.hearing} className="max-w-2xl" />
    </article>
  );
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
    <section id="guided-translation-results" className="@container space-y-4" aria-label="Selected view details">
      {selectedStakeholder ? (
        <>
          <div className="weather-switch gap-3 [--col-min:22rem]">
            <article className="weather-hub-card space-y-3 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-100">{selectedStakeholder.title}</h3>
                <ActionLink
                  href={buildGuidedTranslationHref(selectedStage ? { stage: selectedStage.slug } : undefined)}
                  variant="pill"
                className="justify-center"
                >
                  Clear team choice
                </ActionLink>
              </div>
              <p className="text-sm font-semibold text-slate-100">{selectedStakeholder.tagline}</p>
              <ul className="space-y-2 text-sm text-slate-200">
                {selectedStakeholder.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span aria-hidden="true" className="text-slate-500">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="weather-hub-card space-y-3 px-4 py-4">
              <p className="type-eyebrow">How this changes by stage</p>
              <ul className="space-y-3 text-sm text-slate-200">
                {selectedStakeholder.stageSpecificContent.map((entry) => {
                  const stage = findStageGuide(entry.stageSlug);
                  return (
                    <li key={entry.stageSlug} className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] px-3 py-3">
                      <p className="font-semibold text-slate-100">{stage?.title}</p>
                      <p className="mt-1">{entry.guidance}</p>
                      <Link
                        href={buildGuidedTranslationHref({ stakeholder: selectedStakeholder.slug, stage: entry.stageSlug })}
                        className="weather-hit mt-2 inline-flex items-center text-xs font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
                      >
                        Open {stage?.title ?? "stage"} view
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </article>
          </div>
          <HearingThread guide={selectedStakeholder} />
        </>
      ) : null}

      {selectedStage ? (
        <div className="weather-switch gap-3 [--col-min:22rem]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-100">{selectedStage.title}</h3>
              <ActionLink
                href={buildGuidedTranslationHref(selectedStakeholder ? { stakeholder: selectedStakeholder.slug } : undefined)}
                variant="pill"
                className="justify-center"
              >
                Clear stage choice
              </ActionLink>
            </div>
            <p className="text-sm text-slate-200">{selectedStage.summary}</p>
            <p className="text-sm text-slate-200"><span className="font-semibold text-slate-100">Most useful for:</span> {selectedStage.primaryValue}</p>
            <p className="text-sm text-slate-200"><span className="font-semibold text-slate-100">Best use:</span> {selectedStage.bestUse}</p>
            <ul className="space-y-2 text-sm text-slate-200">
              {selectedStage.whoBenefitsMost.map((entry) => (
                <li key={entry} className="flex gap-3">
                  <span aria-hidden="true" className="text-slate-500">•</span>
                  <span>{entry}</span>
                </li>
              ))}
            </ul>
            {selectedStage.failureMode ? (
              <p className="weather-caveat-band weather-caveat-mark px-3 py-2.5 text-sm">
                <span className="font-semibold">Where it goes wrong:</span> {selectedStage.failureMode}
              </p>
            ) : null}
          </article>

          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">How each team should read this stage</p>
            <ul className="space-y-3 text-sm text-slate-200">
              {relatedStakeholderGuides.map((guide) => (
                <li key={guide.slug} className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] px-3 py-3">
                  <p className="font-semibold text-slate-100">{guide.title}</p>
                  <p className="mt-1">{guide.guidance}</p>
                  <Link
                    href={buildGuidedTranslationHref({ stakeholder: guide.slug, stage: selectedStage.slug })}
                    className="weather-hit mt-2 inline-flex items-center text-xs font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200"
                  >
                    Open {guide.title} view
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}

      <div className="weather-grid gap-4 [--col-min:18rem] [--grid-max:2]">
        {featuredStakeholders.map((guide) => (
          <article key={guide.slug} className="weather-hub-card space-y-2 px-4 py-4">
            <h3 className="text-base font-semibold text-slate-100">{guide.title}</h3>
            <p className="text-sm text-slate-300">{guide.tagline}</p>
            <Link
              href={buildGuidedTranslationHref({ stakeholder: guide.slug, stage: selectedStage?.slug })}
              className="weather-hit inline-flex items-center text-xs font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200"
            >
              Open {guide.title} view
            </Link>
          </article>
        ))}
      </div>

      <details className="weather-panel weather-auto-chevron space-y-3 px-5 py-5">
        <summary data-chevron className="cursor-pointer list-none text-sm font-semibold text-sky-200">
          {showStageLibrary ? "Browse the other stages" : `Open the other stages (${stageGuides.length})`}
        </summary>
        <div className="mt-4 space-y-4">
          {showStageLibrary ? (
            <div className="overflow-x-auto weather-hub-card px-4 py-4">
              <table className="w-full min-w-[420px] text-left text-sm text-slate-200">
                <thead>
                  <tr className="border-b border-[color:var(--border-default)] type-eyebrow">
                    <th className="py-2 pr-4">Stage</th>
                    <th className="py-2 pr-4">Team size</th>
                    <th className="py-2">Most useful for</th>
                  </tr>
                </thead>
                <tbody>
                  {stageGuides.map((stage) => (
                    <tr key={stage.slug} className="border-b border-[color:var(--border-subtle)] align-top">
                      <td className="py-3 pr-4 font-semibold text-slate-100">{stage.title}</td>
                      <td className="py-3 pr-4">{stage.teamSize}</td>
                      <td className="py-3">{stage.primaryValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="weather-grid gap-3 [--col-min:18rem] [--grid-max:2]">
            {stageGuides.map((stage) => (
              <article key={stage.slug} className="weather-hub-card space-y-2 px-4 py-4">
                <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                <p className="text-xs text-slate-300">{stage.primaryValue}</p>
                <Link
                  href={buildGuidedTranslationHref({ stage: stage.slug, stakeholder: selectedStakeholder?.slug })}
                  className="weather-hit inline-flex items-center text-xs font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200"
                >
                  Open stage view
                </Link>
              </article>
            ))}
          </div>
          {!showStageLibrary ? (
            <div className="flex flex-wrap gap-2">
              <ActionLink
                href={buildGuidedTranslationHref({ stakeholder: selectedStakeholder?.slug, library: "stages" })}
                variant="pill"
                className="justify-center"
              >
                Open full stage list
              </ActionLink>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
