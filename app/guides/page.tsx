import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { stageGuides } from "./stageGuides";
import { stakeholderGuides, stakeholderPositioning } from "./stakeholderGuides";

export const metadata: Metadata = buildPageMetadata({
  title: "What Whether Is — Whether",
  description:
    "Client-friendly overview of how Whether helps leadership teams set operating posture from live market conditions.",
  path: "/guides",
  imageAlt: "Whether overview for leadership teams",
});

const operatingQuestions = [
  "Push growth?",
  "Conserve cash?",
  "Hire carefully?",
  "Move aggressively?",
  "Delay big bets?",
] as const;

const monitoredSignals = [
  "Interest rates",
  "Credit conditions",
  "Market risk appetite",
  "Labor strength",
] as const;

const planningUseCases = [
  "Planning meetings",
  "Hiring approvals",
  "Budget reviews",
  "Board updates",
] as const;

export default function BriefPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          What it is
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          Whether helps your leadership team answer one practical question:
        </h1>
        <p className="text-lg text-slate-200">
          Given current market conditions, how should we operate right now?
        </p>
        <ul className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
          {operatingQuestions.map((question) => (
            <li key={question} className="weather-surface px-4 py-3">
              {question}
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-300">
          Instead of guessing or debating based on headlines, your team gets a
          structured, data-backed answer.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          What it does
        </p>
        <p className="text-sm text-slate-200">
          Whether continuously monitors key economic signals and translates them into
          clear operating guidance.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-base font-semibold text-slate-100">Signals monitored</h2>
            <ul className="space-y-2 text-sm text-slate-200">
              {monitoredSignals.map((signal) => (
                <li key={signal}>• {signal}</li>
              ))}
            </ul>
          </article>
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-base font-semibold text-slate-100">Guidance delivered</h2>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>• What to prioritize</li>
              <li>• What to avoid</li>
              <li>• Where risk is rising</li>
              <li>• Where opportunity is increasing</li>
            </ul>
          </article>
        </div>
        <p className="text-sm text-slate-300">
          It turns macro noise into actionable clarity.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Why that matters
        </p>
        <p className="text-sm text-slate-200">
          Most leadership teams feel market pressure but do not operationalize it.
          That often leads to conflicting opinions, inconsistent messaging, strategy
          drift, and emotional decision-making.
        </p>
        <p className="text-sm text-slate-300">
          Whether creates a shared baseline so leadership aligns on posture before
          debating tactics. It reduces internal friction.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          What makes it different
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-base font-semibold text-slate-100">What it does not do</h2>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>• Offer opinions</li>
              <li>• Predict the future</li>
              <li>• Publish commentary</li>
            </ul>
          </article>
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-base font-semibold text-slate-100">How it works</h2>
            <p className="text-sm text-slate-200">
              Uses transparent formulas and live public data to produce a consistent
              read of current market conditions.
            </p>
            <p className="text-sm text-slate-300">
              The output is practical guidance your team can use immediately.
            </p>
          </article>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          What clients experience
        </p>
        <article className="weather-surface space-y-3 px-4 py-4 text-sm text-slate-200">
          <p className="font-semibold text-slate-100">From:</p>
          <p>“We feel cautious.”</p>
          <p className="font-semibold text-slate-100">To:</p>
          <p>
            “Given tightening credit conditions and declining risk appetite, we’re
            prioritizing efficiency and runway protection this quarter.”
          </p>
        </article>
        <p className="text-sm text-slate-300">
          That shift signals operating maturity internally and externally.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Where teams use it
        </p>
        <ul className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
          {planningUseCases.map((item) => (
            <li key={item} className="weather-surface px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </section>


      <section className="weather-panel space-y-6 px-6 py-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Company stage pages
          </p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Seed through Series C operating playbooks.
          </h2>
          <p className="text-sm text-slate-300">
            Share stage-specific guidance with leadership teams so posture expectations match the
            company&apos;s coordination needs, burn profile, and board pressure.
          </p>
        </header>
        <div className="grid gap-4 xl:grid-cols-2">
          {stageGuides.map((stage) => (
            <article key={stage.slug} className="weather-surface space-y-3 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{stage.title}</h3>
              <p className="text-sm text-slate-200">{stage.primaryValue}</p>
              <p className="text-sm text-slate-300">{stage.summary}</p>
              <Link
                href={`/guides/stage/${stage.slug}`}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                Open {stage.title} guide →
              </Link>
            </article>
          ))}
        </div>
        <Link
          href="/guides/stage"
          className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
        >
          View full company stage map →
        </Link>
      </section>

      <section className="weather-panel space-y-6 px-6 py-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Stakeholder solutions
          </p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Explore role-specific pages for leadership teams.
          </h2>
          <p className="text-sm text-slate-300">
            Each role now has a dedicated page so your team can share tailored, search-friendly
            guidance for founders, product, finance, strategy, engineering, and boards.
          </p>
        </header>
        <div className="grid gap-4 xl:grid-cols-2">
          {stakeholderGuides.map((stakeholder) => (
            <article key={stakeholder.slug} className="weather-surface space-y-4 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">For {stakeholder.title}</h3>
              <p className="text-sm text-sky-200">{stakeholder.tagline}</p>
              <p className="text-sm text-slate-300">{stakeholder.seoDescription}</p>
              <Link
                href={`/guides/${stakeholder.slug}`}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                Open {stakeholder.title} page →
              </Link>
            </article>
          ))}
        </div>
        <article className="weather-surface space-y-4 px-4 py-4">
          <h3 className="text-base font-semibold text-slate-100">Condensed positioning by role</h3>
          <div className="flex flex-wrap gap-2">
            {stakeholderPositioning.map((line) => (
              <p
                key={line}
                className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
              >
                {line}
              </p>
            ))}
          </div>
        </article>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          In one sentence
        </p>
        <p className="text-lg font-medium text-slate-100">
          Whether helps leadership teams adjust their operating posture based on real
          market conditions — not headlines or gut feel.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
          >
            Open the app
          </Link>
          <Link
            href="/operations"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Open operations workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
