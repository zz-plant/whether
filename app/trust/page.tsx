import type { Metadata } from "next";
import { ActionLink } from "../components/ui/actionLink";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { UrlDetails } from "../components/ui/urlDetails";
import { ChevronDownIcon } from "../components/uiIcons";
import { isDisclosureOpenInParams } from "../components/ui/disclosureUrlState";
import { ReportShell } from "../components/reportShell";
import { ShareOrEmbedLink } from "../components/shareOrEmbedLink";
import {
  DECISION_CONTRACT_LABELS,
  PRIMARY_AUDIENCE_SUMMARY,
} from "../../lib/report/reportCopy";
import { ReportSection } from "../components/reportSection";
import { CONFIDENCE_RECORD_TITLE } from "../components/history/confidenceRecord";
import { FormulaReference } from "./formulaReference";
import { FrameworkSection } from "./frameworkSection";
import { RunHistorySection } from "./runHistorySection";
import { SourceBoard } from "./sourceBoard";
import { ReaderReturnsSection } from "./readerReturnsSection";
import { buildTrustPageModel } from "./trustPageModel";
import { formatDecisionReversal } from "../../lib/report/reportFormatting";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "How much to trust this week's guidance",
  description:
    "Check how fresh the sources are, how sure the reading is, and how the scores are built, before acting on anything you can't undo.",
  path: "/trust",
  imageAlt: "Whether trust hub",
  imageParams: { template: "method", eyebrow: "Trust" },
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
    sourceBoardRows,
    warnings,
    revisitBullets,
    scorePositions,
    runHistory,
    readerReturns,
    reportShellModel,
  } = await buildTrustPageModel();

  /* What is folded on a healthy week: the limits, the confidence record and the
     warnings. The source board used to lead this group; it is open under the
     derivation now (`SourceBoard`), because it is the evidence the strip's
     "Sources" verdict was judged from. The citation and the meeting snippet
     that bracketed it moved to /share on 2026-10-08 (`ShareOrEmbedLink`
     below). */
  const secondaryContent = (
    <>
      <ReportSection
        id="confidence-limits"
        title="Confidence and reliability limits"
        description="How reliable the brief is, what should pause it, and what would force a change."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="weather-hub-card space-y-3 px-4 py-4">
            <p className="type-eyebrow">What to watch</p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li><span className="text-slate-400">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</span> {reportData.flipThreshold}</li>
              <li><span className="text-slate-400">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</span> {reportData.guardrailThreshold}</li>
              {/* The lead area's resume line, as the brief and every paste print
                  it. This slot said "confidence is back to high and conditions
                  have held for a second reading" under the same label, so the
                  page named a second resume line the plan never uses. */}
              {reportData.actionStripItems[0]?.reversalCondition ? (
                <li><span className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}:</span> {formatDecisionReversal(reportData.actionStripItems[0].reversalCondition)}</li>
              ) : null}
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
        title={CONFIDENCE_RECORD_TITLE}
        description="Confidence measures how far the scores sit from the line where conditions change. Whether readings at that distance actually held is measured separately, over the whole archive."
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
              <p className="text-sm text-slate-300">No warning is active. Act on the guidance; the pause line still applies.</p>
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

    </>
  );

  return (
    <ReportShell model={reportShellModel}>
      {/* System status: the trust strip, which the shell draws in the intro
          directly above this section (record date, sources, confidence, could
          the call change), and the caveat that goes with it. This was a
          five-cell "System status" card — data, freshness, sources,
          confidence, warnings — and before that five stacked cards; the facts
          beyond the strip are below: the warnings under "What would make this
          recommendation wrong?", the flip condition under "Confidence and
          reliability limits". The id stays: the rail, the search command and
          three in-page links point at #trust-snapshot as "System status". */}
      <section
        id="trust-snapshot"
        data-page-section="trust-snapshot"
        tabIndex={-1}
        aria-labelledby="section-trust-snapshot-heading"
        className="space-y-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
      >
        <h2 id="section-trust-snapshot-heading" className="sr-only">System status</h2>
        <p className="text-xs leading-5 text-slate-400">
          {/* PRIMARY_AUDIENCE_SUMMARY already opens with the "not an authority" sentence — don't restate it here. */}
          {PRIMARY_AUDIENCE_SUMMARY} Check the sources and add your own numbers before acting on anything you can't undo.
        </p>
      </section>

      <RunHistorySection runHistory={runHistory} />

      {readerReturns ? <ReaderReturnsSection line={readerReturns.line} generatedAt={readerReturns.generatedAt} /> : null}

      <FormulaReference positions={scorePositions} />

      {/* Open, under the derivation: the page's question is whether the
          reading is current enough to act on, and this is where that is
          checked. It sat folded at the foot of the page, under the method
          essay and a blank form. */}
      <SourceBoard
        rows={sourceBoardRows}
        treasurySourceUrl={reportData.treasuryProvenance.sourceUrl}
        macroSourceUrl={reportData.macroProvenance.sourceUrl}
      />

      {/* The query key stays "sources": a link someone already shared with
          `?sources=1` still opens this panel, though the board itself is
          above it now. The summary names what is behind it (§XII). */}
      {!isFallback && warnings.length === 0 ? (
        <UrlDetails
          queryKey="sources"
          initialOpen={isDisclosureOpenInParams(resolvedSearchParams, "sources")}
          className="group rounded-xl border border-[color:var(--border-default)] bg-slate-950/20 px-5 py-4"
          summaryClassName="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 type-eyebrow select-none"
          summary={
            <>
              <span>Limits and revisit triggers</span>
              <span aria-hidden="true" className="inline-flex rounded-md border border-slate-700/50 bg-slate-950/50 px-2 py-1.5 text-slate-400 transition group-open:rotate-180 motion-reduce:transition-none">
                <ChevronDownIcon className="h-3.5 w-3.5" />
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

      {/* The citation and the meeting snippet are /share formats now, with every
          other paste of the week. */}
      <ShareOrEmbedLink />

      {/* Last: how to use the lines is method, not a check on this week's
          reading (§VIII). Its essay and its blank form are folded inside. */}
      <FrameworkSection />
    </ReportShell>
  );
}
