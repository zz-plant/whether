import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { BeginnerGlossaryPanel } from "../components/appendix/OnboardingPanels";
import { SourceHealthPanel } from "../components/sourceHealthPanel";
import { ReportShell } from "../components/reportShell";
import {
  PRIMARY_AUDIENCE_ACTION,
  PRIMARY_AUDIENCE_SUMMARY,
} from "../../lib/report/reportCopy";
import { ReportSection } from "../components/reportSection";
import { buildTrustPageModel } from "./trustPageModel";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Readiness — freshness, confidence, and sources",
  description:
    "Whether is decision-support software, not an authority. Check source freshness, confidence, and methodology before acting on irreversible decisions.",
  path: "/trust",
  imageAlt: "Whether trust hub",
});

export default async function MethodPage() {
  const {
    reportData,
    isFallback,
    confidenceLabel,
    trustSummary,
    sourceCoverage,
    citationLine,
    warnings,
    meetingSnippet,
    revisitBullets,
    trustVerdict,
    reportShellProps,
  } = await buildTrustPageModel();

  const secondaryContent = (
    <>
      <ReportSection
        id="source-board"
        title="Source board"
        description="The compact source handoff behind the homepage trust board."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold tracking-[0.06em] text-white/40">Current source mix</p>
            <ul className="space-y-2 text-sm text-white/70">
              <li><span className="text-white/40">Treasury:</span> {reportData.treasuryProvenance.statusLabel} · {reportData.treasuryProvenance.timestampLabel}</li>
              <li><span className="text-slate-400">Macro:</span> {reportData.macroProvenance.statusLabel} · {reportData.macroProvenance.timestampLabel}</li>
              <li><span className="text-slate-400">Decision date:</span> {reportData.recordDateLabel}</li>
              <li><span className="text-slate-400">Trust summary:</span> {trustSummary}</li>
            </ul>
            <div className="flex flex-wrap gap-2 text-xs">
              <a href={reportData.treasuryProvenance.sourceUrl} target="_blank" rel="noreferrer" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Treasury source</a>
              <a href={reportData.macroProvenance.sourceUrl} target="_blank" rel="noreferrer" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Macro source</a>
            </div>
          </article>
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Use in the room</p>
            <p className="text-sm text-slate-200">
              Check whether the weekly call is current enough to share or approve against.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Full freshness check</Link>
              <Link href="#meeting-snippet" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Meeting snippet</Link>
            </div>
          </article>
        </div>
      </ReportSection>

      <ReportSection
        id="sources-freshness"
        title="Sources and freshness"
        description="Where the current recommendation came from and how current it is."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Meeting citation</p>
            <p className="text-sm text-slate-200">{citationLine}</p>
            <p className="text-xs text-slate-400">For a recap or sourcing note.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#trust-snapshot" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Snapshot</Link>
              <Link href="#formula-reference" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Formula notes</Link>
            </div>
          </article>
        </div>
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Per-source status</p>
          <SourceHealthPanel rows={reportData.sourceHealth} />
        </div>
      </ReportSection>

      <ReportSection
        id="confidence-limits"
        title="Confidence and reliability limits"
        description="How reliable the brief is, what should pause it, and what would force a change."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">What to watch</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">Confidence now:</span> {confidenceLabel}</li>
              <li><span className="text-slate-400">This recommendation breaks if:</span> {reportData.flipThreshold}</li>
              <li><span className="text-slate-400">Pause if:</span> {reportData.guardrailThreshold}</li>
              <li><span className="text-slate-400">Recovery condition:</span> Confidence returns to HIGH and the transition warning clears before you reopen fixed-cost approvals.</li>
            </ul>
          </article>
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Escalation rule</p>
            <p className="text-sm text-slate-200">
              If a warning or revisit trigger fires, confirm freshness before moving ahead.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Recheck freshness</Link>
              <Link href="#revisit-call" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Revisit triggers</Link>
            </div>
          </article>
        </div>
      </ReportSection>

      <ReportSection
        id="formula-reference"
        title="Formula reference"
        description="How this score is built."
      >
        <div className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
          <p className="text-sm text-slate-200">
            The scoring logic, stop lines, and change triggers behind this week&rsquo;s recommendation.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• Read formulas alongside current confidence and freshness labels before irreversible decisions.</li>
            <li>• Check that the change trigger and stop line match the weekly brief.</li>
            <li>• Note the reversal condition before reopening fixed-cost approvals.</li>
          </ul>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="#confidence-limits" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Confidence limits</Link>
            <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Source health</Link>
          </div>
        </div>
      </ReportSection>

      <ReportSection id="revisit-call" title="What would make this recommendation wrong?">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="weather-hub-card space-y-3 rounded-md px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Active warning patterns</p>
            {warnings.length === 0 ? (
              <p className="text-sm text-slate-300">No active warning pattern right now. Keep decisions staged and keep the normal change trigger in view.</p>
            ) : (
              <ul className="space-y-3 text-sm text-slate-200">
                {warnings.map((warning) => (
                  <li key={warning.id} className="rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                    <p className="font-semibold text-slate-100">{warning.warning}</p>
                    <p className="mt-1 text-slate-300">{warning.mitigationCheck}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="weather-hub-card rounded-md px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Revisit checklist</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {revisitBullets.map((item) => (
                <li key={item.label} className="rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="mt-1">{item.detail}</p>
                  <Link href={item.href} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Check {item.label === "Trigger" ? "confidence limits" : item.label === "Impact" ? "snapshot" : "sources"} →</Link>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </ReportSection>

      <ReportSection id="meeting-snippet" title="Meeting-ready trust snippet" description="Ready for Slack, notes, or agendas.">
        <pre className="weather-hub-card overflow-x-auto rounded-lg px-4 py-4 text-xs leading-6 text-slate-200">
          <code>{meetingSnippet}</code>
        </pre>
      </ReportSection>

      <BeginnerGlossaryPanel />
    </>
  );

  return (
    <ReportShell {...reportShellProps}>
      <ReportSection id="trust-snapshot" title="System status" description="Current operating state of the data pipeline, signal reliability, and decision readiness.">
        <div className={`weather-hub-card rounded-lg px-4 py-4 mb-4 border ${trustVerdict.toneClasses}`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-3 w-3 rounded-full ${isFallback ? "bg-amber-400" : "bg-emerald-400"}`} aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-100">
              {isFallback ? "Degraded — cached data in use" : "All systems operational"}
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-400">Data refreshed {reportData.fetchedAtLabel}. Decision date: {reportData.recordDateLabel}.</p>
        </div>

        <div className="space-y-3">
          <div className="weather-hub-card rounded-lg px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-100">Freshness</p>
              </div>
              <span className="text-fluid-xs text-slate-400">Updated {reportData.fetchedAtLabel}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{trustSummary}</p>
          </div>

          <div className="weather-hub-card rounded-lg px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-2.5 w-2.5 rounded-full ${isFallback ? "bg-amber-400" : "bg-emerald-400"}`} aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-100">Sources</p>
              </div>
              <span className="text-fluid-xs text-slate-400">{sourceCoverage}</span>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-xs text-slate-400">
              <li>Treasury: {reportData.treasuryProvenance.statusLabel}</li>
              <li>Macro: {reportData.macroProvenance.statusLabel}</li>
            </ul>
          </div>

          <div className="weather-hub-card rounded-lg px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-2.5 w-2.5 rounded-full ${
                  confidenceLabel === "HIGH" ? "bg-emerald-400" : confidenceLabel === "MED" ? "bg-amber-400" : "bg-rose-400"
                }`} aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-100">Confidence</p>
              </div>
              <span className="text-fluid-xs text-slate-400">{confidenceLabel}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{reportData.flipThreshold}</p>
          </div>

          {warnings.length > 0 ? (
            <div className="weather-hub-card rounded-lg px-4 py-4 border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-amber-100">Active warnings</p>
              </div>
              <ul className="mt-2 space-y-2">
                {warnings.map((warning) => (
                  <li key={warning.id} className="text-xs text-amber-200">{warning.warning}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="weather-hub-card rounded-lg px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-100">Warnings</p>
              </div>
              <p className="mt-1 text-xs text-slate-400">No active warnings. Normal operating conditions.</p>
            </div>
          )}

          <p className="text-xs leading-5 text-slate-500 px-1">
            Whether is decision-support software, not an authority. Verify source data and combine it with company-specific metrics before acting on irreversible decisions. {PRIMARY_AUDIENCE_SUMMARY}
          </p>
        </div>
      </ReportSection>

      {!isFallback && warnings.length === 0 ? (
        <details className="group mt-6 rounded-xl border border-white/[0.06] bg-slate-950/20 px-5 py-4">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/50 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-sky-400 select-none">
            <span>Detailed verification &amp; source board</span>
            <span aria-hidden="true" className="rounded-sm border border-slate-700/50 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-400 transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-6 space-y-8">
            {secondaryContent}
          </div>
        </details>
      ) : (
        secondaryContent
      )}
    </ReportShell>
  );
}
