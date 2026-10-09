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
import { signalsEvidenceSections } from "./components/evidencePageBody";

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
  /* Thirteen month-ends, so the move the strip prints spans twelve months. It
     took twelve and printed "-6 over 12 mo" for risk appetite, Sep 2025 to
     Aug 2026 — eleven months; over twelve (from 66 in Aug 2025) it is -10. */
  const monthlyRegimeHistory = getMonthlyRegimeHistory().slice(-13);
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
      model={{
        status: {
          statusLabel: model.statusLabel,
          regime: model.assessment.regime,
          recordDateLabel: model.recordDateLabel,
          fetchedAtLabel: model.fetchedAtLabel,
        },
        page: {
          pageTitle: "Why the weekly brief changed",
          // States the page's job; the index below already names the sections
          // (editorial-guardrails.md -> Headings).
          pageSummary: "The evidence behind this week's guidance.",
          sectionLinks: model.sectionLinks,
          currentPath: "/signals",
        },
        trust: {
          trustStatusTone: model.trust.trustStatusTone,
          showOfflineBadge: model.isFallback && !model.historicalSelection,
          strip: { ...model.trustStrip, href: "/trust" },
        },
        actions: {
          nextStep: {
            href: "/operate",
            description: "Turn this week's guidance into rules for hiring, spend and the roadmap.",
            label: "Open the plan",
          },
        },
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
        tightnessTrend,
        riskAppetiteTrend,
        searchParams: resolvedSearchParams,
      })}
    </ReportShell>
  );
}
