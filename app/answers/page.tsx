import Link from "next/link";
import type { Metadata, Route } from "next";
import { buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { tierOneDecisionPages, tierThreeKeywords, tierTwoKeywords } from "./decisionPages";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Operator decision answers",
  description:
    "Tiered keyword cluster for high-intent startup operator queries with deterministic, threshold-based macro answers.",
  path: "/answers",
  imageAlt: "Whether operator answer cluster",
  imageParams: {
    template: "guides",
    eyebrow: "Operator SEO cluster",
    title: "Tier 1 decision answers",
    subtitle: "Deterministic startup operating calls",
    kicker: "Risk appetite + tightness + yield curve",
  },
});

export default function AnswersHubPage() {
  const listData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tier 1 operator decision pages",
    itemListElement: tierOneDecisionPages.map((page, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `/answers/${page.slug}`,
      name: page.title,
    })),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(listData) }} />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Programmatic cluster</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Tier 1 decision-stage pages</h1>
        <p className="text-sm text-slate-300">Exact-match query pages for founder, VP Engineering, and CFO decisions. Every page shares one schema, one deterministic signal stack, and one trigger-reversal pattern.</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Tier 1 pages (launch now)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {tierOneDecisionPages.map((page, index) => (
            <Link key={page.slug} href={`/answers/${page.slug}`} className="weather-surface min-h-[44px] space-y-2 px-4 py-4 text-sm text-slate-100 transition hover:border-sky-300/40 hover:bg-slate-900/80">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">#{index + 1} keyword</p>
              <p className="font-semibold text-slate-100">{page.keyword}</p>
              <p className="text-slate-300">{page.shortAnswer}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Scalable template spec</h2>
        <ol className="space-y-2 text-sm text-slate-200">
          <li>1. Query-exact H1 + short answer in first viewport.</li>
          <li>2. Deterministic signal block (risk appetite, tightness, yield curve) with thresholds.</li>
          <li>3. Operator actions split into Recommended vs Avoid.</li>
          <li>4. Explicit trigger reversals that flip the recommendation.</li>
          <li>5. Timestamp + source line + fixed refresh interval.</li>
          <li>6. Standard schema (`FAQPage` on leaf pages, `ItemList` on hub).</li>
        </ol>
      </section>


      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Category authority layer</h2>
        <p className="text-sm text-slate-200">Tie every decision page to a canonical category definition and named index so search engines and AI systems see coherent topical ownership.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={"/startup-macro-posture" as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Startup macro posture anchor</Link>
          <Link href={"/startup-macro-posture/index" as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Named index page</Link>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Internal linking cluster map</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Tier 1 (decision)</p>
            <p className="text-sm text-slate-200">Each Tier 1 page links to /signals, /toolkits, /start, and this hub.</p>
          </div>
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">Tier 2 (strategy)</p>
            <ul className="space-y-1 text-sm text-slate-300">{tierTwoKeywords.map((keyword) => <li key={keyword}>• {keyword}</li>)}</ul>
          </div>
          <div className="weather-surface space-y-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Tier 3 (signal translation)</p>
            <ul className="space-y-1 text-sm text-slate-300">{tierThreeKeywords.map((keyword) => <li key={keyword}>• {keyword}</li>)}</ul>
          </div>
        </div>
      </section>
    </main>
  );
}
