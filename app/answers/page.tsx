import Link from "next/link";
import type { Metadata } from "next";
import { buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { tierOneDecisionPages } from "./decisionPages";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Startup operator decision answers",
  description:
    "Programmatic operator answers that map live macro posture to bounded startup decisions.",
  path: "/answers",
  imageAlt: "Whether operator answer cluster",
});

export default function AnswersHubPage() {
  const listData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Operator decision pages",
    itemListElement: tierOneDecisionPages.map((page, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: buildCanonicalUrl(`/answers/${page.slug}`),
      name: page.title,
    })),
  };

  const grouped = {
    climate: tierOneDecisionPages.filter((page) => page.category === "climate"),
    decision: tierOneDecisionPages.filter((page) => page.category === "decision"),
    explanation: tierOneDecisionPages.filter((page) => page.category === "explanation"),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(listData) }} />
      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Operator answer system</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decision pages, not macro blog posts</h1>
        <p className="text-sm text-slate-300">Each page resolves a high-intent query with direct answer, bounded rules, threshold flips, and citation-ready context.</p>
      </section>

      {([
        ["climate", "Climate queries"],
        ["decision", "Decision queries"],
        ["explanation", "Explanation queries"],
      ] as const).map(([key, title]) => (
        <section key={key} className="weather-panel space-y-4 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {grouped[key].map((page) => (
              <Link key={page.slug} href={`/answers/${page.slug}`} className="weather-surface min-h-[44px] space-y-2 px-4 py-4 text-sm text-slate-100 transition hover:border-sky-300/40 hover:bg-slate-900/80">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{page.keyword}</p>
                <p className="font-semibold text-slate-100">{page.title}</p>
                <p className="text-slate-300">{page.directAnswer}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
