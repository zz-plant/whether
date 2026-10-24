import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionLink } from "../../components/ui/actionLink";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import { BoundedValue } from "../../components/ui/boundedValue";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../../lib/navigation/breadcrumbs";
import {
  buildCanonicalUrl,
  buildPageMetadata,
} from "../../../lib/seo";
import { publisherAuthor } from "../../../lib/publisher";
import { buildPublishedBriefStructuredData } from "../../../lib/seo/pageStructuredData";
import {
  buildPublishedBriefEmailUpdate,
  buildPublishedBriefImageParams,
  buildPublishedBriefImageUrl,
  buildPublishedBriefDescription,
  buildPublishedBriefPath,
  buildPublishedBriefTitle,
  buildPublishedBriefSlackUpdate,
  buildPublishedBriefBoardUpdate,
  findAdjacentPublishedBriefs,
  findPublishedBrief,
  labelForArea,
  publishedBriefDisplay,
  publishedBriefHeadline,
  correctionBody,
  publishedBriefWeekLabel,
  publishedBriefStaticParams,
  type PublishedBrief,
  type PublishedRuleLine,
} from "../../../lib/report/publishedBriefs";
import { PublishedBriefCopyControls } from "./publishedBriefCopyControls";
import { ThresholdLadder } from "../../components/illustrations/ThresholdLadder";
import { DecisionHero } from "../../components/DecisionHero";
import { RuleLines } from "../../components/boundedRuleLines";
import {
  buildBoundedConditionRails,
  parenthesizePointsToLine,
  toThresholdDistance,
  type RuleThresholdDistance,
} from "../../../lib/report/operatingCalls";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { AreaLabel, LineStateIcon } from "../../components/ui/conceptIcons";
import { isDecisionArea } from "../../../lib/report/boundedDecisionRules";
import { briefVideoOpenGraph, findBriefVideo } from "../../../lib/export/briefVideo";
import { BriefVideoPreview } from "../../components/briefVideoPreview";

/* A frozen record stores its area as a string; a known area prints with its glyph. */
const BriefAreaName = ({ area }: { area: string }) =>
  isDecisionArea(area) ? <AreaLabel area={area} /> : <>{labelForArea(area)}</>;

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

const briefTitle = buildPublishedBriefTitle;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { week } = await params;
  const brief = findPublishedBrief(week);

  if (!brief) return {};

  const video = await findBriefVideo(brief);

  const metadata = buildPageMetadata({
    title: briefTitle(brief),
    description: buildPublishedBriefDescription(brief),
    path: buildPublishedBriefPath(brief.slug),
    imageAlt: `Whether's guidance for the week of ${publishedBriefWeekLabel(brief)}`,
    imageParams: buildPublishedBriefImageParams(brief),
  });

  metadata.authors = [{ name: publisherAuthor.name, url: buildCanonicalUrl("/about") }];
  metadata.keywords = [
    "startup operating guidance",
    "startup hiring guidance",
    "venture funding macro",
    "burn rate discipline",
    `week of ${publishedBriefWeekLabel(brief)}`,
    brief.slug,
    brief.regime,
  ];
  metadata.openGraph = {
    ...metadata.openGraph,
    type: "article",
    publishedTime: brief.publishedAt,
    modifiedTime: brief.publishedAt,
    authors: [buildCanonicalUrl("/about")],
    ...(video ? {
      videos: [briefVideoOpenGraph(video)],
      images: [{
        url: buildCanonicalUrl(video.poster),
        width: video.width,
        height: video.height,
        alt: `The published weekly guidance for ${publishedBriefWeekLabel(brief)}`,
      }],
    } : {}),
  };

  return metadata;
}

import { SubscribeForm } from "../../components/SubscribeForm";
import { JsonLdScript } from "../../components/jsonLdScript";
import { compositeSignalScales, regimeSignalLabel, signalReadingMeaning } from "../../../lib/report/signalTranslations";

