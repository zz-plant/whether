import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildPageMetadata, serializeJsonLd } from "../../../lib/seo";
import { buildLiveShortAnswer, isExpansionRegime } from "../liveShortAnswers";
import { findDecisionPage, tierOneDecisionPages } from "../decisionPages";

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
    title: `${page.title} (Live macro answer)`,
    description: `${page.shortAnswer} Deterministic answer powered by risk appetite, capital tightness, and yield curve signals.`,
    path: `/answers/${page.slug}`,
    imageAlt: page.title,
    imageParams: {
      template: "guides",
      eyebrow: "Operator answer",
      title: page.title,
      subtitle: page.shortAnswer,
      kicker: "Live thresholds + trigger reversals",
    },
  });
}

const toSignalLabel = (isExpansion: boolean) => (isExpansion ? "Expansion with guardrails" : "Safety mode");

const buildApprovalVelocityGuidance = (directionLabel: "improving" | "deteriorating" | "mixed" | "stable") => {
  if (directionLabel === "improving") return "+1 notch vs last week";
  if (directionLabel === "deteriorating") return "-1 notch vs last week";
  if (directionLabel === "mixed") return "0 notch vs last week";
  return "0 notch vs last week";
};

export default async function DecisionAnswerPage({ params }: DecisionPageProps) {
  const { slug } = await params;
  const page = findDecisionPage(slug);

  if (!page) {
    notFound();
  }

  const reportResult = await loadReportDataSafe(undefined, { route: "/answers/[slug]" });
  const { assessment, recordDateLabel, reportDynamics } = reportResult.ok ? reportResult.data : reportResult.fallback;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const isExpansion = isExpansionRegime(assessment.regime);
  const liveShortAnswer = buildLiveShortAnswer(page.slug, assessment.regime, page.shortAnswer);

  const approvalVelocity = buildApprovalVelocityGuidance(reportDynamics.directionLabel);

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: page.title,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${liveShortAnswer} Current posture is ${toSignalLabel(isExpansion)} with risk appetite ${assessment.scores.riskAppetite.toFixed(0)}, tightness ${assessment.scores.tightness.toFixed(0)}, and yield curve slope ${(assessment.scores.curveSlope ?? 0).toFixed(2)}%.`,
        },
      },
      {
        "@type": "Question",
        name: "When does this answer flip?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Flip to constraint mode if risk appetite falls below ${riskThreshold.toFixed(0)}, tightness rises above ${tightnessThreshold.toFixed(0)}, or if two weaker weekly reads occur consecutively.`,
        },
      },
    ],
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqData) }} />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tier 1 operator answer</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{page.title}</h1>
        <p className="text-sm text-slate-300">Keyword target: <span className="font-semibold text-slate-100">{page.keyword}</span></p>
        <p className="text-base text-sky-200">Short answer: {liveShortAnswer}</p>
        <p className="text-sm text-slate-300">Current posture: {toSignalLabel(isExpansion)}</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Why this answer</h2>
        <ol className="space-y-3 text-sm text-slate-200">
          <li className="weather-surface px-4 py-3">1. Risk appetite: <span className="font-semibold text-slate-100">{assessment.scores.riskAppetite.toFixed(0)} / 100</span> (threshold {riskThreshold.toFixed(0)}).</li>
          <li className="weather-surface px-4 py-3">2. Tightness: <span className="font-semibold text-slate-100">{assessment.scores.tightness.toFixed(0)} / 100</span> (constraint trigger {tightnessThreshold.toFixed(0)}).</li>
          <li className="weather-surface px-4 py-3">3. Yield curve slope: <span className="font-semibold text-slate-100">{(assessment.scores.curveSlope ?? 0).toFixed(2)}%</span>.</li>
        </ol>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What this means for operators</h2>
        <p className="text-sm text-slate-300">Primary audience: {page.audience}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="weather-surface space-y-2 px-4 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">Recommended</h3>
            <ul className="space-y-2 text-sm text-slate-200">
              {page.recommendedActions.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
          <div className="weather-surface space-y-2 px-4 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-300">Avoid</h3>
            <ul className="space-y-2 text-sm text-slate-200">
              {page.avoidActions.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Approval velocity guidance</h2>
        <p className="weather-surface px-4 py-3 text-sm text-slate-200">Approval pace: <span className="font-semibold text-slate-100">{approvalVelocity}</span>. No acceleration required — no freeze warranted.</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">When this answer flips</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• Risk appetite falls below {riskThreshold.toFixed(0)}.</li>
          <li>• Tightness rises above {tightnessThreshold.toFixed(0)}.</li>
          <li>• Two weaker weekly reads occur consecutively.</li>
        </ul>
        <p className="text-sm text-slate-300">Monitor weekly and re-run operating plans after each threshold check.</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Internal link cluster</h2>
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
          <Link href="/signals" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Signals evidence</Link>
          <Link href="/toolkits" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Operator toolkits</Link>
          <Link href="/start" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Command center</Link>
          <Link href="/answers" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">All Tier 1 answers</Link>
          <Link href={"/startup-macro-posture" as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-slate-100">Startup macro posture</Link>
        </div>
        <p className="text-xs text-slate-400">Last updated: {recordDateLabel}. Source: US Treasury + FRED + BLS live feeds. Next refresh: 15 minutes.</p>
      </section>
    </main>
  );
}
