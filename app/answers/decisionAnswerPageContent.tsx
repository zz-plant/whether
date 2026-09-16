import { notFound } from "next/navigation";
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
import { buildAnswerSectionHeadings } from "../../lib/seo/answerSectionHeadings";
import { isIndexableAnswerSlug } from "../../lib/seo/indexationPolicy";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ActionLink } from "../components/ui/actionLink";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { buildDecisionAnswerContextSummary } from "./decisionAnswerCopy";
import {
  DATA_CURRENCY_ACTION,
  DATA_CURRENCY_ACTION_HREF,
  buildDataCurrencyNotice,
} from "../../lib/report/dataCurrencyNotice";
import { ContentMeasurementTracker } from "../components/contentMeasurementTracker";
import { GlossaryLink, PlainEnglishScoreNote, SignalScaleNote } from "../components/ui/plainLanguage";
import { signalPlainEnglish, type CompositeSignalKey } from "../../lib/report/signalTranslations";
import { ReportCta } from "../components/reportCta";
import { JsonLdScript } from "../components/jsonLdScript";

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
  /* One notice, where a reader sees it first. There used to be two — one keyed on
     `noindex` and one on `degraded` — and between them they said "noindex" twice
     and printed the gate ids once. Whether this page is indexed is not something
     the person reading it can act on; whether the reading is current is. */
  const dataCurrency = buildDataCurrencyNotice(payload.noindexReasons, { recordDateLabel });
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
    /* A rich result is the first thing a stranger reads, and this sentence was
       "Threshold context: risk appetite 42 vs 50, tightness 79 vs 70" — two bare
       comparisons, one of them under the engine's name for a score the rest of
       the site calls funding pressure. */
    answer: `${liveShortAnswer} Risk appetite is ${assessment.scores.riskAppetite.toFixed(0)} of 100, against the ${assessment.thresholds.riskAppetiteRegime.toFixed(0)} line that would change this call; funding pressure is ${assessment.scores.tightness.toFixed(0)} of 100, against ${assessment.thresholds.tightnessRegime.toFixed(0)}.`,
    payload,
    datePublishedIso: reportData.treasury.record_date,
    dateModifiedIso: reportData.treasury.fetched_at,
  });

  /*
   * All eleven pages shipped the same six section headings, so the outline a
   * reader skims said nothing about which answer they were reading. Four of the
   * six are built from this page's audience, decision areas and threshold
   * focus; "Copy this answer" and "Citation" label a button and a provenance
   * block, which are the same thing everywhere.
   */
  const headings = buildAnswerSectionHeadings(page);

  /* The third branch was the one written in the engine's terms — "risk appetite <
     50 or tightness > 70" — with an operator the other two spell out and a name
     no other surface uses for that score. */
  const thresholdTrigger =
    page.thresholdFocus === "tightness"
      ? `Trigger tighter mode if funding pressure rises above ${assessment.thresholds.tightnessRegime.toFixed(0)}.`
      : page.thresholdFocus === "risk"
        ? `Trigger tighter mode if risk appetite falls below ${assessment.thresholds.riskAppetiteRegime.toFixed(0)}.`
        : `Trigger tighter mode if risk appetite falls below ${assessment.thresholds.riskAppetiteRegime.toFixed(0)}, or funding pressure rises above ${assessment.thresholds.tightnessRegime.toFixed(0)}.`;

  const compositeReadings: Array<{ key: CompositeSignalKey; score: number }> = [
    { key: "tightness", score: Math.round(assessment.scores.tightness) },
    { key: "riskAppetite", score: Math.round(assessment.scores.riskAppetite) },
  ];

  return (
    <SecondaryPageShell width="narrow">
      <ContentMeasurementTracker pagePath={pagePath} cluster={measurement.cluster} intent={measurement.intent} />
      <JsonLdScript data={faqData} />

      <div data-content-measurement-root={pagePath}>
        <SecondaryPageHeader
          eyebrow="Direct answer"
          title={page.title}
          description={liveDirectAnswer}
          aside={(
            <div className="weather-surface space-y-2 px-4 py-4">
              <p className="type-eyebrow">Short answer</p>
              <p className="text-sm font-semibold text-sky-200">{liveShortAnswer}</p>
              {dataCurrency ? (
                <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  {dataCurrency.summary} {DATA_CURRENCY_ACTION}{" "}
                  <ActionLink href={DATA_CURRENCY_ACTION_HREF} variant="inline">Source dates</ActionLink>
                </p>
              ) : null}
            </div>
          )}
        />

        <SecondaryPageSection title={headings.copy}>
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

        <SecondaryPageSection title={headings.posture}>
          <div className="space-y-2 text-sm text-slate-200">
            <p><span className="font-semibold text-slate-100">{publicDecisionLabels.call}:</span> {payload.currentCall}</p>
            <p><span className="font-semibold text-slate-100">{publicDecisionLabels.action}:</span> {payload.immediateAction}</p>
            <p>{contextSummary.summaryLine}</p>
            {contextSummary.classificationLine ? (
              <p className="text-xs text-slate-400">{contextSummary.classificationLine}</p>
            ) : null}
          </div>
        </SecondaryPageSection>

        <SecondaryPageSection title={headings.rules}>
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

        <SecondaryPageSection title={headings.threshold}>
          <p className="text-sm text-slate-200">{thresholdTrigger}</p>
          {/*
            Both numbers were printed bare — "current tightness: 79 / 100" — on the
            pages a first-time visitor reaches from a search result, while the scale
            note and the plain-English band that make a bare score readable sat only
            on the three pages a returning reader already knows their way around.
            Same primitives, on the surface that needs them most.
          */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {compositeReadings.map((reading) => (
              <div key={reading.key} className="space-y-1">
                <p className="text-sm tabular-nums text-slate-200">
                  {signalPlainEnglish[reading.key].plainLabel}: {reading.score} / 100
                </p>
                <SignalScaleNote signalKey={reading.key} />
                <PlainEnglishScoreNote signalKey={reading.key} score={reading.score} lead="On this signal alone" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-fluid-nano text-white/45">
            <GlossaryLink>What these terms mean</GlossaryLink>
          </p>
        </SecondaryPageSection>

        <SecondaryPageSection title={headings.citation}>
          <p className="text-xs text-slate-300">{callCitation}</p>
          <p className="text-xs text-slate-400">Data date: {recordDateLabel} · freshness: {fetchedAtLabel}.</p>
        </SecondaryPageSection>

        <SecondaryPageSection title={headings.next}>
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
