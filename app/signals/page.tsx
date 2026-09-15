import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { HistoricalBanner } from "../components/historicalBanner";
import { formatDateUTC } from "../../lib/formatters";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastRead/visitorStrip";
import { SignalInversionPreview } from "./components/signalInversionPreview";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { SignalSparklineStrip } from "./components/signalSparklineStrip";
import { formatMonthYearShortFromValue } from "../../lib/formatters";
import { FossilRecordSection } from "./components/fossilRecordSection";
import { buildSignalsPageModel, type SignalsPageSearchParams } from "./evidencePageModel";
import { getMonthlyRegimeHistory } from "../../lib/summary/monthlyRegimeHistory";
import {
  SignalsAdvancedControlsSection,
  SignalsCurrentScoresSection,
  SignalsDiagnosticsSection,
  SignalsEvidencePrioritiesSection,
  SignalsModeSwitcherSection,
} from "./components/evidenceSections";
import { SignalsDecisionSummarySection } from "./components/evidenceDecisionSummary";
import { getHistoricalAnalogPlaybook } from "../../lib/analogPlaybook";

export { buildDiagnosticsExpansionHref } from "./evidenceQueryState";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Why the Weekly Brief Changed",
  description:
    "Why the weekly brief changed: what moved, why it matters, and what would make the recommendation change.",
  path: "/signals",
  imageAlt: "Why the weekly brief changed — evidence overview",
  imageParams: {
    template: "signals",
    title: "Why the Weekly Brief Changed",
    subtitle: "What moved, why it matters, and what would make the recommendation change.",
  },
});

