import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { publicDecisionLabels } from "../../../lib/report/reportFormatting";
import {
  MockupShell,
  parseDensityMode,
  parseViewportMode,
} from "../components/mockupShell";
import { CopyOperatorBriefButton } from "../components/copyOperatorBriefButton";

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
] as const;

const copyBriefText = [
  `Whether · ${weeklyCall.readiness}`,
  weeklyCall.currentCall,
  `${publicDecisionLabels.action}: ${weeklyCall.actionNow}`,
  `${publicDecisionLabels.threshold}: ${weeklyCall.pauseIf}`,
  `${publicDecisionLabels.reversal}: ${weeklyCall.changeCourseIf}`,
].join("\n");

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-fluid-micro font-semibold uppercase tracking-[0.16em] text-slate-300">
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
            <span className="inline-flex min-h-[38px] items-center rounded-sm border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-fluid-xs font-semibold uppercase tracking-[0.14em] text-cyan-50">
              Weekly brief
            </span>
            <span className="inline-flex min-h-[38px] items-center rounded-sm border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
              Default lens: Product / Eng
            </span>
            <span className="inline-flex min-h-[38px] items-center rounded-sm border border-emerald-300/35 bg-emerald-300/10 px-3 py-1.5 text-fluid-xs font-semibold uppercase tracking-[0.14em] text-emerald-50">
              Decision readiness: {weeklyCall.readiness}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
            <div className="rounded-lg border border-slate-700/70 bg-slate-900/72 p-5">
              <SectionLabel>Weekly operating call</SectionLabel>
              <h1
                className="mt-3 text-3xl font-semibold text-white sm:text-[2.5rem]"
                style={{ fontFamily: "var(--weather-font-display)" }}
              >
                {weeklyCall.currentCall}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                {weeklyCall.whatChanged}
              </p>
            </div>

            <aside className="rounded-lg border border-slate-700/70 bg-slate-900/68 p-4">
              <SectionLabel>Trust</SectionLabel>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {weeklyCall.readinessDetail}
              </p>

              <div className="mt-4 grid gap-2">
                {backdropItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-700/70 bg-slate-950/65 px-3 py-3"
                  >
                    <p className="text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-300">
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

          <section className="rounded-lg border border-slate-700/70 bg-slate-950/58 px-4 py-4 sm:px-5">
            <SectionLabel>Why this call</SectionLabel>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {proofItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-slate-700/70 bg-slate-950/65 p-4"
                >
                  <SectionLabel>{item.label}</SectionLabel>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Link
              href="/planning#ops-monthly-action-summary"
              className="weather-button-primary inline-flex min-h-[46px] items-center justify-center rounded px-4 py-3 text-sm font-semibold tracking-[0.08em] text-slate-100"
            >
              Open planning handoff
            </Link>
            <CopyOperatorBriefButton text={copyBriefText} />
          </div>
        </div>
      </section>
    </MockupShell>
  );
}
