import type { Metadata } from "next";
import { loadReportData } from "../../lib/reportData";
import { ReportShell } from "../components/reportShell";
import { DecisionShieldPanel } from "../components/decisionShieldPanel";
import { ExportBriefPanel } from "../components/exportBriefPanel";
import {
  CxoFunctionPanel,
  HistoricalBanner,
  OperatorRequestsPanel,
  PlaybookPanel,
} from "../components/reportSections";

export const metadata: Metadata = {
  title: "Whether Report — Operations playbook",
  description:
    "Execution-ready guidance, decision shield validation, and export briefs for the Whether Report.",
};

export default async function OperationsPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const pageLinks = [
    {
      href: "/",
      label: "Overview",
      description: "Executive snapshot, regime posture, and the high-level read.",
    },
    {
      href: "/signals",
      label: "Signals & thresholds",
      description: "Live sensor detail, macro inputs, and historical time machine coverage.",
    },
    {
      href: "/operations",
      label: "Operations playbook",
      description: "Action guidance, decision shields, and export-ready briefs.",
    },
  ];
  const sectionLinks = [
    { href: "#playbook", label: "Playbook" },
    { href: "#decision-shield", label: "Decision shield" },
    { href: "#export-briefs", label: "Export briefs" },
    { href: "#cxo-functions", label: "CXO outputs" },
    { href: "#operator-requests", label: "Operator requests" },
  ];

  const {
    assessment,
    fetchedAtLabel,
    fenceItems,
    historicalSelection,
    internalProvenance,
    macroSeries,
    playbook,
    recordDateLabel,
    sensors,
    startItems,
    statusLabel,
    stopItems,
    treasury,
    treasuryProvenance,
  } = await loadReportData(searchParams);

  return (
    <ReportShell
      statusLabel={statusLabel}
      recordDateLabel={recordDateLabel}
      fetchedAtLabel={fetchedAtLabel}
      treasurySource={treasury.source}
      pageTitle="Operations playbook"
      pageSummary="Translate the regime into action: decision shields, playbook moves, and export-ready briefs for leadership review."
      pageLinks={pageLinks}
      sectionLinks={sectionLinks}
      historicalBanner={
        historicalSelection ? <HistoricalBanner banner={historicalSelection.banner} /> : null
      }
    >
      <PlaybookPanel
        playbook={playbook}
        stopItems={stopItems}
        startItems={startItems}
        fenceItems={fenceItems}
        provenance={treasuryProvenance}
      />

      <DecisionShieldPanel assessment={assessment} provenance={treasuryProvenance} />

      <ExportBriefPanel
        assessment={assessment}
        treasury={treasury}
        sensors={sensors}
        macroSeries={macroSeries}
        provenance={treasuryProvenance}
      />

      <CxoFunctionPanel provenance={internalProvenance} />

      <OperatorRequestsPanel provenance={internalProvenance} />
    </ReportShell>
  );
}
