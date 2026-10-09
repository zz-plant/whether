import { notFound } from "next/navigation";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
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
import Link from "next/link";
import { SecondaryPageSection } from "../components/secondaryPageShell";
import { Breadcrumbs } from "../components/ui/breadcrumbs";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../lib/navigation/breadcrumbs";
import { ActionLink } from "../components/ui/actionLink";
import { ScoreLadder } from "../components/ui/scoreLadder";
import { AreaTable } from "../components/ui/areaTable";
import { DecisionHero } from "../components/DecisionHero";
import { buildTrustStripProps } from "../../lib/report/evidenceReaderModel";
import { buildDegradedSourceRows } from "../../lib/report/sourceHealth";
import { formatConfidenceChipLabel } from "../../lib/report/reportFormatting";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { buildFlipThreshold, buildWeekCallChangesIf } from "../../lib/report/reportEvidence";
import { formatThresholdNumber } from "../../lib/formatters";
import { buildDecisionAnswerContextSummary } from "./decisionAnswerCopy";
import {
  DATA_CURRENCY_ACTION,
  DATA_CURRENCY_ACTION_HREF,
  buildDataCurrencyNotice,
} from "../../lib/report/dataCurrencyNotice";
import { ContentMeasurementTracker } from "../components/contentMeasurementTracker";
import { PlainEnglishScoreNote, SignalScaleNote } from "../components/ui/plainLanguage";
import { signalPlainEnglish, type CompositeSignalKey } from "../../lib/report/signalTranslations";
import { ReportCta } from "../components/reportCta";
import { JsonLdScript } from "../components/jsonLdScript";
import { ContentPageShell } from "../components/ui/contentPageShell";
import { isSavedCopy } from "../../lib/report/provenanceStatus";

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
    reportDynamics,
    revisitDecisions: homeBriefModel.revisitDecisions,
  });
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
  const pagePath = `/answers/${page.slug}` as const;
  const measurement = getDecisionPageContentMeasurement(page);
  const copyText = [
    page.title,
    `Short answer: ${page.shortAnswer}`,
    `For: ${page.audience}`,
    `Company inputs to check: ${page.companyInputs.join(" ")}`,
    `Decision note to complete: ${page.decisionNote}`,
    `Market guidance as of ${recordDateLabel}`,
    `Current guidance: ${payload.currentCall}`,
    `${DECISION_CONTRACT_LABELS.action.actionNow}: ${payload.immediateAction}`,
    `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${payload.triggerThreshold}`,
    `${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${payload.reversalCondition}`,
    `Citation: ${callCitation}`,
    `Freshness: ${fetchedAtLabel}`,
    ...(dataCurrency ? [`Data status: ${dataCurrency.summary}`] : []),
    `References: ${page.supportingLinks.map((link) => link.href).join(", ")}`,
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
    answer: `${page.shortAnswer} Market guidance as of ${recordDateLabel}: ${payload.currentCall} Risk appetite is ${assessment.scores.riskAppetite.toFixed(0)} of 100, against the ${formatThresholdNumber(assessment.thresholds.riskAppetiteRegime)} line where conditions change; funding pressure is ${assessment.scores.tightness.toFixed(0)} of 100, against ${formatThresholdNumber(assessment.thresholds.tightnessRegime)}.`,
    payload,
    datePublishedIso: reportData.treasury.record_date,
    dateModifiedIso: reportData.treasury.fetched_at,
    /* The rest of what this page answers, from what it already renders. Each is
       a passage an answer engine can quote and attribute; none of them were in
       the payload a machine reads. */
    additionalQuestions: [
      {
        question: "Which company inputs should we check before acting?",
        answer: page.companyInputs.join(" "),
      },
      {
        question: "What should we do about it this week?",
        answer: payload.immediateAction,
      },
      {
        question: "Who is this answer for?",
        answer: `${page.audience}. It covers ${page.mappedDecisionAreas.map(decisionAreaLabel).join(", ").toLowerCase()}.`,
      },
      {
        question: "How current is this reading?",
        answer: `Data date ${recordDateLabel}, refreshed ${fetchedAtLabel}, ${formatConfidenceChipLabel(homeBriefModel.confidenceLabel).toLowerCase()}.`,
      },
      {
        question: "What is this based on?",
        answer: payload.evidence.length > 0
          ? `${payload.evidence.map((item) => item.title).join(", ")}. ${payload.citationMeta}`
          : payload.citationMeta,
      },
    ],
  });

  /*
   * All eleven pages shipped the same six section headings, so the outline a
   * reader skims said nothing about which answer they were reading. Four of the
   * six are built from this page's audience, decision areas and threshold
   * focus; "Copy this answer" and "Citation" label a button and a provenance
   * block, which are the same thing everywhere.
   */
  const headings = buildAnswerSectionHeadings(page);

  /* The brief's own change line, for the score this page is about, in the
     direction that leaves this week's conditions. It was "Trigger tighter mode
     if risk appetite falls below 50, or funding pressure rises above 70" in
     every regime, so a Freezing week, already past both, was told to watch for
     them. */
  const focus = page.thresholdFocus === "tightness" ? "tightness" : page.thresholdFocus === "risk" ? "riskAppetite" : undefined;
  /* On a held week, the hold's own condition: a line is not what changes the guidance then. */
  const thresholdTrigger = `${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${buildWeekCallChangesIf(assessment, (week) =>
    buildFlipThreshold(week, focus),
  )}`;

  const compositeReadings: Array<{ key: CompositeSignalKey; score: number; line: number }> = [
    { key: "tightness", score: Math.round(assessment.scores.tightness), line: assessment.thresholds.tightnessRegime },
    { key: "riskAppetite", score: Math.round(assessment.scores.riskAppetite), line: assessment.thresholds.riskAppetiteRegime },
  ];

  return (
    <ContentPageShell measure="content">
      <ContentMeasurementTracker pagePath={pagePath} cluster={measurement.cluster} intent={measurement.intent} />
      <JsonLdScript data={faqData} />

      <div data-content-measurement-root={pagePath} className="weather-page-stack">
        <Breadcrumbs items={toVisibleBreadcrumbs(buildGroupBreadcrumbs(pagePath, [{ name: page.title, path: pagePath }]))} />
        {/* The answer as the card the brief opens on: the week's stamp, the question,
            this week's answer to it, the lines it holds between, and the trust strip.
            This page used to open on a generic header and a "Short answer" box of
            enduring advice, with the week's conditions in small print further down,
            so a reader arriving from search met explanation before the answer. */}
        <DecisionHero
          question={page.title}
          weeklyCall={payload.currentCall}
          callDetail={page.shortAnswer}
          regime={assessment.regime}
          lines={[
            ...(payload.immediateAction.trim() !== payload.currentCall.trim()
              ? [{ label: DECISION_CONTRACT_LABELS.action.doNow, value: payload.immediateAction }]
              : []),
            { label: DECISION_CONTRACT_LABELS.threshold.pauseIf, value: payload.triggerThreshold },
            { label: DECISION_CONTRACT_LABELS.reversal.resumeWhen, value: payload.reversalCondition },
          ]}
          trust={buildTrustStripProps({
            recordDateLabel,
            // `degraded` is assembly failing outright; a read that fell back to the
            // bundled snapshot succeeds, so the fallback flags are what move under an outage.
            isFallback: degraded || isSavedCopy(reportData.treasury),
            degradedSourceCount: buildDegradedSourceRows(reportData.sourceHealth).length,
            confidenceLabel: homeBriefModel.confidenceLabel,
            assessment,
          })}
        />
        {dataCurrency ? (
          <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {dataCurrency.summary} {DATA_CURRENCY_ACTION}{" "}
            <ActionLink href={DATA_CURRENCY_ACTION_HREF} variant="inline">Source dates</ActionLink>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <ReportCta
            href={pagePath}
            label="Copy decision brief"
            copyText={copyText}
            copyTarget="Decision brief"
            telemetryEvent={{
              pagePath,
              cluster: measurement.cluster,
              intent: measurement.intent,
              ctaId: "copy_decision_brief_header",
            }}
            className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold"
          />
          {relatedPages.length > 0 ? (
            <nav aria-label="Related operator questions" className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Related:</span>
              {relatedPages.slice(0, 3).map((related) => (
                <Link
                  key={related.slug}
                  href={`/answers/${related.slug}`}
                  className="weather-focus-ring inline-flex min-h-11 items-center rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-2 text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                >
                  {related.title} →
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <SecondaryPageSection title={headings.posture}>
          <div className="space-y-2 text-sm text-slate-200">
            <p className="text-xs text-slate-400">Market guidance as of {recordDateLabel}</p>
            {/* The guidance and its action are the card's now; this section says how to use them. */}
            <p>{page.directAnswer}</p>
            <p>{contextSummary.summaryLine}</p>
            {contextSummary.classificationLine ? (
              <p className="text-xs text-slate-400">{contextSummary.classificationLine}</p>
            ) : null}
          </div>
        </SecondaryPageSection>

        <SecondaryPageSection title={page.contextHeading}>
          <p className="text-sm text-slate-200">{page.context}</p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">Company inputs to check</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-200">
            {page.companyInputs.map((input) => <li key={input}>{input}</li>)}
          </ul>
        </SecondaryPageSection>

        <SecondaryPageSection title={headings.rules}>
          {/* The same row, in the same order, as the homepage and the plan page:
              a reader who clicks through from here meets a table they have read
              before rather than a second shape for one thing. */}
          <AreaTable
            caption="What this week's guidance changes for each decision area"
            rows={mappedRules.map((rule) => ({
              area: rule.area,
              rule: rule.doNow[0] ?? rule.recommendation,
              pause: { line: rule.pauseTrigger },
              resume: { line: rule.resumeTrigger },
              scores: [...rule.pause.conditions, ...rule.resume.conditions].map((condition) => condition.metric),
            }))}
            signalLinkBase="/"
          />
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
                {/* Drawn against the line, not printed bare: how far the score sits
                    from where the call changes is the fact this page turns on. */}
                <ScoreLadder
                  label={signalPlainEnglish[reading.key].plainLabel}
                  value={reading.score}
                  previous={null}
                  lines={[{ kind: "callChange", value: reading.line }]}
                />
                <SignalScaleNote signalKey={reading.key} />
                <PlainEnglishScoreNote signalKey={reading.key} score={reading.score} lead="On this signal alone" />
              </div>
            ))}
          </div>
        </SecondaryPageSection>

        <SecondaryPageSection title={headings.copy}>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Decision note to complete</h3>
            <p className="text-sm text-slate-200">{page.decisionNote}</p>
            <p className="text-sm text-slate-200">
              Copy this template with the dated market guidance and citation. Fill in the company inputs before using it as an approval.
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
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold"
            />
          </div>
        </SecondaryPageSection>

        <SecondaryPageSection title={headings.citation}>
          <p className="text-xs text-slate-300">{callCitation}</p>
          <p className="text-xs text-slate-400">Data date: {recordDateLabel} · freshness: {fetchedAtLabel}.</p>
          <ul className="mt-3 space-y-1">
            {page.supportingLinks.map((link) => (
              <li key={link.href}><ActionLink href={link.href} variant="inline">{link.label}</ActionLink></li>
            ))}
          </ul>
        </SecondaryPageSection>

        <SecondaryPageSection title={headings.next}>
          <div className="flex flex-wrap gap-2">
            <ActionLink href="/" variant="pill">Weekly brief</ActionLink>
            <ActionLink href="/operate" variant="pill">Plan the week</ActionLink>
            <ActionLink href="/resources#answers" variant="pill">More direct answers</ActionLink>
            {relatedPages.map((related) => (
              <ActionLink key={related.slug} href={`/answers/${related.slug}`} variant="pill">{related.title}</ActionLink>
            ))}
          </div>
        </SecondaryPageSection>
      </div>
    </ContentPageShell>
  );
}
