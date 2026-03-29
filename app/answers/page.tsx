import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { answerCategories, answerPages } from "./decisionPages";
import { featuredAnswerPages } from "./selectors";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { SecondarySurfaceStartBlock } from "../components/secondarySurfaceStartBlock";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../components/secondaryPageShell";
import { ButtonLink } from "../components/ui/buttonLink";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Answers — one operating question at a time",
  description: "Downstream answer library for one operating question after Decision Tools has already narrowed what needs answering.",
  path: "/answers",
  imageAlt: "Whether operator answer cluster",
  imagePath: "/social/answers.svg",
});

export default async function AnswersHubPage() {
  redirect("/decide#direct-answers");
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
    <SecondaryPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(listData) }} />
      <SecondarySurfaceStartBlock surface="answers" />
      <SecondaryPageHeader
        eyebrow="Downstream direct-answer library"
        title="Use this only when the question is already crisp."
        description={`Decision Tools should route you here after the question type is clear. Each answer stays linked to the live weekly posture, immediate implication, and change-course signal. Featured answers: ${featuredAnswerPages.length}.`}
        actions={(
          <>
            <ButtonLink href="/decide#direct-answers" variant="primary">
              Return to Decision Tools
            </ButtonLink>
            <ButtonLink href="#featured-answers" variant="pill">
              Open pinned answers
            </ButtonLink>
          </>
        )}
      />

      <SecondaryPageSection className="scroll-mt-28" title="Current weekly posture">
        <p className="text-sm text-slate-300">
          Use the answer cards below only when one question needs a direct answer right now. If you still need help deciding which question to ask, go back to Decision Tools instead of browsing the library.
        </p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Change course if</p>
            <p className="mt-2 text-sm text-slate-200">{weeklyDecisionCardModel.decision.reversalTrigger}</p>
          </article>
        </div>
      </SecondaryPageSection>

      <SecondaryPageSection
        className="scroll-mt-28"
        title="Pinned answers from Decision Tools"
        description="Pick the answer that matches the decision you already know you need to make now."
      >
        <div id="featured-answers" className="grid gap-3 sm:grid-cols-2">
          {featuredAnswerPages.map((page) => (
            <Link key={page.slug} href={`/answers/${page.slug}`} className="weather-surface min-h-[44px] space-y-2 px-4 py-4 text-sm text-slate-100 transition hover:border-sky-300/40 hover:bg-slate-900/80">
              <p className="font-semibold text-slate-100">{page.title}</p>
              <p className="text-slate-300">{page.shortAnswer}</p>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href="/decide#direct-answers" variant="pill">
            Need routing help instead?
          </ButtonLink>
        </div>
      </SecondaryPageSection>

      <details className="weather-panel space-y-3 px-6 py-6">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Open the rest of the downstream answer library ({answerPages.length})
        </summary>
        <div className="mt-4 space-y-6">
          {answerCategories.map((category) => {
            const pages = answerPages.filter((page) => page.category === category.key);
            if (pages.length === 0) return null;
            return (
              <section key={category.key} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">{category.label}</h2>
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
        </div>
      </details>
    </SecondaryPageShell>
  );
}
