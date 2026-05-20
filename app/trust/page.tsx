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
import { MethodSection } from "./components/MethodSection";
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

  return (
    <ReportShell {...reportShellProps}>
      <MethodSection id="trust-snapshot" title="Readiness snapshot" description="How current the data is, how reliable the signal, and whether this week's read is suitable as a planning prompt or needs deeper verification.">
        <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
          <p className={`inline-flex w-fit rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${trustVerdict.toneClasses}`}>
            {trustVerdict.label}
          </p>
          <p className="text-sm leading-relaxed text-slate-200">{trustVerdict.detail}</p>
          <p className="text-xs leading-5 text-slate-400 mt-2">
            Whether is decision-support software, not an authority. Use this read as a planning prompt — not as the sole basis for irreversible hiring, fundraising, budget, or investment decisions. Verify the source data and combine it with company-specific metrics before acting.
          </p>
          <p className="text-xs leading-5 text-slate-400">
            {PRIMARY_AUDIENCE_SUMMARY} {PRIMARY_AUDIENCE_ACTION}
          </p>
        </article>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="weather-hub-card rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Freshness</p>
            <p className="mt-2 text-sm text-slate-200">Decision date <span className="font-semibold text-slate-100">{reportData.recordDateLabel}</span></p>
            <p className="mt-2 text-sm text-slate-200">Updated <span className="font-semibold text-slate-100">{reportData.fetchedAtLabel}</span></p>
            <p className="mt-2 text-xs text-slate-400">{trustSummary}</p>
          </article>
          <article className="weather-hub-card rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Source coverage</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
              <li>Treasury: <span className="font-semibold text-slate-100">{reportData.treasuryProvenance.statusLabel}</span></li>
              <li>Macro: <span className="font-semibold text-slate-100">{reportData.macroProvenance.statusLabel}</span></li>
              <li>Confidence: <span className="font-semibold text-slate-100">{confidenceLabel}</span></li>
            </ul>
            <p className="mt-3 text-xs text-slate-400">Coverage summary: {sourceCoverage}</p>
          </article>
          <article className="weather-hub-card rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Approval boundary</p>
            <p className="mt-2 text-sm text-slate-200">{trustVerdict.detail}</p>
            <p className="mt-2 text-sm text-slate-300">{reportData.flipThreshold}</p>
            <p className="mt-2 text-xs text-slate-400">
              {isFallback
                ? "Wait for one clean live refresh before approving irreversible moves."
                : "If freshness or confidence slips, slow approvals and keep decisions reversible."}
            </p>
          </article>
        </div>
      </MethodSection>

      <MethodSection
        id="source-board"
        title="Source board"
        description="The compact source handoff behind the homepage trust board."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <article className="weather-hub-card space-y-3 rounded-lg px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current source mix</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">Treasury:</span> {reportData.treasuryProvenance.statusLabel} · {reportData.treasuryProvenance.timestampLabel}</li>
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
      </MethodSection>

      <MethodSection
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
      </MethodSection>

      <MethodSection
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
      </MethodSection>

      <MethodSection
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
      </MethodSection>

      <MethodSection id="revisit-call" title="What would make this recommendation wrong?">
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
      </MethodSection>

      <MethodSection id="meeting-snippet" title="Meeting-ready trust snippet" description="Ready for Slack, notes, or agendas.">
        <pre className="weather-hub-card overflow-x-auto rounded-lg px-4 py-4 text-xs leading-6 text-slate-200">
          <code>{meetingSnippet}</code>
        </pre>
      </MethodSection>

      <BeginnerGlossaryPanel />


    </ReportShell>
  );
}
