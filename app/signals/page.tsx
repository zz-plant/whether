import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { RelatedReportLinks } from "../components/relatedReportLinks";
import { HistoricalBanner } from "../components/historicalBanner";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastReadPanel";
import { SIGNALS_RELATED_LINKS } from "../../lib/report/reportCopy";
import { HistoricalReplayDatePicker } from "./components/historicalReplayDatePicker";
import { SignalInversionPreview } from "./components/signalInversionPreview";
import { signalsScrollPlan } from "../../lib/navigation/scrollPlans";
import { PageFlowNav } from "../components/pageFlowNav";
import { PersistedAssistPanel } from "../components/literacyAssistControls";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { buildSignalsPageModel, type SignalsPageSearchParams } from "./signalsPageModel";
import {
  SignalsAdvancedControlsSection,
  SignalsCurrentScoresSection,
  SignalsDecisionSummarySection,
  SignalsDiagnosticsSection,
  SignalsEvidencePrioritiesSection,
  SignalsModeSwitcherSection,
  SignalsNeedMoreProofSection,
} from "./components/signalsSections";

export { buildDiagnosticsExpansionHref } from "./signalsQueryState";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Proof",
  description:
    "Proof behind the weekly brief: what moved, why it matters, and when to revisit.",
  path: "/signals",
  imageAlt: "Whether Report proof overview",
  imagePath: "/social/signals.svg",
});