export default async function PublishedBriefPage({ params }: { params: Promise<Params> }) {
  const { week } = await params;
  const brief = findPublishedBrief(week);

  if (!brief) notFound();

  const video = await findBriefVideo(brief);
  /* The metadata shim emits og:video with its width and height but leaves out
     the type and the secure URL the OpenGraph video spec carries, so the page
     renders those two itself; React hoists meta tags into the document head
     during server rendering. */
  const videoOpenGraph = video ? briefVideoOpenGraph(video) : undefined;
  const display = publishedBriefDisplay(brief);
  const headline = publishedBriefHeadline(brief);
  const canonicalUrl = buildCanonicalUrl(buildPublishedBriefPath(brief.slug));
  const { previous, next } = findAdjacentPublishedBriefs(brief.slug);
  const slackUpdate = buildPublishedBriefSlackUpdate(brief);
  const emailUpdate = buildPublishedBriefEmailUpdate(brief);
  const boardUpdate = buildPublishedBriefBoardUpdate(brief);

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
  /* Each move names the reading it is against ("+5 vs Sep 22"). This printed
     the stored delta as "+27.0 vs prior week" on w40, and the delta was against
     Aug 31: five weeks, a decimal the scores never had, and the wrong week. */
  const readings = brief.scores
    ? [
        { key: "tightness" as const, label: regimeSignalLabel.tightness, value: brief.scores.tightness, change: display.scoreChange("tightness"), worseWhenUp: true },
        { key: "riskAppetite" as const, label: regimeSignalLabel.riskAppetite, value: brief.scores.riskAppetite, change: display.scoreChange("riskAppetite"), worseWhenUp: false },
      ]
    : [];
  const frozenScores = brief.scores;
  const tabulateDecisions = frozenScores !== undefined && brief.decisions.some((decision) => (decision.pause?.length ?? 0) > 0);

  const structuredData = buildPublishedBriefStructuredData({
    brief,
    canonicalUrl,
    imageUrl: buildPublishedBriefImageUrl(brief),
    headline: briefTitle(brief),
    description: buildPublishedBriefDescription(brief),
  });

  return (
    <ContentPageShell measure="prose">
      <JsonLdScript data={structuredData} />

      <Breadcrumbs
        items={toVisibleBreadcrumbs(
          buildGroupBreadcrumbs(buildPublishedBriefPath(brief.slug), [
            { name: `Week of ${publishedBriefWeekLabel(brief)}`, path: buildPublishedBriefPath(brief.slug) },
          ]),
        )}
      />

      <article className="flex flex-col gap-6">
        {/* The record in the card the live brief and its share image use:
            stamp, call, lines, date, source. It used to be a panel of tags with
            the call as body text under a generic title, so a screenshot of a
            cited week looked like nothing the reader had seen on Monday. */}
        {/* The card's heading is the week, without the conditions: the stamp
            directly above it names them, and the heading said "Freezing:" again
            (2026-10-09). The page's <title> and its structured data keep the
            full title, where there is no stamp. The caption at the card's foot
            carries the margin only, since the heading in the same card dates it. */}
        <DecisionHero
          question={`Guidance for the week of ${publishedBriefWeekLabel(brief)}`}
          /* The week's headline action, from the one source the live brief uses
             (`weeklyHeadline`): the stored call, with the stored action's direction
             on the stamp line. The action itself printed as a do-now line here, a
             second headline for the same week; the per-area do-now lines below
             are the area lines. */
          weeklyCall={headline.action}
          direction={headline.directionLabel}
          /* A correction rides inside the card, under the lines it corrects: the
             card is the block people crop, and a crop that dropped the note
             would carry the uncorrected line on its own. */
          callDetail={brief.correction ? `Correction: ${correctionBody(brief.correction)}` : undefined}
          regime={brief.regime}
          lines={[
            ...(display.pauseIf ? [{ label: DECISION_CONTRACT_LABELS.threshold.pauseIf, value: display.pauseIf }] : []),
            { label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: display.conditionsChangeIf },
          ]}
          trust={null}
          /* The margin and the basis, inside the card's border: a crop of a cited week
             keeps which inputs set its scores (2026-10-09). */
          captionDetail={`Margin: ${display.confidence.toLowerCase()} · ${display.basis.sentence.replace(/\.$/, "")}`}
        />

        <header className="space-y-3">
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
          {/* Every shared artifact links here, so most arrivals are cold and land
              on a frozen week rather than the live call. The route onward existed
              only at the foot of the page, past the full brief. A visitor should
              not have to scroll a dated record to find out it is dated. */}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>This is a frozen record of one week.</span>
            <ActionLink href="/" variant="inline">
              Read this week&apos;s guidance
            </ActionLink>
          </p>
        </header>

        {/* The delta follows the card, then the share tool. The copy panel used
            to sit directly under the header, so a cold reader arriving from a
            pasted link met a monospace Slack preview before "What changed", which
            sat on the desktop fold (2026-09-30 attention pass). The action and
            both lines are on the card now, so this section carries only the
            delta. */}
        <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">What changed this week</h2>
          <p className="text-sm text-slate-300">{display.whatChanged}</p>
        </section>

        <PublishedBriefCopyControls
          weekLabel={publishedBriefWeekLabel(brief)}
          slackUpdate={slackUpdate}
          emailUpdate={emailUpdate}
          boardUpdate={boardUpdate}
          permanentUrl={canonicalUrl}
          slidePptxUrl={`/api/export/board-slide?week=${brief.slug}&format=pptx`}
        />

        {video && videoOpenGraph ? (
          <>
            <meta property="og:video:type" content={videoOpenGraph.type} />
            <meta property="og:video:secure_url" content={videoOpenGraph.secureUrl} />
            <details className="weather-panel space-y-4 px-6 py-6 max-sm:px-0">
              <summary className="weather-hit w-fit cursor-pointer text-fluid-sm font-semibold text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                Watch or download this brief
              </summary>
              <BriefVideoPreview asset={video} label={`Published guidance for the week of ${publishedBriefWeekLabel(brief)}`} />
            </details>
          </>
        ) : null}

        {readings.length > 0 ? (
          <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6" aria-labelledby="published-readings">
            <h2 id="published-readings" className="text-lg font-semibold text-slate-100">The numbers behind the guidance</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {readings.map((reading) => {
                const rail = rails.find((candidate) => candidate.metric === reading.key);
                const deltaUp = reading.change ? reading.change.delta > 0 : undefined;
                const deltaTone = reading.change
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
                      {reading.change ? <span className={`text-sm ${deltaTone}`}>{reading.change.label}</span> : null}
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
                            {/* The pause and play glyphs the signal bars' keys use. */}
                            <LineStateIcon state="crossed" className="mr-1 inline align-[-3px]" />
                            {DECISION_CONTRACT_LABELS.threshold.pauseIf} {rail.invert ? "<" : ">"} {rail.guardrail}
                            <span className={`ml-1 ${rail.guardrailTripped ? "text-semantic-caution-fg" : "text-slate-500"}`}>
                              {parenthesizePointsToLine(rail.pointsToGuardrail, "pause", rail.guardrailTripped)}
                            </span>
                          </span>
                          {rail.clearsAt !== undefined ? (
                            <span>
                              <LineStateIcon state="clear" className="mr-1 inline align-[-3px]" />
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

        {brief.decisions.length ? (
          <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
            <h2 className="text-lg font-semibold text-slate-100">Guidance by area</h2>
            {tabulateDecisions && frozenScores ? (
              /* Every area's rule is a pair of the same four lines, drawn once
                 above. A row per area says which lines apply and how far off
                 the frozen reading sat, instead of five paraphrases of one
                 corridor. */
              <div className="overflow-x-auto">
                <table className="weather-stack-table w-full border-collapse text-left text-sm text-slate-300">
                  <caption className="sr-only">Action, pause line and resume line for each area</caption>
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
                        <th scope="row" className="py-2 pr-3 font-semibold text-slate-100">
                          <BriefAreaName area={decision.area} />
                        </th>
                        <td className="py-2 pr-3" data-label={DECISION_CONTRACT_LABELS.action.doNow}>{display.sentence(decision.doNow || decision.call)}</td>
                        <td className="py-2 pr-3 text-xs" data-label={DECISION_CONTRACT_LABELS.threshold.pauseIf}>
                          <RuleLines
                            conditions={decision.pause ?? []}
                            fallback={display.sentence(decision.pauseTrigger)}
                            nearest={nearestLine(decision.pause, frozenScores)}
                            kind="pause"
                            qualifier={decision.pauseQualifier}
                          />
                        </td>
                        <td className="py-2 text-xs" data-label={publicDecisionLabels.reversal}>
                          <RuleLines
                            conditions={decision.resume ?? []}
                            fallback={display.sentence(decision.resumeTrigger)}
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
                    <p className="text-sm font-semibold text-slate-100">
                      <BriefAreaName area={decision.area} />
                    </p>
                    <p className="text-sm text-slate-300">{display.sentence(decision.call)}</p>
                    {decision.doNow ? <p className="text-sm text-slate-300">{DECISION_CONTRACT_LABELS.action.doNow}: {display.sentence(decision.doNow)}</p> : null}
                    {/* w31 said "cash availability tightens above 76" here, the
                        funding-pressure line under a name that ran the other way. */}
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span>{" "}
                      <BoundedValue>{display.sentence(decision.pauseTrigger)}</BoundedValue>
                    </p>
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold text-slate-100">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}:</span>{" "}
                      <BoundedValue>{display.sentence(decision.resumeTrigger)}</BoundedValue>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {brief.evidence.length ? (
          <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
            <h2 className="text-lg font-semibold text-slate-100">Evidence behind the guidance</h2>
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
          {/* "This record is frozen." opened this line until 2026-10-09; the header
              says it to every arrival, so the footer keeps only the corrections rule. */}
          <p className="text-xs text-slate-400">
            Corrections are published as a note on this page rather than a silent edit.
          </p>
        </footer>
      </article>

      {previous || next ? (
        <nav aria-label="Adjacent weeks" className="flex flex-wrap gap-2">
          {previous ? (
            <ActionLink href={buildPublishedBriefPath(previous.slug)} variant="ghost">
              ← Week of {publishedBriefWeekLabel(previous)}
            </ActionLink>
          ) : null}
          {next ? (
            <ActionLink href={buildPublishedBriefPath(next.slug)} variant="ghost">
              Week of {publishedBriefWeekLabel(next)} →
            </ActionLink>
          ) : null}
        </nav>
      ) : null}

      <nav aria-label="Brief navigation" className="flex flex-wrap gap-2">
        <ActionLink href="/" variant="primary">
          This week&apos;s brief
        </ActionLink>
        <ActionLink href="/history" variant="pill">
          All past guidance
        </ActionLink>
        <ActionLink href="/about" variant="pill">
          About Whether
        </ActionLink>
      </nav>

      {/* A shared brief used to be a dead end: the recipient got the citation
          and nothing that brought next Monday's call to them. */}
      <SubscribeForm />
    </ContentPageShell>
  );
}
