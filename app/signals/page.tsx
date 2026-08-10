import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { HistoricalBanner } from "../components/historicalBanner";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastRead/visitorStrip";
import { SignalInversionPreview } from "./components/signalInversionPreview";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { HistoricalTrendChart } from "../components/historicalTrendChart";
import { DomainContextSection } from "./components/domainContextSection";
import { buildSignalsPageModel, type SignalsPageSearchParams } from "./evidencePageModel";
import {
  SignalsAdvancedControlsSection,
  SignalsCurrentScoresSection,
  SignalsDecisionSummarySection,
  SignalsDiagnosticsSection,
  SignalsEvidencePrioritiesSection,
  SignalsModeSwitcherSection,
  SignalsNeedMoreProofSection,
} from "./components/evidenceSections";

export { buildDiagnosticsExpansionHref } from "./evidenceQueryState";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Why the Weekly Brief Changed",
  description:
    "Why the weekly brief changed: what moved, why it matters, and what would make the recommendation change.",
  path: "/signals",
  imageAlt: "Why the weekly brief changed — evidence overview",
  imagePath: "/social/evidence.svg",
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
      pageTitle="Why the weekly brief changed"
      currentPath="/signals"
      pageSummary="What moved, why it matters, and what would flip the call."
      pageSummaryLink={{
        href: "#decision-summary",
        label: "Summary ↓",
      }}
      sectionLinks={model.sectionLinks}
      heroVariant="compact"
      primaryCta={{ href: "#decision-summary", label: "What changed" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/operate",
        description: "Set guardrails for this week's plan",
      }}
      decisionBanner={{
        label: "Evidence",
        decision: "Use this to confirm or challenge the weekly recommendation before changing the plan.",
        horizon: "Current cycle",
        confidence: model.trust.trustStatusLabel,
        effectiveDate: model.recordDateLabel,
        evidenceHref: "#decision-summary",
      }}
      decisionDiffs={[{ label: `Backdrop: ${model.regimeLabel}`, tone: "neutral" }]}
      commandBar={{
        regime: model.assessment.regime,
        call: "Check what changed before you change the plan.",
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
        freshnessSummaryLabel={model.freshnessSummaryLabel}
        actionNowShort={model.actionNowShort}
        startItems={model.startItems}
        stopItems={model.stopItems}
        topDiagnosticCallouts={model.topDiagnosticCallouts}
      />

      <div className="weather-panel space-y-4 px-5 py-5">
        <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Trends</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <HistoricalTrendChart metric="tightness" label="Tightness" color="#f87171" />
          <HistoricalTrendChart metric="riskAppetite" label="Risk appetite" color="#34d399" />
        </div>
      </div>

      <DomainContextSection regime={model.assessment.regime} />

      <SignalsModeSwitcherSection
        activeSignalsView={model.activeSignalsView}
        searchParams={resolvedSearchParams}
      />

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
    </ReportShell>
  );
}
