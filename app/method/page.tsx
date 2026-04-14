import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList, buildPageMetadata } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { HubSection } from "../components/hubPageShell";
import { BeginnerGlossaryPanel } from "../components/appendix/OnboardingPanels";
import { buildCompactTrustSummary, buildFailureModeWarnings, buildWeeklyCitationMetaLine } from "../../lib/report/trustStatus";
import { formatConfidencePlainLabel } from "../../lib/report/reportFormatting";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { ReportShell } from "../components/reportShell";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Trust — freshness, confidence, and sources",
  description:
    "Check whether this week's call is current, dependable, and backed by sources.",
  path: "/method",
  imageAlt: "Whether trust hub",
});

export default async function MethodPage() {
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/method" },
      ]),
    ),
  };
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/method" });
  const homeBriefModel = snapshot.homeBriefModel;
  const isFallback = snapshot.isFallback;
  const trustSummary = buildCompactTrustSummary({
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(reportData.historicalSelection),
  });
  const confidenceLabel = formatConfidencePlainLabel(homeBriefModel.confidenceLabel);
  const sourceCoverage = `${reportData.treasuryProvenance.statusLabel} · ${reportData.macroProvenance.statusLabel}`;
  const citationLine = buildWeeklyCitationMetaLine({
    statusLabel: reportData.statusLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    recordDateLabel: reportData.recordDateLabel,
    freshnessLabel: reportData.fetchedAtLabel,
  });
  const warnings = buildFailureModeWarnings({
    confidenceLabel: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    provenanceStatusLabel: reportData.treasuryProvenance.statusLabel,
    changedSignals: reportData.reportDynamics.changedSignals,
    anomalySignals: reportData.reportDynamics.anomalySignals,
  });
  const meetingSnippet = `Posture: ${reportData.statusLabel}\nDecision as-of: ${reportData.recordDateLabel}\nData refreshed: ${reportData.fetchedAtLabel}\nConfidence: ${confidenceLabel}\nTrust: ${trustSummary}\nFlip trigger: ${reportData.flipThreshold}\nAction now: ${reportData.actionNowShort}`;

  const revisitBullets = [
    {
      label: "Trigger",
      detail: reportData.flipThreshold,
      href: "#confidence-limits",
    },
    {
      label: "Impact",
      detail: reportData.actionNowShort,
      href: "#trust-snapshot",
    },
    {
      label: "Recovery",
      detail: isFallback
        ? "Recovery condition: wait for one clean live refresh before approving hard-to-reverse moves."
        : "Recovery condition: wait for HIGH confidence and no transition warning before expanding fixed-cost commitments.",
      href: "#sources-freshness",
    },
  ];
  const confidenceLow = homeBriefModel.confidenceLabel === "LOW";
  const trustStatusTone = reportData.historicalSelection
    ? "historical"
    : isFallback || confidenceLow
      ? "warning"
      : "stable";
  const trustStatusAction = trustStatusTone === "stable"
    ? "Safe to use for this week's plan while freshness and confidence hold."
    : trustStatusTone === "historical"
      ? "Use this view for comparison only; switch to the live brief before approving anything new."
      : "Use this brief for reversible moves only until the live evidence strengthens.";
  const trustVerdict = trustStatusTone === "stable"
    ? {
        label: "Ready to use",
        detail: "Freshness and confidence are strong enough to use the brief as written.",
        toneClasses: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
      }
    : trustStatusTone === "historical"
      ? {
          label: "Historical only",
          detail: "This is useful for comparison, not for live approvals.",
          toneClasses: "border-violet-400/35 bg-violet-500/10 text-violet-100",
        }
      : {
          label: "Use with caution",
          detail: "The brief is still useful, but keep decisions reversible until confidence improves.",
          toneClasses: "border-amber-400/35 bg-amber-500/10 text-amber-100",
        };
  const sectionLinks = [
    { href: "#trust-snapshot", label: "Snapshot" },
    { href: "#sources-freshness", label: "Sources & freshness" },
    { href: "#confidence-limits", label: "Confidence & limits" },
    { href: "#formula-reference", label: "Formula reference" },
    { href: "#revisit-call", label: "Revisit triggers" },
    { href: "#meeting-snippet", label: "Meeting snippet" },
  ];

  return (
    <ReportShell
      statusLabel={reportData.statusLabel}
      recordDateLabel={reportData.recordDateLabel}
      fetchedAtLabel={reportData.fetchedAtLabel}
      treasurySource={reportData.treasury.source}
      trustStatusLabel={trustSummary}
      trustStatusDetail={`Coverage: ${sourceCoverage}`}
      trustStatusAction={trustStatusAction}
      trustStatusTone={trustStatusTone}
      pageTitle="Trust"
      currentPath="/method"
      pageSummary="Check whether this week's brief is current enough to act on."
      pageSummaryLink={{ href: "#trust-snapshot", label: "Snapshot ↓" }}
      sectionLinks={sectionLinks.slice(0, 3)}
      heroVariant="compact"
      sidebarVariant="hidden"
      primaryCta={{ href: "#trust-snapshot", label: "Review trust snapshot" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/signals",
        description: "Check evidence next",
      }}
      decisionBanner={{
        label: "Trust",
        decision: "Decide whether this week's brief is ready to use, needs a lighter touch, or is only useful for comparison.",
        horizon: "This week",
        confidence: trustSummary,
        effectiveDate: reportData.recordDateLabel,
        evidenceHref: "#trust-snapshot",
      }}
      commandBar={{
        regime: reportData.assessment.regime,
        call: "Check whether this week's brief is current enough and reliable enough to use.",
        doNow: [
          reportData.actionNowShort,
          "Slow fixed-cost approvals if trust weakens.",
        ],
        trustChecklist: {
          label: "What matters",
          items: [
            `Confirm freshness: ${reportData.fetchedAtLabel}.`,
            `Confirm confidence: ${confidenceLabel}.`,
          ],
        },
        flipConditions: [
          reportData.flipThreshold,
          "If trust degrades, hold irreversible approvals until live evidence stabilizes.",
        ],
        updatedAt: reportData.fetchedAtLabel,
      }}
      structuredData={breadcrumbStructuredData}
    >
      <HubSection id="trust-snapshot" title="Trust snapshot" description="Freshness, source coverage, and how heavily to lean on this week's brief." className="scroll-mt-28">
        <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
          <p className={`inline-flex w-fit rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${trustVerdict.toneClasses}`}>
            {trustVerdict.label}
          </p>
          <p className="text-sm leading-relaxed text-slate-200">{trustVerdict.detail}</p>
        </article>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Freshness</p>
            <p className="mt-2 text-sm text-slate-200">Decision date <span className="font-semibold text-slate-100">{reportData.recordDateLabel}</span></p>
            <p className="mt-2 text-sm text-slate-200">Updated <span className="font-semibold text-slate-100">{reportData.fetchedAtLabel}</span></p>
            <p className="mt-2 text-xs text-slate-400">{trustSummary}</p>
          </article>
          <article className="weather-hub-card rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Source coverage</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
              <li>Treasury: <span className="font-semibold text-slate-100">{reportData.treasuryProvenance.statusLabel}</span></li>
              <li>Macro: <span className="font-semibold text-slate-100">{reportData.macroProvenance.statusLabel}</span></li>
              <li>Confidence: <span className="font-semibold text-slate-100">{confidenceLabel}</span></li>
            </ul>
            <p className="mt-3 text-xs text-slate-400">Coverage summary: {sourceCoverage}</p>
          </article>
          <article className="weather-hub-card rounded-2xl px-4 py-4">
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
      </HubSection>

      <HubSection
        id="sources-freshness"
        title="Sources and freshness"
        description="Where the current call came from and how current it is."
        className="scroll-mt-28"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Source coverage</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">Treasury:</span> {reportData.treasuryProvenance.statusLabel} · {reportData.treasuryProvenance.timestampLabel}</li>
              <li><span className="text-slate-400">Macro:</span> {reportData.macroProvenance.statusLabel} · {reportData.macroProvenance.timestampLabel}</li>
              <li><span className="text-slate-400">Trust summary:</span> {trustSummary}</li>
            </ul>
            <div className="flex flex-wrap gap-2 text-xs">
              <a href={reportData.treasuryProvenance.sourceUrl} target="_blank" rel="noreferrer" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Treasury source</a>
              <a href={reportData.macroProvenance.sourceUrl} target="_blank" rel="noreferrer" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Macro source</a>
            </div>
          </article>
          <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Meeting citation</p>
            <p className="text-sm text-slate-200">{citationLine}</p>
            <p className="text-xs text-slate-400">Use this in a recap or sourcing note. The full decision still lives in the Weekly Brief.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#trust-snapshot" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Snapshot</Link>
              <Link href="#formula-reference" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Formula notes</Link>
            </div>
          </article>
        </div>
      </HubSection>

      <HubSection
        id="confidence-limits"
        title="Approval limits"
        description="How reliable the brief is, what should pause it, and what would force a change."
        className="scroll-mt-28"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">What to watch</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">Confidence now:</span> {confidenceLabel}</li>
              <li><span className="text-slate-400">This call breaks if:</span> {reportData.flipThreshold}</li>
              <li><span className="text-slate-400">Pause if:</span> {reportData.guardrailThreshold}</li>
              <li><span className="text-slate-400">Recovery condition:</span> Confidence returns to HIGH and the transition warning clears before you reopen fixed-cost approvals.</li>
            </ul>
          </article>
          <article className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Escalation rule</p>
            <p className="text-sm text-slate-200">
              If a warning or revisit trigger hits, go back to the Weekly Brief, confirm freshness, and restate the approval rule before moving ahead.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Recheck freshness</Link>
              <Link href="#revisit-call" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Revisit triggers</Link>
            </div>
          </article>
        </div>
      </HubSection>

      <HubSection
        id="formula-reference"
        title="Formula reference"
        description="How this score is built."
        className="scroll-mt-28"
      >
        <div className="weather-hub-card space-y-3 rounded-2xl px-4 py-4">
          <p className="text-sm text-slate-200">
            The scoring logic, stop lines, and change triggers behind this week&rsquo;s call.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• Read the formulas alongside the current confidence and freshness labels before making hard-to-reverse decisions.</li>
            <li>• Check that the change trigger and stop line match the weekly brief before changing team pace.</li>
            <li>• Write down the reversal condition before reopening fixed-cost approvals.</li>
          </ul>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="#confidence-limits" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Confidence limits</Link>
            <Link href="#sources-freshness" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 font-semibold text-slate-100">Source provenance</Link>
          </div>
        </div>
      </HubSection>

      <HubSection id="revisit-call" title="What would make this wrong?" className="scroll-mt-28">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="weather-hub-card space-y-3 rounded-xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Active warning patterns</p>
            {warnings.length === 0 ? (
              <p className="text-sm text-slate-300">No active warning pattern right now. Keep decisions staged and keep the normal change trigger in view.</p>
            ) : (
              <ul className="space-y-3 text-sm text-slate-200">
                {warnings.map((warning) => (
                  <li key={warning.id} className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                    <p className="font-semibold text-slate-100">{warning.warning}</p>
                    <p className="mt-1 text-slate-300">{warning.mitigationCheck}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="weather-hub-card rounded-xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Revisit checklist</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {revisitBullets.map((item) => (
                <li key={item.label} className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="mt-1">{item.detail}</p>
                  <Link href={item.href} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Related check</Link>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </HubSection>

      <HubSection id="meeting-snippet" title="Meeting-ready trust snippet" description="Ready for Slack, notes, or agendas." className="scroll-mt-28">
        <pre className="weather-hub-card overflow-x-auto rounded-2xl px-4 py-4 text-xs leading-6 text-slate-200">
          <code>{meetingSnippet}</code>
        </pre>
      </HubSection>

      <BeginnerGlossaryPanel />
    </ReportShell>
  );
}
