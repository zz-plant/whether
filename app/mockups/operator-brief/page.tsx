import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import {
  MockupShell,
  parseDensityMode,
  parseViewportMode,
} from "../components/mockupShell";

export const metadata: Metadata = {
  title: "Mockup — Operator-First Weekly Brief",
  description: "Concept mockups for a simpler operator-first Whether experience.",
  robots: {
    index: false,
    follow: false,
  },
};

const weeklyCall = {
  currentCall: "Move carefully forward.",
  whatChanged:
    "Funding conditions are still selective, but the read is more stable than last week and no longer supports a broad freeze.",
  actionNow:
    "Reopen selective hiring for revenue-linked product and platform work.",
  pauseIf:
    "Confidence falls or funding conditions tighten again on next week's read.",
  changeCourseIf:
    "The next read confirms improving stability without a renewed caution signal.",
  readiness: "Act with caution",
  readinessDetail: "Good enough for weekly planning. Keep new fixed-cost commitments reversible.",
  shareableLine: "Reopen selective hiring, not broad expansion.",
} as const;

const backdropItems = [
  { label: "Hiring market", value: "Selective open" },
  { label: "Expansion market", value: "Still bounded" },
  { label: "Raise market", value: "Improving, not easy" },
] as const;

const proofItems = [
  {
    label: "Signal",
    value:
      "Rates are not easing fast, but the latest read no longer argues for a fresh clampdown.",
  },
  {
    label: "Operator meaning",
    value:
      "Add targeted capacity where it improves near-term delivery or revenue, but keep broad fixed-cost expansion on hold.",
  },
  {
    label: "Proof verdict",
    value:
      "Safe enough to act this week. If the next read weakens, roll back to strict hiring controls.",
  },
] as const;

const operatorBriefBullets = [
  "Add only hires tied to shipped roadmap or near-term revenue.",
  "Keep payback expectations tight on new roadmap bets.",
  "Wait on category expansions until the stability read improves again.",
] as const;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
      {children}
    </p>
  );
}

function DecisionCard({
  label,
  value,
  toneClassName,
}: {
  label: string;
  value: string;
  toneClassName: string;
}) {
  return (
    <article className={`rounded-md border p-4 ${toneClassName}`}>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-2 text-sm font-medium leading-6">{value}</p>
    </article>
  );
}

