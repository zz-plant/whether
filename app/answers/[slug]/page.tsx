import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildPageMetadata, serializeJsonLd } from "../../../lib/seo";
import { buildHomeBriefModel } from "../../../lib/report/homeBriefModel";
import { decisionAreaLabel } from "../../../lib/report/boundedDecisionRules";
import { buildCallCitation } from "../../../lib/export/briefBuilders";
import { buildLiveShortAnswer } from "../liveShortAnswers";
import { answerPages, findDecisionPage } from "../decisionPages";

type DecisionPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;
export const revalidate = 900;

export function generateStaticParams() {
  return answerPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: DecisionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = findDecisionPage(slug);
  if (!page) {
    return buildPageMetadata({
      title: "Operator decision answer",
      description: "Macro-backed operator decision answer pages.",
      path: "/answers",
    });
  }

  return buildPageMetadata({
    title: `${page.title} (Live operator answer)`,
    description: `${page.shortAnswer} Direct answer with bounded recommendations and threshold context.`,
    path: `/answers/${page.slug}`,
    imageAlt: page.title,
  });
}

export default async function DecisionAnswerPage({ params }: DecisionPageProps) {
  const { slug } = await params;
  const page = findDecisionPage(slug);
  if (!page) notFound();

  const reportResult = await loadReportDataSafe(undefined, { route: "/answers/[slug]" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, recordDateLabel, reportDynamics, treasury, fetchedAtLabel } = reportData;
  const homeBriefModel = buildHomeBriefModel(reportData);
  const liveShortAnswer = buildLiveShortAnswer(page.slug, assessment.regime, page.shortAnswer);
  const mappedRules = homeBriefModel.decisionRules.filter((rule) => page.mappedDecisionAreas.includes(rule.area));
  const callCitation = buildCallCitation(assessment, treasury);
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqData) }} />

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Direct answer</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{page.title}</h1>
        <p className="text-base text-sky-200">{liveShortAnswer}</p>
        <p className="text-sm text-slate-300">{page.directAnswer}</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Current posture context</h2>
        <p className="text-sm text-slate-200">Posture: {assessment.regime} · Weekly momentum: {reportDynamics.directionLabel} · Revisit decisions: {homeBriefModel.revisitDecisions ? "YES" : "NO"}</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Bounded recommendations</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {mappedRules.map((rule) => (
            <article key={rule.area} className="weather-surface space-y-2 px-4 py-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{decisionAreaLabel(rule.area)}</p>
              <p className="font-semibold text-slate-100">{rule.recommendation}</p>
              <p className="text-xs text-slate-300">Scope: {rule.scope}</p>
              <p className="text-xs text-rose-200">Pause: {rule.pauseTrigger}</p>
              <p className="text-xs text-emerald-200">Resume: {rule.resumeTrigger}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Threshold trigger</h2>
        <p className="text-sm text-slate-200">{thresholdTrigger}</p>
        <p className="text-sm text-slate-200">Current risk appetite: {assessment.scores.riskAppetite.toFixed(0)} / 100 · current tightness: {assessment.scores.tightness.toFixed(0)} / 100.</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Citation</h2>
        <p className="text-xs text-slate-300">{callCitation}</p>
        <p className="text-xs text-slate-400">Data date: {recordDateLabel} · freshness: {fetchedAtLabel}.</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Continue decision flow</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Weekly brief</Link>
          <Link href="/answers" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">All answers</Link>
          {relatedPages.map((related) => (
            <Link key={related.slug} href={`/answers/${related.slug}`} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
              {related.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
