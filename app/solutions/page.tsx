import type { Metadata } from "next";
import Link from "next/link";
import { buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../lib/seo";
import { snapshotData } from "../../lib/snapshot";

export const metadata: Metadata = buildPageMetadata({
  title: "Solutions hub for product and engineering leaders — Whether",
  description:
    "Choose the right decision workflow for roadmapping, engineering capacity, market regime planning, and career growth.",
  path: "/solutions",
  imageAlt: "Whether solutions hub",
  imageParams: {
    template: "solutions",
    eyebrow: "Solution hub",
    title: "Choose your decision workflow",
    subtitle: "Outcome-first paths for roadmaps, staffing, planning, and role growth.",
    kicker: "Whether operational solutions.",
  },
});

const solutionCards = [
  {
    title: "Product roadmapping",
    href: "/solutions/product-roadmapping",
    decision: "What should we ship now vs defer this quarter?",
    inputs: "Signal posture, confidence, roadmap candidate list",
    output: "A sequenced roadmap with explicit keep / pause / accelerate trade-offs",
  },
  {
    title: "Engineering capacity",
    href: "/solutions/engineering-capacity",
    decision: "How should staffing and commitment pace change right now?",
    inputs: "Capacity constraints, delivery commitments, market regime evidence",
    output: "A defendable capacity posture with trigger-based adjustment points",
  },
  {
    title: "Market regime playbook",
    href: "/solutions/market-regime-playbook",
    decision: "How should leaders align on one operating posture this week?",
    inputs: "Macro evidence summary, confidence score, downside scenarios",
    output: "A cross-functional keep / pause / accelerate operating call",
  },
  {
    title: "Career paths",
    href: "/solutions/career-paths",
    decision: "How do I demonstrate stronger product leadership judgment?",
    inputs: "Current role scope, decision habits, communication quality",
    output: "Role-specific weekly loop, proof points, and promotion-ready artifacts",
  },
] as const;

const intentRoutes = [
  {
    intent: "Plan roadmap trade-offs",
    href: "/solutions/product-roadmapping",
  },
  {
    intent: "Defend staffing and delivery decisions",
    href: "/solutions/engineering-capacity",
  },
  {
    intent: "Prepare executive market posture updates",
    href: "/solutions/market-regime-playbook",
  },
  {
    intent: "Grow toward next-level product leadership scope",
    href: "/solutions/career-paths",
  },
] as const;

export default function SolutionsHubPage() {
  const lastRefreshed = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(snapshotData.record_date));

  const solutionsStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Whether solutions hub",
    url: buildCanonicalUrl("/solutions"),
    description:
      "Outcome-first workflows for roadmapping, engineering capacity, market regime planning, and career growth.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: solutionCards.map((card, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: card.title,
        url: buildCanonicalUrl(card.href),
      })),
    },
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(solutionsStructuredData) }}
      />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Solutions hub</p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          Outcome-first workflows for product and engineering decisions.
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Pick your immediate decision goal and use a guided workflow that translates market signals
          into concrete plans, staffing calls, and leadership communication artifacts.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Start by intent</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {intentRoutes.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100"
            >
              {entry.intent}
            </Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Choose your solution</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {solutionCards.map((card) => (
            <article key={card.href} className="weather-surface flex h-full flex-col gap-3 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{card.title}</h3>
              <p className="text-sm text-slate-200">
                <span className="font-semibold text-slate-100">Decision:</span> {card.decision}
              </p>
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-slate-100">Inputs:</span> {card.inputs}
              </p>
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-slate-100">Output:</span> {card.output}
              </p>
              <Link
                href={card.href}
                className="weather-button-primary mt-auto inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.1em]"
              >
                Open workflow for {card.title}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Evidence freshness</h2>
        <p className="text-sm text-slate-300">
          Latest market snapshot: <span className="font-semibold text-slate-100">{lastRefreshed}</span>
        </p>
        <p className="text-sm text-slate-300">
          Confidence framing: treat guidance as a structured directional signal, then validate against
          live Signals before final commitments.
        </p>
      </section>
    </main>
  );
}
