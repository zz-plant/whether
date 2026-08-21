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
import { getMonthlyRegimeHistory } from "../../lib/summary/monthlyRegimeHistory";
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
  const monthlyRegimeHistory = getMonthlyRegimeHistory().slice(-12);
  const tightnessTrend = monthlyRegimeHistory
    .filter((entry) => typeof entry.tightness === "number")
    .map((entry) => ({ date: entry.record_date, value: entry.tightness as number }));
  const riskAppetiteTrend = monthlyRegimeHistory
    .filter((entry) => typeof entry.riskAppetite === "number")
    .map((entry) => ({ date: entry.record_date, value: entry.riskAppetite as number }));

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

      <div className="weather-panel space-y-4 px-5 py-5">
        <p className="type-eyebrow">Trends</p>
        {/* "Tightness" is the engine's internal name for this score; every reader-facing
            surface calls it funding pressure. */}
        <div className="grid gap-6 sm:grid-cols-2">
          <HistoricalTrendChart label="Funding pressure" color="var(--color-semantic-tightening-border)" points={tightnessTrend} periodLabel="months" />
          <HistoricalTrendChart label="Risk appetite" color="var(--color-semantic-easing-border)" points={riskAppetiteTrend} increaseIsPositive periodLabel="months" />
        </div>
      </div>

      {/* The model builds `scoreCardsByType` on every request and both view modes
          list "Current scores" in their section nav, but nothing rendered it —
          so #current-scores was a dead anchor from the nav and from the delta
          strip. It is also the most useful block on the page for a reader
          without a macro background: each signal's current value against its
          watch line, with both ends of the scale labelled. */}
      <SignalsCurrentScoresSection scoreCardsByType={model.scoreCardsByType} />

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
    </ReportShell>
  );
}
