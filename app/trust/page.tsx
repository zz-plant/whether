import type { Metadata } from "next";
import { ActionLink } from "../components/ui/actionLink";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { UrlDetails } from "../components/ui/urlDetails";
import { isDisclosureOpenInParams } from "../components/ui/disclosureUrlState";
import { ReportShell } from "../components/reportShell";
import {
  DECISION_CONTRACT_LABELS,
  PRIMARY_AUDIENCE_SUMMARY,
} from "../../lib/report/reportCopy";
import { resolveConfidenceTone } from "../../lib/report/reportFormatting";
import { ReportSection } from "../components/reportSection";
import { FormulaReference } from "./formulaReference";
import { FrameworkSection } from "./frameworkSection";
import { RunHistorySection } from "./runHistorySection";
import { buildTrustPageModel } from "./trustPageModel";
import { GLOSSARY_HREF } from "../../lib/report/signalTranslations";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Trust — freshness, confidence, and what would change the call",
  description:
    "Check how fresh the sources are, how sure the call is, and how the score is built, before acting on anything you can't undo.",
  path: "/trust",
  imageAlt: "Whether trust hub",
});

export default async function MethodPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const {
    reportData,
    isFallback,
    degradedSourceRows,
    confidenceLabel,
    confidenceCode,
    trustSummary,
    citationLine,
    warnings,
    meetingSnippet,
    revisitBullets,
    trustVerdictToneClasses,
    runHistory,
    reportShellProps,
  } = await buildTrustPageModel();

  const confidenceDotClass = {
    positive: "bg-emerald-400",
    caution: "bg-amber-400",
    alert: "bg-rose-400",
  }[resolveConfidenceTone(confidenceCode)];

  const secondaryContent = (
    <>
      <ReportSection
        id="source-board"
        title="Sources and last update"
        description="Where each feed comes from and when it last refreshed."
      >
        {/* One card. A second, "Before you share or approve", held two pills to
            sections the rail already lists. */}
        <article className="weather-hub-card space-y-3 px-4 py-4">
          {/* Split from the Sources card in System status rather than
              repeating it: that card owns each source's *status*, so this one
              owns when each last updated and where it came from. It used to
              print the status labels too, which put "Canonical snapshot (high
              confidence)" on the page four times. Decision date and Trust
              summary rows dropped for the same reason — both are stated in the
              System status block above. */}
          <p className="type-eyebrow">Source freshness</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><span className="text-slate-400">Treasury:</span> {reportData.treasuryProvenance.timestampLabel}</li>
            <li><span className="text-slate-400">Macro:</span> {reportData.macroProvenance.timestampLabel}</li>
          </ul>
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Both source URLs are optional. As bare <a href={undefined}> these
                rendered a pill that looked clickable but was neither a link nor
                keyboard-focusable; the typed href on the shared primitive is what
                surfaced it. Render the affordance only when there is somewhere to go. */}
            {reportData.treasuryProvenance.sourceUrl ? (
              <ActionLink href={reportData.treasuryProvenance.sourceUrl} target="_blank" rel="noreferrer" variant="pill">Treasury source</ActionLink>
            ) : null}
            {reportData.macroProvenance.sourceUrl ? (
              <ActionLink href={reportData.macroProvenance.sourceUrl} target="_blank" rel="noreferrer" variant="pill">Macro source</ActionLink>
            ) : null}
          </div>
        </article>
      </ReportSection>

      <ReportSection
        id="sources-freshness"
        title="Cite this call"
        description="The one-line citation for a recap or sourcing note."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">Meeting citation</p>
            <p className="text-sm text-slate-200">{citationLine}</p>
            <p className="text-xs text-slate-400">For a recap or sourcing note.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <ActionLink href="#trust-snapshot" variant="pill">System status</ActionLink>
              <ActionLink href="#formula-reference" variant="pill">Formula notes</ActionLink>
            </div>
          </article>
        </div>
      </ReportSection>

      <ReportSection
        id="confidence-limits"
        title="Confidence and reliability limits"
        description="How reliable the brief is, what should pause it, and what would force a change."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">What to watch</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">This recommendation breaks if:</span> {reportData.flipThreshold}</li>
              <li><span className="text-slate-400">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span> {reportData.guardrailThreshold}</li>
              <li><span className="text-slate-400">Reopen fixed-cost approvals when:</span> confidence is back to high and the call has held for a second reading.</li>
            </ul>
          </article>
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">Escalation rule</p>
            <p className="text-sm text-slate-200">
              If a warning below is active, check the source dates before going ahead.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <ActionLink href="#source-board" variant="pill">Recheck freshness</ActionLink>
              <ActionLink href="#revisit-call" variant="pill">Revisit triggers</ActionLink>
            </div>
          </article>
        </div>
      </ReportSection>

      {/* The study moved to /calibration — it is original research and deserved
          an address, and two indexable URLs carrying it would compete. This
          keeps the reader who is here to judge the call pointed at it. */}
      <ReportSection
        id="confidence-record"
        title="What the confidence number has been worth"
        description="The percent measures how far the scores sit from the line that changes the call. Whether calls at that distance actually held is measured separately, over the whole archive."
      >
        <ActionLink href="/calibration" variant="pill">
          Read the calibration study
        </ActionLink>
      </ReportSection>

      <ReportSection id="revisit-call" title="What would make this recommendation wrong?">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">Active warnings</p>
            {warnings.length === 0 ? (
              <p className="text-sm text-slate-300">No warning is active. Act on the call; the pause line still applies.</p>
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
          <article className="weather-hub-card px-4 py-4">
            <p className="type-eyebrow">Revisit checklist</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {revisitBullets.map((item) => (
                <li key={item.label} className="rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3">
                  <p className="type-eyebrow">{item.label}</p>
                  {item.detail ? <p className="mt-1">{item.detail}</p> : null}
                  <Link href={item.href} className="mt-2 inline-flex min-h-[44px] items-center type-eyebrow text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">{item.linkLabel} →</Link>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </ReportSection>

      <ReportSection id="meeting-snippet" title="Meeting snippet" description="Paste into notes or a meeting agenda.">
        <pre className="overflow-x-auto rounded-lg border border-[color:var(--border-default)] bg-[var(--bg-surface)] px-4 py-4 text-xs leading-6 text-slate-200">
          <code>{meetingSnippet}</code>
        </pre>
      </ReportSection>

      {/* The glossary itself moved to /glossary. A pointer stays because this
          page is where a reader checking the brief before a decision ends up,
          and "what does that word mean" is a question they arrive with — but
          the definitions are not a trust artifact, and six links across the
          site used to send someone who did not know a term to a page about
          source freshness. */}
      <ReportSection
        id="beginner-glossary"
        title="Unfamiliar with a term?"
        description="Every term this site uses, in plain English, and what each one changes for a decision."
      >
        <ActionLink href={GLOSSARY_HREF} variant="pill">
          Open the glossary
        </ActionLink>
      </ReportSection>
    </>
  );

  return (
    <ReportShell {...reportShellProps}>
      <ReportSection id="trust-snapshot" title="System status" description="Five facts behind this week's call: data, freshness, sources, confidence, warnings.">
        {/* One strip, five cells. This was five stacked cards each opening with
            a coloured dot and a sentence that said "cached" a different way;
            the state is five facts, and a row of five labelled values says them
            in one line. The detail behind each sits in the sections below. A
            verdict banner used to sit above it — a glyph, a bold label and the
            date — restating the strip; the strip's tone border is the verdict. */}
        <dl className={`weather-hub-card grid grid-cols-2 gap-px overflow-hidden border sm:grid-cols-5 ${trustVerdictToneClasses}`}>
          {[
            {
              key: "data",
              label: "Data",
              value: isFallback
                ? "Cached snapshot"
                : degradedSourceRows.length > 0
                  ? `Partly cached · ${degradedSourceRows.length}`
                  : "All sources live",
              dot: isFallback || degradedSourceRows.length > 0 ? "bg-amber-400" : "bg-emerald-400",
              detail: `Decision date ${reportData.recordDateLabel}`,
            },
            {
              key: "freshness",
              label: "Freshness",
              value: reportData.fetchedAtLabel,
              dot: isFallback ? "bg-amber-400" : "bg-emerald-400",
              detail: trustSummary,
            },
            {
              key: "sources",
              label: "Sources",
              value: `Treasury · ${reportData.treasuryProvenance.statusLabel}`,
              dot: isFallback ? "bg-amber-400" : "bg-emerald-400",
              detail: `Macro · ${reportData.macroProvenance.statusLabel}`,
            },
            {
              key: "confidence",
              label: "Confidence",
              value: confidenceLabel,
              dot: confidenceDotClass,
              detail: reportData.flipThreshold,
            },
            {
              key: "warnings",
              label: "Warnings",
              value: warnings.length === 0 ? "None" : `${warnings.length} active`,
              dot: warnings.length === 0 ? "bg-emerald-400" : "bg-amber-400",
              detail: warnings[0]?.warning ?? "None active.",
            },
          ].map((cell) => (
            <div key={cell.key} className="min-w-0 bg-[var(--bg-surface)] px-3 py-3">
              <dt className="flex items-center gap-1.5 text-fluid-nano type-eyebrow">
                <span className={`flex h-2 w-2 shrink-0 rounded-full ${cell.dot}`} aria-hidden="true" />
                {cell.label}
              </dt>
              <dd className="mt-1 truncate text-sm font-semibold text-slate-100" title={cell.value}>{cell.value}</dd>
              <dd className="mt-0.5 line-clamp-2 text-fluid-nano text-slate-400">{cell.detail}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 text-xs leading-5 text-slate-400 px-1">
          {/* PRIMARY_AUDIENCE_SUMMARY already opens with the "not an authority" sentence — don't restate it here. */}
          {PRIMARY_AUDIENCE_SUMMARY} Check the sources and add your own numbers before acting on anything you can't undo.
        </p>
      </ReportSection>

      <RunHistorySection runHistory={runHistory} />

      <FormulaReference />

      <FrameworkSection />

      {!isFallback && warnings.length === 0 ? (
        <UrlDetails
          queryKey="sources"
          initialOpen={isDisclosureOpenInParams(resolvedSearchParams, "sources")}
          className="group mt-6 rounded-xl border border-[color:var(--border-default)] bg-slate-950/20 px-5 py-4"
          summaryClassName="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 type-eyebrow select-none"
          summary={
            <>
              <span>Detailed verification &amp; sources</span>
              <span aria-hidden="true" className="rounded-md border border-slate-700/50 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-400 transition group-open:rotate-180">
                ▾
              </span>
            </>
          }
        >
          <div className="mt-6 space-y-8">
            {secondaryContent}
          </div>
        </UrlDetails>
      ) : (
        secondaryContent
      )}
    </ReportShell>
  );
}
