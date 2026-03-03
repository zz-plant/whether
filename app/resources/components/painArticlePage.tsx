import type { Metadata } from "next";
import Link from "next/link";
import {
  buildCanonicalUrl,
  buildPageMetadata,
  organizationName,
  serializeJsonLd,
} from "../../../lib/pageMetadata";
import type { PainArticle } from "../../../lib/painArticles";
import { CopyAnchorButton } from "./copyAnchorButton";

const boardFrameworkPath = "/resources/board-level-capital-posture-framework";

const sharedDeepDiveSections = [
  {
    heading: "Implementation operating cadence (weeks 1-12)",
    paragraphs: [
      "Week 1 should produce one source-of-truth decision inventory. List every meaningful commitment across hiring, roadmap, vendor spend, and channel investment. For each item, document owner, expected business effect, time-to-evidence, and reversal path. Most organizations skip this step because it feels administrative, but without it you cannot prioritize risk. In high-pressure periods, invisible commitments become the real source of runway erosion because they continue by inertia. By forcing a complete inventory early, leadership converts diffuse anxiety into a tractable operating map.",
      "Weeks 2 through 4 should establish threshold design and meeting cadence. Select a small set of indicators that are decision-relevant and resistant to vanity inflation: retention quality, conversion efficiency, delivery reliability, burn multiple movement, and forecast error. Then assign explicit breach duration rules. A single weak week should trigger diagnostic review, not wholesale posture change. Two or more persistent breaches should trigger escalation. The discipline here is consistency, not prediction perfection. Consistent trigger application is what allows teams to make hard calls without re-litigating governance every cycle.",
      "Weeks 5 through 8 should focus on tranche execution. Every RISKY item should move in bounded increments with kill criteria, while SAFE items continue through a lighter approval path. This period is where most teams discover mismatches between declared posture and practical behavior. Expect to adjust owner maps, escalation SLAs, and reporting format. Weeks 9 through 12 should emphasize retrospective quality: which triggers fired, which decisions reversed, how quickly rollback happened, and what friction slowed action. The board does not need perfect outcomes; it needs evidence that the operating system is becoming more reliable under stress.",
    ],
  },
  {
    heading: "Failure modes to avoid while pressure is high",
    paragraphs: [
      "Failure mode one is precision theater: adding more dashboards, more scoring columns, and more committees without improving decision speed or quality. Complexity often masquerades as rigor. A good governance system should lower ambiguity and reduce meeting debt. If your process takes longer each week while confidence remains flat, simplify aggressively. Keep the metric set short, the escalation rules explicit, and the artifact format reusable. Leadership attention is a scarce resource; spending it on reporting choreography instead of corrective action is a hidden cost of poor posture design.",
      "Failure mode two is exception creep. Teams begin with clear SAFE / RISKY / DANGEROUS classes, then gradually grant ad hoc exceptions because each request sounds urgent in isolation. Over time, policy dissolves while everyone still claims discipline. Prevent this by forcing all exceptions into the same log with business rationale, owner, expiry date, and review checkpoint. Expired exceptions should auto-escalate rather than silently persist. This one habit dramatically improves board trust because it shows not only what was approved but also how temporary risk decisions are being managed.",
      "Failure mode three is delayed reversal. Leaders often wait for certainty before stopping a decision stream, especially when reputational stakes are high. In tightening conditions, delayed reversals are usually more expensive than imperfect reversals. Build social permission for early correction: separate process quality from outcome quality, publish reversal learnings without blame language, and reward teams for disciplined stops that preserve capital for better bets. The organization that can reverse calmly and quickly has a structural advantage over one that only knows how to commit and defend.",
    ],
  },
];


const canonicalPillarPath = "/resources/capital-discipline-venture-backed-companies";

const buildAnchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

export const buildPainArticleMetadata = (article: PainArticle): Metadata =>
  buildPageMetadata({
    title: article.title,
    description: article.description,
    path: `/resources/${article.slug}`,
    imageAlt: article.title,
    imageParams: {
      template: "guides",
      title: article.title,
    },
  });

export function PainArticlePage({ article }: { article: PainArticle }) {
  const canonicalUrl = buildCanonicalUrl(`/resources/${article.slug}`);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: { "@type": "Organization", name: organizationName },
    publisher: { "@type": "Organization", name: organizationName },
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    keywords: [article.keyword, "capital posture", "board memo"],
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }} />

      <div className="space-y-6 print:text-black">
        <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Problem-first operating brief</p>
          <h1 className="text-2xl font-semibold text-slate-100 print:text-slate-900 sm:text-3xl">{article.title}</h1>
          <p className="text-sm text-slate-200 print:text-slate-700">{article.description}</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/resources/decision-shield-overview" className="text-sky-200 underline underline-offset-4">Decision Shield</Link>
            <span className="text-slate-500">•</span>
            <Link href="/resources/capital-posture-template" className="text-sky-200 underline underline-offset-4">Capital Posture Template</Link>
          </div>
        </section>

        <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
          <h2 className="text-lg font-semibold text-slate-100 print:text-slate-900">Board-facing summary block (forwardable)</h2>
          <ul className="space-y-2 text-sm text-slate-200 print:text-slate-700">
            {article.boardSummary.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </section>

        {[...article.sections, ...sharedDeepDiveSections].map((section) => {
          const anchor = buildAnchor(section.heading);
          return (
            <section id={anchor} key={section.heading} className="weather-panel space-y-3 px-6 py-6 scroll-mt-24 print:border print:border-slate-300 print:bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-100 print:text-slate-900">{section.heading}</h2>
                <CopyAnchorButton anchor={anchor} />
              </div>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-slate-200 print:text-slate-700">{paragraph}</p>)}
            </section>
          );
        })}

        <section className="weather-panel space-y-3 px-6 py-6 print:border print:border-slate-300 print:bg-white">
          <h2 className="text-lg font-semibold text-slate-100 print:text-slate-900">FAQ</h2>
          {article.faqs.map((faq) => (
            <div key={faq.question} className="space-y-1 border-t border-slate-700/80 pt-3 first:border-0 first:pt-0">
              <h3 className="text-sm font-semibold text-slate-100 print:text-slate-900">{faq.question}</h3>
              <p className="text-sm text-slate-200 print:text-slate-700">{faq.answer}</p>
            </div>
          ))}
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="weather-panel sticky top-24 space-y-3 px-5 py-5 print:hidden">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Next action</h2>
          <Link href={article.toolLink.href} className="weather-button inline-flex w-full items-center justify-center" data-conversion-event="download">
            {article.toolLink.label}
          </Link>
          <Link href="/resources/decision-shield-overview" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100" data-conversion-event="request">
            Open Decision Shield
          </Link>
          <div className="space-y-2 border-t border-slate-700/80 pt-3 text-xs text-slate-300">
            <p className="font-semibold text-slate-100">Internal links</p>
            <Link href={canonicalPillarPath} className="block text-sky-200 underline underline-offset-4">Capital Discipline pillar</Link>
            <Link href={boardFrameworkPath} className="block text-sky-200 underline underline-offset-4">Board-level Capital Posture Framework</Link>
            <Link href={article.toolLink.href} className="block text-sky-200 underline underline-offset-4">Tool page</Link>
          </div>
        </div>
      </aside>
    </main>
  );
}
