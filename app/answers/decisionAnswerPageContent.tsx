import { notFound } from "next/navigation";
import { serializeJsonLd } from "../../lib/seo";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import { buildLiveDirectAnswer, buildLiveShortAnswer } from "./liveShortAnswers";
import { answerPages, findDecisionPage } from "./decisionPages";
import { buildSeoDecisionPayload } from "../../lib/report/seoDecisionPayload";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ButtonLink } from "../components/ui/buttonLink";
import { publicDecisionLabels } from "../../lib/report/reportFormatting";

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
  const liveShortAnswer = buildLiveShortAnswer({ payload, fallback: page.shortAnswer });
  const liveDirectAnswer = buildLiveDirectAnswer({ payload, fallback: page.directAnswer });
  const relatedPages = answerPages.filter((candidate) => candidate.slug !== page.slug && candidate.category !== page.category).slice(0, 3);

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: page.title,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${liveShortAnswer} Threshold context: risk appetite ${assessment.scores.riskAppetite.toFixed(0)} vs ${assessment.thresholds.riskAppetiteRegime.toFixed(0)}, tightness ${assessment.scores.tightness.toFixed(0)} vs ${assessment.thresholds.tightnessRegime.toFixed(0)}.`,
        },
      },
    ],
  };

  const thresholdTrigger =
    page.thresholdFocus === "tightness"
      ? `Trigger tighter mode if capital tightness rises above ${assessment.thresholds.tightnessRegime.toFixed(0)}.`
      : page.thresholdFocus === "risk"
        ? `Trigger tighter mode if risk appetite falls below ${assessment.thresholds.riskAppetiteRegime.toFixed(0)}.`
        : `Trigger tighter mode if risk appetite < ${assessment.thresholds.riskAppetiteRegime.toFixed(0)} or tightness > ${assessment.thresholds.tightnessRegime.toFixed(0)}.`;

  return (
    <SecondaryPageShell width="narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqData) }} />

      <SecondaryPageHeader
        eyebrow="Direct answer"
        title={page.title}
        description={liveDirectAnswer}
        aside={(
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Short answer</p>
            <p className="text-sm font-semibold text-sky-200">{liveShortAnswer}</p>
            {payload.noindex ? (
              <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Degraded signal quality: fallback mode and noindex remain active until freshness, completeness, and provenance checks pass.
              </p>
            ) : null}
          </div>
        )}
      />

      <SecondaryPageSection title="Current posture context">
        <p className="text-sm text-slate-200">Posture: {displayRegime.label} ({displayRegime.canonicalRegime}) · Weekly momentum: {reportDynamics.directionLabel} · Revisit decisions: {homeBriefModel.revisitDecisions ? "YES" : "NO"}</p>
      </SecondaryPageSection>

      <SecondaryPageSection title="Bounded recommendations">
        <div className="grid gap-3 sm:grid-cols-2">
          {mappedRules.map((rule) => (
            <article key={rule.area} className="weather-surface space-y-2 px-4 py-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{decisionAreaLabel(rule.area)}</p>
              <p className="font-semibold text-slate-100">{rule.recommendation}</p>
              <p className="text-xs text-slate-300">Scope: {rule.scope}</p>
              <p className="text-xs text-rose-200">{publicDecisionLabels.threshold}: {rule.pauseTrigger}</p>
              <p className="text-xs text-emerald-200">{publicDecisionLabels.reversal}: {rule.resumeTrigger}</p>
            </article>
          ))}
        </div>
      </SecondaryPageSection>

      <SecondaryPageSection title="Threshold trigger">
        <p className="text-sm text-slate-200">{thresholdTrigger}</p>
        <p className="text-sm text-slate-200">Current risk appetite: {assessment.scores.riskAppetite.toFixed(0)} / 100 · current tightness: {assessment.scores.tightness.toFixed(0)} / 100.</p>
      </SecondaryPageSection>

      <SecondaryPageSection title="Citation">
        <p className="text-xs text-slate-300">{callCitation}</p>
        <p className="text-xs text-slate-400">Data date: {recordDateLabel} · freshness: {fetchedAtLabel}.</p>
        {payload.degraded ? <p className="text-xs text-amber-200">Degraded data mode: {(payload.noindexReasons ?? []).join(", ") || "cached/stale signals"}; this answer is marked noindex.</p> : null}
      </SecondaryPageSection>

      <SecondaryPageSection title="Continue decision flow">
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/" variant="pill">Weekly brief</ButtonLink>
          <ButtonLink href="/decide#unresolved-question-router" variant="pill">Decision Tools</ButtonLink>
          <ButtonLink href="/operations" variant="pill">Operating guardrails</ButtonLink>
          <ButtonLink href="/decide#direct-answers" variant="pill">More direct answers</ButtonLink>
          {relatedPages.map((related) => (
            <ButtonLink key={related.slug} href={`/answers/${related.slug}`} variant="pill">{related.title}</ButtonLink>
          ))}
        </div>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
}