export default async function SignalsPage({
  searchParams,
}: {
  searchParams?: Promise<SignalsPageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const model = await buildSignalsPageModel(resolvedSearchParams);
  const monthlyRegimeHistory = getMonthlyRegimeHistory().slice(-12);
  const tightnessTrend = monthlyRegimeHistory.flatMap((entry) =>
    typeof entry.tightness === "number"
      ? [{ label: formatMonthYearShortFromValue(entry.record_date), value: entry.tightness }]
      : [],
  );
  const riskAppetiteTrend = monthlyRegimeHistory.flatMap((entry) =>
    typeof entry.riskAppetite === "number"
      ? [{ label: formatMonthYearShortFromValue(entry.record_date), value: entry.riskAppetite }]
      : [],
  );

  return (
    <ReportShell
      statusLabel={model.statusLabel}
      recordDateLabel={model.recordDateLabel}
      fetchedAtLabel={model.fetchedAtLabel}
      trustStatusTone={model.trust.trustStatusTone}
      showOfflineBadge={model.isFallback && !model.historicalSelection}
      pageTitle="Why the weekly brief changed"
      pageSummary="What moved, why it matters, and what would flip the call."
      sectionLinks={model.sectionLinks}
      nextStep={{
        href: "/operate",
        description: "Set guardrails for this week's plan",
      }}
      structuredData={model.structuredData}
      historicalBanner={
        model.historicalSelection ? (
          <HistoricalBanner
            year={model.historicalSelection.year}
            month={model.historicalSelection.month}
            asOfLabel={formatDateUTC(model.historicalSelection.asOf)}
            liveHref="/signals"
            previousHref={model.previousHistoricalHref}
            timeMachineHref={model.historicalTimeMachineHref}
          />
        ) : null
      }
    >
      <OperatorWorkflowRouteTracker />
      <SignalsDecisionSummarySection
        triggerCondition={model.triggerCondition}
        reversalCondition={model.reversalCondition}
        showMicroDecisionRows={model.showMicroDecisionRows}
        actionNowShort={model.actionNowShort}
        topDiagnosticCallouts={model.topDiagnosticCallouts}
      />

      {/* The depth control comes before the content it controls. It sat at
          the foot of the page, after the reader had scrolled everything the
          short read shows, deciding nothing. */}
      <SignalsModeSwitcherSection
        activeSignalsView={model.activeSignalsView}
        searchParams={resolvedSearchParams}
      />

      <ReturningVisitorDeltaStrip
        assessment={model.assessment}
        recordDate={model.treasury.record_date}
        impactLinks={[
          { label: "Funding pressure", href: model.regimeTimelineHref, metric: "tightness" },
          { label: "Risk appetite", href: "#current-scores", metric: "riskAppetite" },
          { label: "Fed interest rate", href: "#current-scores", metric: "baseRate" },
        ]}
        openPanelHref={model.timeMachineHref}
      />

      {/* The gauges lead the evidence: each signal against its watch line is
          the most useful block on the page for a reader without a macro
          background, and it was two thirds of the way down. */}
      {/* The model builds `scoreCardsByType` on every request and both view modes
          list "Current scores" in their section nav, but nothing rendered it —
          so #current-scores was a dead anchor from the nav and from the delta
          strip. It is also the most useful block on the page for a reader
          without a macro background: each signal's current value against its
          watch line, with both ends of the scale labelled. */}
      <SignalsCurrentScoresSection scoreCardsByType={model.scoreCardsByType} />

      {model.activeSignalsView === "implication" ? (
        <SignalInversionPreview yieldCurveSeries={model.yieldCurveSeries} />
      ) : null}

      <div id="trends" className="weather-panel scroll-mt-28 space-y-4 px-5 py-5">
        <h2 className="type-eyebrow">Funding pressure and risk appetite over time</h2>
        {/* "Tightness" is the engine's internal name for this score; every reader-facing
            surface calls it funding pressure. */}
        <SignalSparklineStrip
          series={[
            { key: "tightness", label: "Funding pressure", points: tightnessTrend, windowLabel: `${tightnessTrend.length} mo` },
            { key: "riskAppetite", label: "Risk appetite", points: riskAppetiteTrend, increaseIsPositive: true, windowLabel: `${riskAppetiteTrend.length} mo` },
          ]}
        />
      </div>

      {/* The nearest of four hand-picked reference cycles, by four coordinates.
          This used to headline a "90% Match" — a number clamped into 65–96 from
          a distance, on the page whose job is to be the proof behind the call.
          The coordinates are the evidence, so they are what gets shown. */}
      {(() => {
        const analog = getHistoricalAnalogPlaybook(model.assessment);
        const formatCoordinate = (value: number, unit: "%" | "pts") =>
          unit === "%" ? `${value.toFixed(2)}%` : value.toFixed(0);
        return (
          <section id="analog-pattern" aria-labelledby="analog-pattern-title" className="weather-panel scroll-mt-28 space-y-4 p-5">
            <div>
              <p className="type-eyebrow">Nearest reference cycle</p>
              <h3 id="analog-pattern-title" className="text-base font-semibold text-slate-100">
                {analog.analogPeriod} · {analog.regimeType}
              </h3>
              <p className="mt-1 text-fluid-xs text-slate-400">
                Closest of {analog.referenceCycleCount} reference cycles on the four coordinates below.
                A resemblance in the inputs, not a forecast of the outcome.
              </p>
            </div>

            {/* Without explicit column widths the label column absorbs every
                pixel of slack, so on a wide panel the two numeric columns end
                up jammed against the right edge with ~400px of nothing between
                a coordinate and its value. 50/25/25 keeps the pairs readable
                across the row. */}
            <table className="w-full max-w-2xl table-fixed border-collapse text-left text-fluid-xs">
              <caption className="sr-only">Match coordinates, reference cycle against this week</caption>
              <colgroup>
                <col className="w-1/2" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400">
                  <th scope="col" className="py-1.5 pr-3 font-medium">Coordinate</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">{analog.analogPeriod}</th>
                  <th scope="col" className="py-1.5 text-right font-medium">This week</th>
                </tr>
              </thead>
              <tbody>
                {analog.matchBasis.map((item) => (
                  <tr key={item.key} className="border-b border-slate-800/40 last:border-0">
                    <td className="py-1.5 pr-3 text-slate-300">{item.label}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-slate-400">{formatCoordinate(item.historical, item.unit)}</td>
                    <td className="py-1.5 text-right font-mono text-slate-100">{formatCoordinate(item.live, item.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5">
                <p className="text-fluid-nano font-semibold uppercase tracking-wider text-slate-400">Common mistake then</p>
                <p className="mt-1 text-fluid-xs leading-relaxed text-slate-200">{analog.consensusTrap}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5">
                <p className="text-fluid-nano font-semibold uppercase tracking-wider text-slate-400">What held up then</p>
                <p className="mt-1 text-fluid-xs leading-relaxed text-slate-200">{analog.winningMove}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5">
                <p className="text-fluid-nano font-semibold uppercase tracking-wider text-slate-400">What marked the turn</p>
                <p className="mt-1 text-fluid-xs leading-relaxed text-slate-200">{analog.reversalMarker}</p>
              </div>
            </div>
            <p className="text-fluid-nano text-slate-500">
              Cycle notes are editorial summaries of that period&apos;s public record, not a measured sample of companies.{" "}
              <Link href="/history/compare" className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
                Compare against any past month →
              </Link>
            </p>
          </section>
        );
      })()}

      {/* Evidence only (ui-ux-standards §VIII). The per-team translation that
          sat here belongs to /resolve, which owns the role pages; the fossil
          record is unique content but a read for the deeper mode, not the short
          one; and the "Need more detail?" button that followed repeated the
          reading-depth control near the top of the page. */}
      {model.activeSignalsView === "detail" ? (
        <FossilRecordSection
          regime={model.assessment.regime}
          open={resolvedSearchParams?.fossil === "1" || resolvedSearchParams?.fossil === "open"}
        />
      ) : null}

      {model.activeSignalsView === "detail" ? (
        <SignalsEvidencePrioritiesSection
          activeFocus={model.activeFocus}
          focusLabelByTab={model.focusLabelByTab}
          searchParams={resolvedSearchParams}
          essentialPriorityQueue={model.essentialPriorityQueue}
          additionalPriorityQueue={model.additionalPriorityQueue}
        />
      ) : null}

      {model.activeSignalsView === "detail" ? (
        <SignalsDiagnosticsSection
          showFullDiagnostics={model.showFullDiagnostics}
          searchParams={resolvedSearchParams}
          topDiagnosticCallouts={model.topDiagnosticCallouts}
          SignalVisualizationSuite={model.SignalVisualizationSuite}
          treasury={model.treasury}
          yieldCurveSeries={model.yieldCurveSeries}
        />
      ) : null}

      {model.activeSignalsView === "detail" ? (
        <SignalsAdvancedControlsSection
          showAdvanced={model.showAdvanced}
          searchParams={resolvedSearchParams}
        />
      ) : null}

      {model.activeSignalsView === "detail"
      && model.showAdvanced
      && model.AdvancedThresholdsSection
      && model.TimeMachinePanel
      && model.RegimeTimelinePanel ? (
        <>
          <model.AdvancedThresholdsSection
            currentThresholds={model.assessment.thresholds}
            provenance={model.treasuryProvenance}
          />

          <model.TimeMachinePanel
            selectedYear={model.selectedYear}
            selectedMonth={model.selectedMonth}
            isHistorical={Boolean(model.historicalSelection)}
            latestRecordDate={model.treasury.record_date}
            cacheCoverage={model.cacheCoverage}
            monthsByYear={model.cacheMonthsByYear}
            invalidSelection={model.invalidHistoricalSelection}
            provenance={model.treasuryProvenance}
            historicalRegime={model.historicalSelection ? model.assessment.regime : null}
            historicalSummary={
              model.historicalSelection ? model.assessment.description : null
            }
          />

          <model.RegimeTimelinePanel
            series={model.regimeSeries}
            selectedYear={model.selectedYear}
            selectedMonth={model.selectedMonth}
            searchParams={resolvedSearchParams}
          />
        </>
      ) : null}
    </ReportShell>
  );
}
