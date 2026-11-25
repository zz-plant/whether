import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { HistoricalBanner } from "../components/historicalBanner";
import { formatDateUTC } from "../../lib/formatters";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastRead/visitorStrip";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { regimeSignalLabel } from "../../lib/report/signalTranslations";
import type { RegimeSignalKey } from "../../lib/report/reportFormatting";
import { buildSignalsPageModel, focusLabelByTab, type SignalsPageSearchParams } from "./evidencePageModel";
import { signalsEvidenceSections } from "./components/evidencePageBody";
import { SIGNALS_PAGE_QUESTION } from "./signalsQuestions";

export const runtime = "edge";
export const revalidate = 900;

/* The description answers the page's question in two spoken sentences (2026-11-25). It listed
   what the page holds: "The interest rates, yield curve and funding-market numbers behind this
   week's startup guidance, and each one's move since last time." */
export const metadata: Metadata = buildPageMetadata({
  title: "Interest rates and funding data behind this week's guidance",
  description:
    "It follows two scores, funding pressure and risk appetite, built from public interest rates and market data. See each input, how it moved since last week and how close it is to changing the guidance.",
  path: "/signals",
  imageAlt: "Why did the guidance change? The evidence behind this week's guidance",
  imageParams: {
    template: "signals",
    title: SIGNALS_PAGE_QUESTION,
    subtitle: "The evidence behind this week's guidance.",
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

  return (
    <ReportShell
      model={{
        status: {
          statusLabel: model.statusLabel,
          regime: model.assessment.regime,
          recordDateLabel: model.recordDateLabel,
          fetchedAtLabel: model.fetchedAtLabel,
        },
        page: {
          /* The question the header tab ("Why it changed") asks, and its answer first: the
             guidance follows two scores, and how they moved (2026-11-25). The title was "Why
             the weekly brief changed" over "The evidence behind this week's guidance." */
          pageTitle: model.pageQuestion,
          pageSummary: model.pageAnswer,
          sectionLinks: model.sectionLinks,
          currentPath: "/signals",
        },
        trust: {
          trustStatusTone: model.trust.trustStatusTone,
          showOfflineBadge: model.isFallback && !model.historicalSelection,
          strip: { ...model.trustStrip, href: "/trust" },
        },
        // No closing "Open the plan" card (2026-10-09): Decide is a header tab.
        payloads: {
          structuredData: model.structuredData,
          historicalBanner: model.historicalSelection ? (
            <HistoricalBanner
              year={model.historicalSelection.year}
              month={model.historicalSelection.month}
              asOfLabel={formatDateUTC(model.historicalSelection.asOf)}
              liveHref="/signals"
            />
          ) : null,
        },
      }}
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
          { label: regimeSignalLabel.tightness, href: rowHref("tightness"), metric: "tightness" },
          { label: regimeSignalLabel.riskAppetite, href: rowHref("riskAppetite"), metric: "riskAppetite" },
          { label: regimeSignalLabel.baseRate, href: rowHref("baseRate"), metric: "baseRate" },
        ]}
        openPanelHref="#what-changed"
      />
      {/* The three sections, in the reader's order, as an array: the shell
          wraps each array entry in its own divided row. */}
      {signalsEvidenceSections({
        model,
        focusLabelByTab,
        searchParams: resolvedSearchParams,
      })}
    </ReportShell>
  );
}
