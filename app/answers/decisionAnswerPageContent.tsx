import { notFound } from "next/navigation";
import { serializeJsonLd } from "../../lib/seo";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import { buildLiveDirectAnswer, buildLiveShortAnswer } from "./liveShortAnswers";
import {
  answerPages,
  findDecisionPage,
  getDecisionPageContentMeasurement,
} from "./decisionPages";
import { buildSeoDecisionPayload } from "../../lib/report/seoDecisionPayload";
import { selectRelatedAnswers } from "../../lib/seo/relatedAnswers";
import { buildAnswerFaqStructuredData } from "../../lib/seo/pageStructuredData";
import { isIndexableAnswerSlug } from "../../lib/seo/indexationPolicy";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ActionLink } from "../components/ui/actionLink";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { buildDecisionAnswerContextSummary } from "./decisionAnswerCopy";
import { ContentMeasurementTracker } from "../components/contentMeasurementTracker";
import { ReportCta } from "../components/reportCta";

export async function DecisionAnswerPageContent({
  slug,
  route,
}: {
  slug: string;
  route: string;
}) {
  const page = findDecisionPage(slug);
  if (!page) notFound();

  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route });
  const { assessment, recordDateLabel, reportDynamics, fetchedAtLabel } = reportData;
  const { homeBriefModel, displayRegime, callCitation } = snapshot;
  const mappedRules = homeBriefModel.decisionRules.filter((rule) => page.mappedDecisionAreas.includes(rule.area));
  const payload = buildSeoDecisionPayload({
    assessment,
    mappedRules,
    mappedDecisionAreas: page.mappedDecisionAreas,
    fallbackCurrentCall: page.shortAnswer,
    fallbackImmediateAction: page.directAnswer,
    reportEvidenceItems: reportData.reportEvidenceItems,
    freshnessLabel: fetchedAtLabel,
    recordDateLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    isFallbackSnapshot: degraded,
    provenanceStatusLabel: reportData.treasuryProvenance?.statusLabel,
    fetchedAtIso: reportData.treasury.fetched_at,
    pageKey: `/answers/${page.slug}`,
    provenanceLinks: [reportData.treasury.source, reportData.macroSeries[0]?.sourceUrl].filter((link): link is string => Boolean(link)),
  });
  const contextSummary = buildDecisionAnswerContextSummary({
    displayLabel: displayRegime.label,
    canonicalRegime: displayRegime.canonicalRegime,
    momentumLabel: reportDynamics.directionLabel,
    revisitDecisions: homeBriefModel.revisitDecisions,
  });
  const liveShortAnswer = buildLiveShortAnswer({ payload, fallback: page.shortAnswer });
  const liveDirectAnswer = buildLiveDirectAnswer({ payload, fallback: page.directAnswer });
  /*
   * Ranked by shared decision areas, and filtered to pages that are actually
   * indexable — the old rule selected for a *different* category and took the
   * first three, which made every decision page emit the identical three links
   * and could point at pages the allowlist excludes.
   */
  const relatedPages = selectRelatedAnswers(page, answerPages, { isEligible: isIndexableAnswerSlug });
  const pagePath = `/answers/${page.slug}`;
  const measurement = getDecisionPageContentMeasurement(page);
  const copyText = [
    page.title,
    `Short answer: ${liveShortAnswer}`,
    `Current call: ${payload.currentCall}`,
    `${DECISION_CONTRACT_LABELS.action.actionNow}: ${payload.immediateAction}`,
    `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${payload.triggerThreshold}`,
    `${DECISION_CONTRACT_LABELS.reversal.changeCourseIf}: ${payload.reversalCondition}`,
    `Citation: ${callCitation}`,
    `Freshness: ${fetchedAtLabel}`,
  ].join("\n");

  /*
   * The FAQPage used to be a bare node: one question, no author, publisher,
   * dates, URL, or link to the site entities. It now carries all of those, and
   * a second question for the thresholds, which the page already answers.
   */
  const faqData = buildAnswerFaqStructuredData({
    slug: page.slug,
    question: page.title,
    answer: `${liveShortAnswer} Threshold context: risk appetite ${assessment.scores.riskAppetite.toFixed(0)} vs ${assessment.thresholds.riskAppetiteRegime.toFixed(0)}, tightness ${assessment.scores.tightness.toFixed(0)} vs ${assessment.thresholds.tightnessRegime.toFixed(0)}.`,
    payload,
    datePublishedIso: reportData.treasury.record_date,
    dateModifiedIso: reportData.treasury.fetched_at,
  });

  const thresholdTrigger =
    page.thresholdFocus === "tightness"
      ? `Trigger tighter mode if funding pressure rises above ${assessment.thresholds.tightnessRegime.toFixed(0)}.`
      : page.thresholdFocus === "risk"
        ? `Trigger tighter mode if risk appetite falls below ${assessment.thresholds.riskAppetiteRegime.toFixed(0)}.`
        : `Trigger tighter mode if risk appetite < ${assessment.thresholds.riskAppetiteRegime.toFixed(0)} or tightness > ${assessment.thresholds.tightnessRegime.toFixed(0)}.`;

  return (
    <SecondaryPageShell width="narrow">
      <ContentMeasurementTracker pagePath={pagePath} cluster={measurement.cluster} intent={measurement.intent} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqData) }} />

      <div data-content-measurement-root={pagePath}>
        <SecondaryPageHeader
          eyebrow="Direct answer"
          title={page.title}
          description={liveDirectAnswer}
          aside={(
            <div className="weather-surface space-y-2 px-4 py-4">
              <p className="type-eyebrow">Short answer</p>
              <p className="text-sm font-semibold text-sky-200">{liveShortAnswer}</p>
              {payload.noindex ? (
                <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Degraded signal quality: fallback mode and noindex remain active until freshness, completeness, and provenance checks pass.
                </p>
              ) : null}
            </div>
          )}
        />

        <SecondaryPageSection title="Copy this answer">
          <div className="space-y-3">
            <p className="text-sm text-slate-200">
              Copy the bounded answer, threshold, and citation as a meeting-ready brief.
            </p>
            <ReportCta
              href={pagePath}
              label="Copy decision brief"
              copyText={copyText}
              copyTarget="Decision brief"
              telemetryEvent={{
                pagePath,
                cluster: measurement.cluster,
                intent: measurement.intent,
                ctaId: "copy_decision_brief",
              }}
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
            />
          </div>
        </SecondaryPageSection>

        <SecondaryPageSection title="This week's posture">
          <div className="space-y-2 text-sm text-slate-200">
            <p><span className="font-semibold text-slate-100">{publicDecisionLabels.call}:</span> {payload.currentCall}</p>
            <p><span className="font-semibold text-slate-100">{publicDecisionLabels.action}:</span> {payload.immediateAction}</p>
            <p>{contextSummary.summaryLine}</p>
            {contextSummary.classificationLine ? (
              <p className="text-xs text-slate-400">{contextSummary.classificationLine}</p>
            ) : null}
          </div>
        </SecondaryPageSection>

        <SecondaryPageSection title="Bounded calls">
          <div className="grid gap-3 sm:grid-cols-2">
            {mappedRules.map((rule) => (
              <article key={rule.area} className="weather-surface space-y-2 px-4 py-4 text-sm">
                <p className="type-eyebrow text-sky-200">{decisionAreaLabel(rule.area)}</p>
                <p className="font-semibold text-slate-100">{rule.recommendation}</p>
                <p className="text-xs text-slate-300">Scope: {rule.scope}</p>
                {rule.doNow[0] ? (
                  <p className="text-xs text-emerald-200">{publicDecisionLabels.action}: {rule.doNow[0]}</p>
                ) : null}
                <p className="text-xs text-rose-200">{publicDecisionLabels.threshold}: {rule.pauseTrigger}</p>
                <p className="text-xs text-emerald-200">{publicDecisionLabels.reversal}: {rule.resumeTrigger}</p>
              </article>
            ))}
          </div>
        </SecondaryPageSection>

        <SecondaryPageSection title="What would change this answer">
          <p className="text-sm text-slate-200">{thresholdTrigger}</p>
          <p className="text-sm text-slate-200">Current risk appetite: {assessment.scores.riskAppetite.toFixed(0)} / 100 · current tightness: {assessment.scores.tightness.toFixed(0)} / 100.</p>
        </SecondaryPageSection>

        <SecondaryPageSection title="Citation">
          <p className="text-xs text-slate-300">{callCitation}</p>
          <p className="text-xs text-slate-400">Data date: {recordDateLabel} · freshness: {fetchedAtLabel}.</p>
          {payload.degraded ? <p className="text-xs text-amber-200">Degraded data mode: {(payload.noindexReasons ?? []).join(", ") || "cached/stale signals"}; this answer is marked noindex.</p> : null}
        </SecondaryPageSection>

        <SecondaryPageSection title="Where to go next">
          <div className="flex flex-wrap gap-2">
            <ActionLink href="/" variant="pill">Weekly brief</ActionLink>
            <ActionLink href="/resolve#unresolved-question-router" variant="pill">Decision Tools</ActionLink>
            <ActionLink href="/operate" variant="pill">Operating guardrails</ActionLink>
            <ActionLink href="/resolve#direct-answers" variant="pill">More direct answers</ActionLink>
            {relatedPages.map((related) => (
              <ActionLink key={related.slug} href={`/answers/${related.slug}`} variant="pill">{related.title}</ActionLink>
            ))}
          </div>
        </SecondaryPageSection>
      </div>
    </SecondaryPageShell>
  );
}
