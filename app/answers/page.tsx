import Link from "next/link";
import type { Metadata } from "next";
import { buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { answerCategories, answerPages } from "./decisionPages";
import { featuredAnswerPages } from "./selectors";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Operator decision answers",
  description: "Direct-answer pages mapped to canonical bounded rules and weekly posture thresholds.",
  path: "/answers",
  imageAlt: "Whether operator answer cluster",
  imagePath: "/social/answers.svg",
});

export default async function AnswersHubPage() {
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/answers" });
  const { displayRegime, weeklyDecisionCardModel } = snapshot;
  const listData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Operator answer pages",
    itemListElement: answerPages.map((page, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: buildCanonicalUrl(`/answers/${page.slug}`),
      name: page.title,
    })),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(listData) }} />
      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Operator answer hub</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Direct answers mapped to canonical decisions</h1>
        <p className="text-sm text-slate-300">Answer first, then bounded policy + threshold triggers + weekly brief linkback. Total pages: {answerPages.length}.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
            Open weekly brief
          </Link>
          <Link href="/signals" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">
            Review evidence
          </Link>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Current weekly posture</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="weather-surface px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Posture now</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{displayRegime.label}</p>
            <p className="mt-1 text-xs text-slate-300">{reportData.weeklyRecordDateLabel}</p>
          </article>
          <article className="weather-surface px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Immediate implication</p>
            <p className="mt-2 text-sm text-slate-200">{weeklyDecisionCardModel.decision.immediateDecision}</p>
          </article>
          <article className="weather-surface px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Flip condition</p>
            <p className="mt-2 text-sm text-slate-200">{weeklyDecisionCardModel.decision.reversalTrigger}</p>
          </article>
        </div>
        <p className="text-sm text-slate-300">
          Use `/answers` when you need a direct, shareable answer to one operating question. Use the weekly brief when you need the full planning baseline for this week.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Distribution-ready direct pages</h2>
        <p className="text-sm text-slate-300">Answer exact operator queries and route back to the weekly brief artifact.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {featuredAnswerPages.map((page) => (
            <Link key={page.slug} href={`/answers/${page.slug}`} className="weather-surface min-h-[44px] px-4 py-3 text-sm font-semibold text-slate-100">
              {page.title}
            </Link>
          ))}
        </div>
      </section>

      {answerCategories.map((category) => {
        const pages = answerPages.filter((page) => page.category === category.key);
        if (pages.length === 0) return null;
        return (
          <section key={category.key} className="weather-panel space-y-4 px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-100">{category.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {pages.map((page) => (
                <Link key={page.slug} href={`/answers/${page.slug}`} className="weather-surface min-h-[44px] space-y-2 px-4 py-4 text-sm text-slate-100 transition hover:border-sky-300/40 hover:bg-slate-900/80">
                  <p className="font-semibold text-slate-100">{page.keyword}</p>
                  <p className="text-slate-300">{page.shortAnswer}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
