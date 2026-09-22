import { formatSignedDeltaOrNull } from "../../../lib/formatters";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionLink } from "../../components/ui/actionLink";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { Tag } from "../../components/ui/tag";
import { BoundedValue } from "../../components/ui/boundedValue";
import { createBreadcrumbTrail } from "../../../lib/navigation/breadcrumbs";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  buildOgImageUrl,
  buildPageMetadata,
  organizationName,
} from "../../../lib/seo";
import { buildAuthorSchema, buildPublisherSchema, publisherAuthor } from "../../../lib/publisher";
import {
  buildPublishedBriefEmailUpdate,
  buildPublishedBriefPath,
  buildPublishedBriefSlackUpdate,
  findAdjacentPublishedBriefs,
  findPublishedBrief,
  labelForArea,
  publishedBriefDisplay,
  publishedBriefStaticParams,
  type PublishedBrief,
  type PublishedRuleLine,
} from "../../../lib/report/publishedBriefs";
import { PublishedBriefCopyControls } from "./publishedBriefCopyControls";
import { ThresholdLadder } from "../../components/illustrations/ThresholdLadder";
import { RegimeGlyph } from "../../components/illustrations/RegimeGlyph";
import { RuleLines } from "../../components/boundedRuleLines";
import {
  buildBoundedConditionRails,
  parenthesizePointsToLine,
  toThresholdDistance,
  type RuleThresholdDistance,
} from "../../../lib/report/operatingCalls";

/**
 * The nearest of a decision's lines to the frozen reading, for the distance
 * column. Mirrors what `resolveDecisionLaneState` computes for the live page,
 * on the record's own numbers rather than today's.
 */
const nearestLine = (
  lines: readonly PublishedRuleLine[] | undefined,
  scores: NonNullable<PublishedBrief["scores"]>,
): RuleThresholdDistance | undefined =>
  (lines ?? [])
    .map((line) => toThresholdDistance(line, scores))
    .sort((left, right) => left.pointsToLine - right.pointsToLine)[0];

const formatDelta = formatSignedDeltaOrNull;

type Params = { week: string };

/**
 * Published weeks are frozen records. They are generated once and never revalidated,
 * so a brief cited in a meeting still says what it said on the day.
 */
export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return publishedBriefStaticParams;
}

const briefTitle = (brief: PublishedBrief) =>
  `${publishedBriefDisplay(brief).conditions}: the call for the week of ${brief.recordDateLabel}`;

const briefDescription = (brief: PublishedBrief) => `${brief.summary} What changed: ${brief.whatChanged}`;

const briefImageUrl = (brief: PublishedBrief) =>
  buildOgImageUrl({ template: "brief-chart", week: brief.slug, posture: brief.postureLabel, regime: brief.regime });

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { week } = await params;
  const brief = findPublishedBrief(week);

  if (!brief) return {};

  const metadata = buildPageMetadata({
    title: briefTitle(brief),
    description: briefDescription(brief),
    path: buildPublishedBriefPath(brief.slug),
    imageAlt: `Whether's call for the week of ${brief.recordDateLabel}`,
    imageParams: { template: "brief-chart", week: brief.slug, posture: brief.postureLabel, regime: brief.regime },
  });

  metadata.authors = [{ name: publisherAuthor.name, url: buildCanonicalUrl("/about") }];
  metadata.openGraph = {
    ...metadata.openGraph,
    type: "article",
    publishedTime: brief.publishedAt,
    modifiedTime: brief.publishedAt,
    authors: [buildCanonicalUrl("/about")],
  };

  return metadata;
}

import { SubscribeForm } from "../../components/SubscribeForm";
import { JsonLdScript } from "../../components/jsonLdScript";
import { compositeSignalScales, signalReadingMeaning } from "../../../lib/report/signalTranslations";