export default async function SignalsPage({
  searchParams,
}: {
  searchParams?: Promise<SignalsPageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const model = await buildSignalsPageModel(resolvedSearchParams);

  return (
    <ReportShell
      statusLabel={model.statusLabel}
      recordDateLabel={model.recordDateLabel}
      fetchedAtLabel={model.fetchedAtLabel}
      treasurySource={model.treasury.source}
      trustStatusLabel={model.trust.trustStatusLabel}
      trustStatusDetail={model.trust.trustStatusDetail}
      trustStatusAction={model.trust.trustStatusAction}
      trustStatusTone={model.trust.trustStatusTone}
      showOfflineBadge={model.isFallback && !model.historicalSelection}
      pageTitle="Proof"
      currentPath="/signals"
      pageSummary="Proof behind the weekly call."
      pageSummaryLink={{
        href:
          model.activeSignalsView === "detail"
            ? "#evidence-priorities"
            : "#decision-summary",
        label:
          model.activeSignalsView === "detail"
            ? "Open proof details ↓"
            : "Open plain-English read ↓",
      }}
      pageLinks={reportPageLinks}
      sectionLinks={model.sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      headerVariant="evidence"
      showPageNavigation={true}
      primaryCta={{ href: "#current-scores", label: "View proof" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/operations",
        description: "Use Planning next",
      }}
      decisionBanner={{
        label: "Proof",
        decision: `${model.regimeLabel} call is still supported by the current evidence.`,
        horizon: "Current cycle",
        confidence: model.trust.trustStatusLabel,
        effectiveDate: model.recordDateLabel,
        evidenceHref: "#current-scores",
      }}
      decisionDiffs={[{ label: `Regime: ${model.regimeLabel}`, tone: "neutral" }]}
      commandBar={{
        regime: model.assessment.regime,
        call: "Use Proof to check what moved.",
        doNow: [
          model.actionNowShort,
          model.startItems[0] ?? "Use the strongest proof item before changing the plan.",
        ],
        flipConditions: [
          model.reportData.flipThreshold,
          model.stopItems[0] ?? "Pause irreversible commitments if confidence degrades.",
        ],
        updatedAt: model.fetchedAtLabel,
      }}
      structuredData={model.structuredData}
      historicalBanner={
        model.historicalSelection ? (
          <HistoricalBanner
            banner={model.historicalSelection.banner}
            liveHref="/signals"
            previousHref={model.previousHistoricalHref}
            timeMachineHref={model.historicalTimeMachineHref}
          />
        ) : null
      }
    >
      <OperatorWorkflowRouteTracker />
      <PageFlowNav
        eyebrow={signalsScrollPlan.eyebrow}
        title="Proof in one step"
        description="Use this page to check the call, the proof, and when to revisit."
        items={signalsScrollPlan.items}
        maxItems={3}
      />

      <SignalsModeSwitcherSection
        activeSignalsView={model.activeSignalsView}
        searchParams={resolvedSearchParams}
      />

      <ReturningVisitorDeltaStrip
        assessment={model.assessment}
        recordDate={model.treasury.record_date}
        impactLinks={[
          { label: "Current pressure", href: model.regimeTimelineHref, metric: "tightness" },
          { label: "Expansion support", href: "#current-scores", metric: "riskAppetite" },
          { label: "Rate backdrop", href: "#current-scores", metric: "baseRate" },
        ]}
        openPanelHref={model.timeMachineHref}
      />

      <section className="weather-panel space-y-6 px-6 py-5" aria-label="Evidence term assistance">
        <div className="flex flex-wrap gap-2">
          <PersistedAssistPanel
            assistMode="evidence"
            buttonLabel="Translate the signals"
            title="How to read the main proof terms"
            summary="Turn the signals into operating language."
          >
            <p>
              <span className="font-semibold text-slate-50">Tightness</span> = how hard conditions
              make new long-payback commitments.
            </p>
            <p>
              <span className="font-semibold text-slate-50">Risk appetite</span> = how willing
              markets are to fund faster expansion and risk.
            </p>
            <p>
              <span className="font-semibold text-slate-50">Curve slope</span> = an early read on
              whether the current posture is likely to persist or deteriorate.
            </p>
          </PersistedAssistPanel>
          <PersistedAssistPanel
            assistMode="trust"
            buttonLabel="Translate reliability"
            title="How to read freshness and confidence"
            summary="Show whether the read is safe to use."
          >
            <p>
              <span className="font-semibold text-slate-50">Confidence</span> = how far the current
              read sits from the nearest flip threshold.
            </p>
            <p>
              <span className="font-semibold text-slate-50">Freshness</span> = when the underlying
              inputs last refreshed.
            </p>
            <p>
              If either degrades, keep decisions reversible even if the current call still looks
              directionally right.
            </p>
          </PersistedAssistPanel>
        </div>
      </section>

      <SignalsDecisionSummarySection
        decisionDeltaLabel={model.decisionDeltaLabel}
        triggerCondition={model.triggerCondition}
        reversalCondition={model.reversalCondition}
        showMicroDecisionRows={model.showMicroDecisionRows}
        regimeLabel={model.regimeLabel}
        trustStatusLabel={model.trust.trustStatusLabel}
        recordDateLabel={model.recordDateLabel}
        fetchedAtLabel={model.fetchedAtLabel}
        nextRefreshLabel={model.nextRefreshLabel}
        actionNowShort={model.actionNowShort}
        startItems={model.startItems}
        stopItems={model.stopItems}
        topDiagnosticCallouts={model.topDiagnosticCallouts}
      />

      {model.activeSignalsView === "detail" ? (
        <section id="historical-replay" className="weather-panel scroll-mt-28 space-y-4 px-6 py-5">
          <header className="space-y-2">
            <p className="text-sm font-semibold tracking-[0.18em] text-slate-300">
              Historical replay
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Pick any date to replay the call context.
            </h2>
            <p className="text-sm text-slate-300">
              We snap your selection to the closest available monthly snapshot and label the replay timestamp.
            </p>
          </header>
          <HistoricalReplayDatePicker
            initialDate={`${model.selectedYear}-${String(model.selectedMonth).padStart(2, "0")}-01`}
          />
        </section>
      ) : null}

      <SignalsCurrentScoresSection scoreCardsByType={model.scoreCardsByType} />

      {model.activeSignalsView === "implication" ? (
        <SignalInversionPreview yieldCurveSeries={model.yieldCurveSeries} />
      ) : null}

      {model.activeSignalsView === "implication" ? (
        <SignalsNeedMoreProofSection searchParams={resolvedSearchParams} />
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
      && model.RegimeTimelinePanel
      && model.summaryArchive ? (
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
            summaryArchive={model.summaryArchive}
            historicalRegime={model.historicalSelection ? model.assessment.regime : null}
            historicalSummary={
              model.historicalSelection ? model.assessment.description : null
            }
            comparison={model.historicalComparison}
          />

          <model.RegimeTimelinePanel
            series={model.regimeSeries}
            selectedYear={model.selectedYear}
            selectedMonth={model.selectedMonth}
            searchParams={resolvedSearchParams}
          />
        </>
      ) : null}

      <RelatedReportLinks
        title="Need more context?"
        links={SIGNALS_RELATED_LINKS}
        variant="compact"
      />
    </ReportShell>
  );
}
