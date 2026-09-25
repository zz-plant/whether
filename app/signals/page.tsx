import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { HistoricalBanner } from "../components/historicalBanner";
import { formatDateUTC, formatMonthYearShortFromValue } from "../../lib/formatters";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastRead/visitorStrip";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { regimeSignalLabel } from "../../lib/report/signalTranslations";
import type { RegimeSignalKey } from "../../lib/report/reportFormatting";
import { buildSignalsPageModel, focusLabelByTab, type SignalsPageSearchParams } from "./evidencePageModel";
import { getMonthlyRegimeHistory } from "../../lib/summary/monthlyRegimeHistory";
import { SignalsEvidenceBody } from "./components/evidencePageBody";

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
  const visibleRowKeys = new Set(model.changedSignalRows.map((row) => row.key));
  const rowHref = (key: RegimeSignalKey) => (visibleRowKeys.has(key) ? `#${key}` : `/signals#${key}`);
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
      regime={model.assessment.regime}
      recordDateLabel={model.recordDateLabel}
      fetchedAtLabel={model.fetchedAtLabel}
      trustStatusTone={model.trust.trustStatusTone}
      showOfflineBadge={model.isFallback && !model.historicalSelection}
      pageTitle="Why the weekly brief changed"
      pageSummary="What moved, why it matters, and what would change the guidance."
      sectionLinks={model.sectionLinks}
      activeStep="signals"
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
          />
        ) : null
      }
    >
      <OperatorWorkflowRouteTracker />
      {/* Renders nothing on a first visit. Its links land on the rows of the
          changed-signals table below, whose ids are the signal keys — when
          the focus filter shows that row; otherwise on the unfiltered page,
          since a fragment for a row the filter removed lands nowhere. */}
      <ReturningVisitorDeltaStrip
        assessment={model.assessment}
        recordDate={model.treasury.record_date}
        impactLinks={[
          { label: "Funding pressure", href: rowHref("tightness"), metric: "tightness" },
          { label: "Risk appetite", href: rowHref("riskAppetite"), metric: "riskAppetite" },
          { label: regimeSignalLabel.baseRate, href: rowHref("baseRate"), metric: "baseRate" },
        ]}
        openPanelHref="#what-changed"
      />
      {/* The four sections, in the reader's order. `SignalsEvidenceBody` is a
          fragment: the shell wraps each of its children in a divided row. */}
      <SignalsEvidenceBody
        model={model}
        focusLabelByTab={focusLabelByTab}
        tightnessTrend={tightnessTrend}
        riskAppetiteTrend={riskAppetiteTrend}
        searchParams={resolvedSearchParams}
      />
    </ReportShell>
  );
}