export default async function PublishedBriefPage({ params }: { params: Promise<Params> }) {
  const { week } = await params;
  const brief = findPublishedBrief(week);

  if (!brief) notFound();

  const display = publishedBriefDisplay(brief);
  const canonicalUrl = buildCanonicalUrl(buildPublishedBriefPath(brief.slug));
  const { previous, next } = findAdjacentPublishedBriefs(brief.slug);
  const slackUpdate = buildPublishedBriefSlackUpdate(brief);
  const emailUpdate = buildPublishedBriefEmailUpdate(brief);

  // The record's readings and corridor, drawn. Records frozen before the lines
  // were data carry neither and fall back to the sentences below.
  const corridorDecision = brief.decisions.find((decision) => (decision.pause?.length ?? 0) > 0);
  const rails = brief.scores
    ? buildBoundedConditionRails({
        pause: corridorDecision?.pause,
        resume: corridorDecision?.resume,
        scores: brief.scores,
      })
    : [];
  const readings = brief.scores
    ? [
        { key: "tightness" as const, label: "Funding pressure", value: brief.scores.tightness, delta: formatDelta(brief.scores.tightnessDelta), worseWhenUp: true },
        { key: "riskAppetite" as const, label: "Risk appetite", value: brief.scores.riskAppetite, delta: formatDelta(brief.scores.riskAppetiteDelta), worseWhenUp: false },
      ]
    : [];
  const frozenScores = brief.scores;
  const tabulateDecisions = frozenScores !== undefined && brief.decisions.some((decision) => (decision.pause?.length ?? 0) > 0);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: briefTitle(brief),
        description: briefDescription(brief),
        datePublished: brief.publishedAt,
        dateModified: brief.publishedAt,
        author: buildAuthorSchema(),
        publisher: buildPublisherSchema(organizationName),
        image: [briefImageUrl(brief)],
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        isAccessibleForFree: true,
      },
      buildBreadcrumbList(
        createBreadcrumbTrail([
          { path: "/" },
          { path: buildPublishedBriefPath(brief.slug), label: `Week of ${brief.recordDateLabel}` },
        ]),
      ),
    ],
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <JsonLdScript data={structuredData} />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "History", href: "/history" },
          { label: `Week of ${brief.recordDateLabel}` },
        ]}
      />

      <article className="flex flex-col gap-6">
        <header className="weather-panel space-y-4 px-6 py-6 max-sm:px-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="sky">{display.conditions}</Tag>
              <Tag tone="slate">{display.confidence}</Tag>
              <span className="text-fluid-micro font-mono text-slate-400">Permanent Record</span>
            </div>
            <RegimeGlyph idPrefix={`brief-${brief.slug}`} regime={brief.regime} className="w-6 shrink-0" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{briefTitle(brief)}</h1>
          <p className="text-sm text-slate-300">{brief.summary}</p>
          <p className="text-xs text-slate-400">
            By{" "}
            <Link
              href="/about"
              className="text-sky-300 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              rel="author"
            >
              {publisherAuthor.name}
            </Link>{" "}
            ·{" "}
            <time dateTime={brief.publishedAt}>Published {brief.recordDateLabel}</time>
          </p>
          {brief.correction ? (
            <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              <span className="font-semibold">Correction:</span> {brief.correction}
            </p>
          ) : null}
          {/* Every shared artifact links here, so most arrivals are cold and land
              on a frozen week rather than the live call. The route onward existed
              only at the foot of the page, past the full brief. A visitor should
              not have to scroll a dated record to find out it is dated. */}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-800/60 pt-3 text-xs text-slate-400">
            <span>This is a frozen record of one week.</span>
            <ActionLink href="/" variant="inline">
              Read this week&apos;s call
            </ActionLink>
          </p>
        </header>

        <PublishedBriefCopyControls
          recordDateLabel={brief.recordDateLabel}
          slackUpdate={slackUpdate}
          emailUpdate={emailUpdate}
          permanentUrl={canonicalUrl}
        />

        {readings.length > 0 ? (
          <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6" aria-labelledby="published-readings">
            <h2 id="published-readings" className="text-lg font-semibold text-slate-100">The numbers the call was scored on</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {readings.map((reading) => {
                const rail = rails.find((candidate) => candidate.metric === reading.key);
                const deltaUp = reading.delta?.startsWith("+");
                const deltaTone = reading.delta
                  ? deltaUp === reading.worseWhenUp
                    ? "text-semantic-caution-fg"
                    : "text-semantic-easing-fg"
                  : "text-slate-500";
                return (
                  <div key={reading.key} className="min-w-0">
                    <dt className="text-fluid-nano text-slate-400">{reading.label}</dt>
                    <dd className="mt-0.5 flex items-baseline gap-2 tabular-nums">
                      <span className="text-2xl font-semibold text-slate-100">{reading.value}</span>
                      <span className="text-sm text-slate-500">/100</span>
                      {reading.delta ? <span className={`text-sm ${deltaTone}`}>{reading.delta} vs prior week</span> : null}
                    </dd>
                    {/* What the number meant that week, so a cited record does not
                        need the reader to know which end of the scale is bad. */}
                    <dd className="mt-0.5 text-fluid-nano text-slate-300">{signalReadingMeaning(reading.key, reading.value)}</dd>
                    {rail ? (
                      <dd className="mt-2">
                        <ThresholdLadder
                          idPrefix={`published-${brief.slug}-${rail.metric}`}
                          min={0}
                          max={100}
                          current={rail.current}
                          trigger={rail.guardrail}
                          triggerLabel={DECISION_CONTRACT_LABELS.threshold.pauseIf}
                          reversal={rail.clearsAt}
                          reversalLabel={publicDecisionLabels.reversal}
                          hysteresisBand
                          invert={rail.invert}
                          signalLabel={rail.label}
                          /* Same argument as the hero's rails: the flip that
                             puts trouble on the right for both signals was
                             announced only by 8px numeric end-labels. */
                          scaleDirection={compositeSignalScales[rail.metric]?.directionLabel}
                          viewBoxWidth={320}
                        />
                        <p className="mt-1 grid grid-cols-2 gap-x-3 text-fluid-nano tabular-nums text-slate-400">
                          <span>
                            {DECISION_CONTRACT_LABELS.threshold.pauseIf} {rail.invert ? "<" : ">"} {rail.guardrail}
                            <span className={`ml-1 ${rail.guardrailTripped ? "text-semantic-caution-fg" : "text-slate-500"}`}>
                              {parenthesizePointsToLine(rail.pointsToGuardrail, "pause", rail.guardrailTripped)}
                            </span>
                          </span>
                          {rail.clearsAt !== undefined ? (
                            <span>
                              {publicDecisionLabels.reversal} {rail.invert ? ">" : "<"} {rail.clearsAt}
                              <span className={`ml-1 ${rail.clearHolds ? "text-semantic-easing-fg" : "text-slate-500"}`}>
                                {parenthesizePointsToLine(rail.pointsToClear, "resume", rail.clearHolds)}
                              </span>
                            </span>
                          ) : null}
                        </p>
                      </dd>
                    ) : null}
                  </div>
                );
              })}
            </dl>
          </section>
        ) : null}

        <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">What changed this week</h2>
          <p className="text-sm text-slate-300">{brief.whatChanged}</p>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.action.doNow}:</span> {brief.actionNow}
          </p>
        </section>

        <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.watch.flipWatch}</h2>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span>{" "}
            <BoundedValue>{brief.guardrailThreshold}</BoundedValue>
          </p>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</span>{" "}
            <BoundedValue>{brief.flipThreshold}</BoundedValue>
          </p>
        </section>

        {brief.decisions.length ? (
          <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
            <h2 className="text-lg font-semibold text-slate-100">The call by area</h2>
            {tabulateDecisions && frozenScores ? (
              /* Every area's rule is a pair of the same four lines, drawn once
                 above. A row per area says which lines apply and how far off
                 the frozen reading sat, instead of five paraphrases of one
                 corridor. */
              <div className="overflow-x-auto">
                <table className="weather-stack-table w-full border-collapse text-left text-sm text-slate-300">
                  <caption className="sr-only">Action, pause line and re-open line for each area</caption>
                  <thead>
                    <tr className="border-b border-slate-800/80 text-fluid-nano text-slate-400">
                      <th scope="col" className="py-1.5 pr-3 font-medium">Area</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">{DECISION_CONTRACT_LABELS.action.doNow}</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</th>
                      <th scope="col" className="py-1.5 font-medium">{publicDecisionLabels.reversal}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brief.decisions.map((decision) => (
                      <tr key={decision.area} className="border-b border-slate-800/50 align-top">
                        <th scope="row" className="py-2 pr-3 font-semibold text-slate-100">{labelForArea(decision.area)}</th>
                        <td className="py-2 pr-3" data-label={DECISION_CONTRACT_LABELS.action.doNow}>{decision.doNow || decision.call}</td>
                        <td className="py-2 pr-3 text-xs" data-label={DECISION_CONTRACT_LABELS.threshold.pauseIf}>
                          <RuleLines
                            conditions={decision.pause ?? []}
                            fallback={decision.pauseTrigger}
                            nearest={nearestLine(decision.pause, frozenScores)}
                            kind="pause"
                            qualifier={decision.pauseQualifier}
                          />
                        </td>
                        <td className="py-2 text-xs" data-label={publicDecisionLabels.reversal}>
                          <RuleLines
                            conditions={decision.resume ?? []}
                            fallback={decision.resumeTrigger}
                            nearest={nearestLine(decision.resume, frozenScores)}
                            kind="resume"
                            qualifier={decision.resumeQualifier}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className="space-y-4">
                {brief.decisions.map((decision) => (
                  <li key={decision.area} className="space-y-1 border-l-2 border-slate-700/60 pl-4">
                    <p className="text-sm font-semibold text-slate-100">{labelForArea(decision.area)}</p>
                    <p className="text-sm text-slate-300">{decision.call}</p>
                    {decision.doNow ? <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.action.doNow}: {decision.doNow}</p> : null}
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span>{" "}
                      <BoundedValue>{decision.pauseTrigger}</BoundedValue>
                    </p>
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}:</span>{" "}
                      <BoundedValue>{decision.resumeTrigger}</BoundedValue>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {brief.evidence.length ? (
          <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
            <h2 className="text-lg font-semibold text-slate-100">Evidence behind the call</h2>
            <ul className="space-y-3 text-sm text-slate-300">
              {brief.evidence.map((item) => (
                <li key={item.title}>
                  <span className="font-semibold text-slate-100">{display.evidenceTitle(item.title)}</span> — {item.detail}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Provenance</h2>
          <p className="text-sm text-slate-300">
            Record date {brief.recordDateLabel} · {display.source} · captured {brief.freshnessLabel}
          </p>
          {brief.sourceUrl ? (
            <p className="text-sm">
              <a
                href={brief.sourceUrl}
                className="text-sky-300 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                rel="noreferrer"
                target="_blank"
              >
                View the source series
              </a>
            </p>
          ) : null}
          <p className="text-xs text-slate-400">
            This record is frozen. Corrections are published as a note on this page rather than a silent edit.
          </p>
        </footer>
      </article>

      {previous || next ? (
        <nav aria-label="Adjacent weeks" className="flex flex-wrap gap-2">
          {previous ? (
            <ActionLink href={buildPublishedBriefPath(previous.slug)} variant="ghost">
              ← Week of {previous.recordDateLabel}
            </ActionLink>
          ) : null}
          {next ? (
            <ActionLink href={buildPublishedBriefPath(next.slug)} variant="ghost">
              Week of {next.recordDateLabel} →
            </ActionLink>
          ) : null}
        </nav>
      ) : null}

      <nav aria-label="Brief navigation" className="flex flex-wrap gap-2">
        <ActionLink href="/" variant="primary">
          This week&apos;s brief
        </ActionLink>
        <ActionLink href="/history" variant="pill">
          Every past call
        </ActionLink>
        <ActionLink href="/about" variant="pill">
          About Whether
        </ActionLink>
      </nav>

      {/* A shared brief used to be a dead end: the recipient got the citation
          and nothing that brought next Monday's call to them. */}
      <SubscribeForm />
    </main>
  );
}
