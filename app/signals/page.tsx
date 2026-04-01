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
  title: "Whether Report — Why the weekly read changed",
  description:
    "Why the weekly read changed: what moved, why it matters, and what would make it wrong.",
  path: "/signals",
  imageAlt: "Whether Report evidence overview",
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
      pageTitle="Why the weekly read changed"
      currentPath="/signals"
      pageSummary="What changed, why it matters, and what would make this wrong."
      pageSummaryLink={{
        href:
          model.activeSignalsView === "detail"
            ? "#evidence-priorities"
            : "#decision-summary",
        label:
          model.activeSignalsView === "detail"
            ? "Open the detailed evidence ↓"
            : "Open the short read ↓",
      }}
      pageLinks={reportPageLinks}
      sectionLinks={model.sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      headerVariant="evidence"
      showPageNavigation={true}
      primaryCta={{ href: "#current-scores", label: "See what changed" }}
      secondaryCta={{ href: "/", label: "Weekly Brief" }}
      nextStep={{
        href: "/operations",
        description: "Set this week's operating rules",
      }}
      decisionBanner={{
        label: "Evidence",
        decision: "The current evidence still supports this week's read.",
        horizon: "Current cycle",
        confidence: model.trust.trustStatusLabel,
        effectiveDate: model.recordDateLabel,
        evidenceHref: "#current-scores",
      }}
      decisionDiffs={[{ label: `Regime: ${model.regimeLabel}`, tone: "neutral" }]}
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
      <PageFlowNav
        eyebrow={signalsScrollPlan.eyebrow}
        title="Three things to check"
        description="What changed, what it means this week, and what would make the read wrong."
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
            buttonLabel="What these terms mean"
            title="Plain-English guide to the three main signals"
            summary="Translate the signals into business language."
          >
            <p>
              <span className="font-semibold text-slate-50">Funding pressure</span> (called{" "}
              <span className="font-semibold text-slate-50">Tightness</span> here) = how hard it
              is to fund new long-payback bets right now.
            </p>
            <p>
              <span className="font-semibold text-slate-50">Investor appetite</span> (called{" "}
              <span className="font-semibold text-slate-50">Risk appetite</span> here) = how
              willing markets are to reward faster expansion and risk.
            </p>
            <p>
              <span className="font-semibold text-slate-50">Rate trend</span> (called{" "}
              <span className="font-semibold text-slate-50">Curve slope</span> here) = a quick
              read on whether conditions are getting better or worse.
            </p>
          </PersistedAssistPanel>
          <PersistedAssistPanel
            assistMode="trust"
            buttonLabel="How reliable is this?"
            title="What confidence and freshness mean"
            summary="Whether this week's read is safe to use."
          >
            <p>
              <span className="font-semibold text-slate-50">Confidence</span> = how much room the
              current read has before one of its watch lines breaks.
            </p>
            <p>
              <span className="font-semibold text-slate-50">Freshness</span> = how recently the
              underlying data updated.
            </p>
            <p>
              If either weakens, keep big decisions reversible even if the read still looks broadly
              right.
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
              Pick any date to replay the read.
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
