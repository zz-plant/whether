import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildPageMetadata, serializeJsonLd } from "../../../lib/seo";
import { findDecisionPage, tierOneDecisionPages } from "../decisionPages";
import { deriveDecisionKnobs } from "../../../lib/report/decisionKnobs";
import { buildBoundedDecisionRules } from "../../../lib/report/boundedDecisionRules";
import { buildCallCitation } from "../../../lib/export/briefBuilders";

type DecisionPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;
export const revalidate = 900;

export function generateStaticParams() {
  return tierOneDecisionPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: DecisionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = findDecisionPage(slug);

  if (!page) {
    return buildPageMetadata({
      title: "Operator decision answer",
      description: "Macro-backed operator decision answer pages.",
      path: "/answers",
      imageAlt: "Whether operator answers",
    });
  }

  return buildPageMetadata({
    title: `${page.title} (live operator answer)`,
    description: `${page.directAnswer} Bounded operating policy with threshold-based stop/resume triggers.`,
    path: `/answers/${page.slug}`,
    imageAlt: page.title,
  });
}

export default async function DecisionAnswerPage({ params }: DecisionPageProps) {
  const { slug } = await params;
  const page = findDecisionPage(slug);

  if (!page) {
    notFound();
  }

  const reportResult = await loadReportDataSafe(undefined, { route: "/answers/[slug]" });
  const data = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, recordDateLabel, reportDynamics, treasury, treasuryProvenance, regimeSeries } = data;
  const decisionKnobs = deriveDecisionKnobs(assessment.regime, 0, {
    nearestThresholdGap: Math.min(
      Math.abs(assessment.scores.tightness - assessment.thresholds.tightnessRegime),
      Math.abs(assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime),
    ),
    weakSignalCount: reportDynamics.changedSignals.filter((item) => item.delta !== 0).length,
  });
  const rules = buildBoundedDecisionRules({
    assessment,
    decisionKnobs,
    directionLabel: reportDynamics.directionLabel,
  }).filter((rule) => page.decisionAreas.includes(rule.area));
  const citation = buildCallCitation(assessment, treasury);
  const memoryRail = regimeSeries.slice(-4).map((entry) => `${entry.month}/${String(entry.year).slice(-2)} ${entry.regime}`);

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: page.title,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${page.directAnswer} Current posture ${assessment.regime} with risk appetite ${assessment.scores.riskAppetite.toFixed(0)} and tightness ${assessment.scores.tightness.toFixed(0)}.`,
        },
      },
    ],
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqData) }} />

      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{page.category} query</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{page.title}</h1>
        <p className="text-base font-semibold text-sky-200">{page.directAnswer}</p>
        <p className="text-sm text-slate-300">Current posture: {assessment.regime} · Updated {recordDateLabel}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Bounded recommendations</h2>
        <ul className="space-y-3 text-sm text-slate-200">
          {rules.map((rule) => (
            <li key={rule.area} className="weather-surface space-y-1 px-4 py-3">
              <p className="font-semibold text-slate-100">{rule.title}</p>
              <p>{rule.recommendation}</p>
              <p>Scope: {rule.scope}</p>
              <p className="text-amber-200">Stop: {rule.pauseTrigger}</p>
              <p className="text-emerald-200">Resume: {rule.resumeTrigger}</p>
              <p className="text-xs text-slate-400">Why: {rule.rationale}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Threshold context</h2>
        <p className="text-sm text-slate-200">Risk appetite {assessment.scores.riskAppetite.toFixed(0)} (threshold {assessment.thresholds.riskAppetiteRegime.toFixed(0)}).</p>
        <p className="text-sm text-slate-200">Capital tightness {assessment.scores.tightness.toFixed(0)} (threshold {assessment.thresholds.tightnessRegime.toFixed(0)}).</p>
        <p className="text-sm text-slate-300">Decision delta: {reportDynamics.directionLabel}.</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What to debate this week</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {page.supportPoints.map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>
        <p className="text-sm text-slate-300">Audience: {page.audience}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Cite this call</h2>
        <p className="whitespace-pre-line text-xs text-slate-300">{citation}</p>
        <p className="text-xs text-slate-400">Freshness: {treasuryProvenance.ageLabel} · Source basis: {treasury.source}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Continuity</h2>
        <p className="text-sm text-slate-300">Last 4 weeks:</p>
        <div className="flex flex-wrap gap-2">
          {memoryRail.map((item) => (
            <span key={item} className="weather-pill inline-flex min-h-[36px] items-center px-3 py-1 text-xs text-slate-200">{item}</span>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Go to weekly brief</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Weekly operating brief</Link>
          <Link href="/answers" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">All answer pages</Link>
        </div>
      </section>
    </main>
  );
}