export default async function OperatorBriefMockupPage({
  searchParams,
}: {
  searchParams?: Promise<{ viewport?: string; density?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const viewport = parseViewportMode(resolvedSearchParams?.viewport);
  const density = parseDensityMode(resolvedSearchParams?.density);

  return (
    <MockupShell
      pathname="/mockups/operator-brief"
      title="Operator-First Weekly Brief"
      description="A concept route for testing a tighter operator-first Whether experience across viewport sizes before touching the main product."
      viewport={viewport}
      density={density}
    >
      <section className="relative overflow-hidden rounded-lg border border-cyan-300/20 bg-slate-950/80 px-4 py-5 sm:px-6 sm:py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(42rem 22rem at 0% 0%, rgba(34, 211, 238, 0.14), transparent 60%), radial-gradient(28rem 16rem at 100% 0%, rgba(251, 191, 36, 0.12), transparent 58%), linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(2, 6, 23, 0.97))",
          }}
        />
        <div className="relative space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-[38px] items-center rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-50">
              Weekly brief
            </span>
            <span className="inline-flex min-h-[38px] items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
              Default lens: Product / Eng
            </span>
            <span className="inline-flex min-h-[38px] items-center rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-50">
              Decision readiness: {weeklyCall.readiness}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
            <div className="rounded-lg border border-slate-700/70 bg-slate-900/72 p-5">
              <SectionLabel>{publicDecisionLabels.call}</SectionLabel>
              <h1
                className="mt-3 text-3xl font-semibold text-white sm:text-[2.5rem]"
                style={{ fontFamily: "var(--weather-font-display)" }}
              >
                {weeklyCall.currentCall}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                {weeklyCall.whatChanged}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-4">
                  <SectionLabel>{publicDecisionLabels.action}</SectionLabel>
                  <p className="mt-2 text-base font-semibold text-emerald-50">
                    {weeklyCall.actionNow}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-4">
                  <SectionLabel>Shareable line</SectionLabel>
                  <p className="mt-2 text-base font-semibold text-white">
                    {weeklyCall.shareableLine}
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-lg border border-slate-700/70 bg-slate-900/68 p-4">
              <SectionLabel>Trust</SectionLabel>
              <p className="mt-2 text-lg font-semibold text-emerald-50">
                {weeklyCall.readiness}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {weeklyCall.readinessDetail}
              </p>

              <div className="mt-4 grid gap-2">
                {backdropItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-700/70 bg-slate-950/65 px-3 py-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{item.value}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <DecisionCard
              label={publicDecisionLabels.action}
              value={weeklyCall.actionNow}
              toneClassName="border-emerald-300/30 bg-emerald-300/10 text-emerald-50"
            />
            <DecisionCard
              label={publicDecisionLabels.threshold}
              value={weeklyCall.pauseIf}
              toneClassName="border-amber-300/30 bg-amber-300/10 text-amber-50"
            />
            <DecisionCard
              label={publicDecisionLabels.reversal}
              value={weeklyCall.changeCourseIf}
              toneClassName="border-sky-300/30 bg-sky-300/10 text-sky-50"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Link
              href="/planning#ops-monthly-action-summary"
              className="weather-button-primary inline-flex min-h-[46px] items-center justify-center rounded px-4 py-3 text-sm font-semibold tracking-[0.08em] text-slate-100"
            >
              Open planning handoff
            </Link>
            <button
              type="button"
              className="weather-pill inline-flex min-h-[46px] items-center justify-center rounded px-4 py-3 text-sm font-semibold tracking-[0.08em] text-slate-100"
            >
              Copy operator brief
            </button>
          </div>
        </div>
      </section>

      <details className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-4 py-4 sm:px-5">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <SectionLabel>Why this call</SectionLabel>
            <p className="mt-2 text-lg font-semibold text-white">
              Open only after the direction is clear.
            </p>
          </div>
          <span className="inline-flex min-h-[38px] items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Proof
          </span>
        </summary>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {proofItems.map((item) => (
            <div key={item.label} className="rounded-md border border-slate-700/70 bg-slate-950/65 p-4">
              <SectionLabel>{item.label}</SectionLabel>
              <p className="mt-2 text-sm leading-6 text-slate-200">{item.value}</p>
            </div>
          ))}
        </div>
      </details>

      <section className="rounded-lg border border-slate-700/70 bg-slate-950/58 px-4 py-4 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
          <div className="rounded-lg border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(14,23,42,0.88),rgba(2,6,23,0.95))] p-5 shadow-[0_24px_60px_-42px_rgba(34,211,238,0.45)]">
            <SectionLabel>Recommended artifact</SectionLabel>
            <h2
              className="mt-3 text-2xl font-semibold text-white"
              style={{ fontFamily: "var(--weather-font-display)" }}
            >
              Operator brief
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
              {operatorBriefBullets.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-cyan-200">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-700/70 bg-slate-950/65 p-4">
              <SectionLabel>Artifact rule</SectionLabel>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Keep one routine path visible first. Use the same recommendation and guardrails in every format.
              </p>
            </div>

            <details className="rounded-lg border border-slate-700/70 bg-slate-950/65 p-4">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3">
                <div>
                  <SectionLabel>More formats</SectionLabel>
                  <p className="mt-2 text-sm font-semibold text-white">Only after the main brief is chosen.</p>
                </div>
                <span className="inline-flex min-h-[38px] items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Optional
                </span>
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex min-h-[42px] items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-300">
                  Explainer brief
                </span>
                <span className="inline-flex min-h-[42px] items-center rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-300">
                  Board note
                </span>
              </div>
            </details>
          </div>
        </div>
      </section>
    </MockupShell>
  );
}
