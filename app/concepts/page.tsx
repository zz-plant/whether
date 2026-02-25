import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import {
  getArticlesByEra,
  productConceptEras,
  regimeToneByKey,
  getMacroContextForArticle,
} from "../../lib/productCanon";

export const metadata: Metadata = buildPageMetadata({
  title: "Product management canon in macro context — Whether",
  description:
    "Plot widely read PM essays against the macro regime history to explain why specific frameworks spread when they did.",
  path: "/concepts",
  imageAlt: "Product management concept timeline with macro context",
  imageParams: {
    template: "guides",
    eyebrow: "PM canon timeline",
    title: "Product essays in market context",
    subtitle: "See how famous PM ideas align with changing macro regimes.",
    kicker: "From feature shipping to outcome and AI-native strategy.",
  },
});

const formatPublishedLabel = (year: number, month: number) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

const eraIntro: Record<(typeof productConceptEras)[number], string> = {
  "Foundational classics":
    "Role-definition essays that established the modern PM identity in software organizations.",
  "Process & strategy shifters":
    "Frameworks that shifted teams from output tracking toward outcome accountability.",
  "Modern AI era":
    "Operating models for uncertainty, model risk, and principle-led product execution.",
  "Career & identity frameworks":
    "Cult classics PMs share to calibrate role expectations, growth, and career progression.",
  "Behavioral psychology & user growth":
    "Behavior and retention frameworks used to improve engagement and long-term value capture.",
  "Tactical masterclasses":
    "Practical playbooks PMs use for interviews, docs, and product-market-fit diagnostics.",
  "Institutional friction":
    "Pieces focused on translating strategy into execution inside real organizational constraints.",
};

export default function ProductConceptTimelinePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Product canon in context
        </p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Why famous PM ideas spread when they did
        </h1>
        <p className="text-sm text-slate-200">
          This timeline pairs widely read product-management essays with Whether&apos;s
          historical macro posture. It now includes foundational essays plus cult-classic
          career, growth-psychology, and tactical operating frameworks. Each article page
          explains what was said, why teams adopted it, and which market conditions likely
          reinforced the idea.
        </p>
      </section>

      {productConceptEras.map((era) => {
        const articles = getArticlesByEra(era);
        if (articles.length === 0) {
          return null;
        }

        return (
          <section key={era} className="weather-panel space-y-4 px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-100">{era}</h2>
            <p className="text-sm text-slate-300">{eraIntro[era]}</p>
            <ol className="space-y-3">
              {articles.map((article) => {
                const macroContext = getMacroContextForArticle(article);
                return (
                  <li key={article.slug} className="weather-surface space-y-3 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
                        {formatPublishedLabel(article.publishedYear, article.publishedMonth)}
                      </p>
                      {macroContext ? (
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${regimeToneByKey[macroContext.primary.summary.regime]}`}
                        >
                          {macroContext.primary.summary.regimeLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-slate-100">{article.title}</h3>
                      <p className="text-sm text-slate-300">
                        {article.author} · Focus: {article.focus}
                      </p>
                      <p className="text-sm text-slate-200">{article.summary}</p>
                    </div>
                    <Link
                      href={`/concepts/${article.slug}`}
                      className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
                    >
                      Open contextual breakdown
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </main>
  );
}
