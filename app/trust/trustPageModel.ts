import { previousScoresFromDynamics } from "../../lib/export/scoreReference";
import { comparisonBasis } from "../../lib/report/comparisonBasis";
import { buildTrustStripProps } from "../../lib/report/evidenceReaderModel";
import type { ReportShellModel } from "../components/reportShell";
import { buildBreadcrumbList } from "../../lib/seo";
import { graph } from "../../lib/seo/pageStructuredData";
import { buildGroupBreadcrumbs } from "../../lib/navigation/breadcrumbs";
import {
  buildCompactTrustSummary,
  buildTrustWarnings,
} from "../../lib/report/trustStatus";
import { buildSharedCorridorRails } from "../../lib/report/operatingCalls";
import { buildDegradedSourceRows, buildSourceBoardRows } from "../../lib/report/sourceHealth";
import { buildLadderLines } from "../components/ui/scoreLadder";
import type { TrustStripProps } from "../components/trustStrip";
import type { ScorePositions } from "./formulaReference";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { loadCronRunHistory } from "../../lib/telemetry/runHistory";
import { formatActivationFunnelLine } from "../../lib/telemetry/activationFunnelReport";
import { readStoredActivationFunnel } from "../../lib/telemetry/recordActivationFunnel";


export async function buildTrustPageModel() {
  const breadcrumbStructuredData = graph([buildBreadcrumbList(buildGroupBreadcrumbs("/trust"))]);
  /* Read alongside the brief, not after it: the run history has its own deadline and
     fails soft, so it never lengthens the page past the report path's own bound. The
     funnel is a KV get of a record the Monday cron already wrote, so it costs one read
     and cannot fail into a slow page the way an Analytics Engine query would. */
  const [{ reportData, snapshot }, runHistory, storedFunnel] = await Promise.all([
    loadWeeklyBriefSnapshot(undefined, { route: "/trust" }),
    loadCronRunHistory(),
    readStoredActivationFunnel(),
  ]);
  /* Null in both directions that matter: no run has ever written a record, or the
     record's two weeks both held nothing. The section renders on the line alone, so a
     measured zero and an unmeasured week stay out of the markup rather than becoming
     "0 readers" in a place no reader can tell apart from the other. */
  const readerReturnsLine = storedFunnel ? formatActivationFunnelLine({ status: "ok", weeks: storedFunnel.weeks }) : null;
  const homeBriefModel = snapshot.homeBriefModel;
  const isFallback = snapshot.isFallback;
  const degradedSourceRows = buildDegradedSourceRows(reportData.sourceHealth);
  const trustSummary = buildCompactTrustSummary({
    confidenceLabel: homeBriefModel.confidenceLabel,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(reportData.historicalSelection),
  });
  /* The strip under the h1: the four facts a reader checks before acting, in
     the slot every reading route gives them. The sources cell keeps the words
     the five-cell System status strip used for the same three states. */
  const trustStrip: Omit<TrustStripProps, "href"> = buildTrustStripProps({
    recordDateLabel: reportData.recordDateLabel,
    isFallback,
    isHistorical: Boolean(reportData.historicalSelection),
    degradedSourceCount: degradedSourceRows.length,
    confidenceLabel: homeBriefModel.confidenceLabel,
    assessment: reportData.assessment,
    scoringBasis: reportData.scoringBasis,
  });
  /* Where the two scores sit against their lines, for the ladders that open
     "How the scores are built". The earlier reading comes from `previousScoresFromDynamics`,
     the derivation the homepage and every export use: no previous reading at
     all is `"unavailable"`, which draws no hollow dot rather than a dot claiming
     a comparison nobody made, and a move past the weekly sanity limit counts.
     The dot is named by the date of that reading, not "last week". */
  const scores = reportData.assessment.scores;
  const thresholds = reportData.assessment.thresholds;
  const rails = buildSharedCorridorRails(reportData.actionStripItems ?? [], scores);
  const previousScores = previousScoresFromDynamics(reportData.reportDynamics, scores);
  const positionFor = (key: "tightness" | "riskAppetite", callChange: number) => {
    const rail = rails.find((candidate) => candidate.metric === key);
    return {
      value: scores[key],
      previous: previousScores?.[key] ?? null,
      previousLabel: comparisonBasis(previousScores?.comparedWith).label,
      lines: buildLadderLines({ pause: rail?.guardrail, resume: rail?.clearsAt, callChange }),
    };
  };
  const scorePositions: ScorePositions = {
    tightness: positionFor("tightness", thresholds.tightnessRegime),
    riskAppetite: positionFor("riskAppetite", thresholds.riskAppetiteRegime),
  };
  const warnings = buildTrustWarnings({
    confidenceLabel: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    freshnessLabel: reportData.fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    provenanceStatusLabel: reportData.treasuryProvenance.statusLabel,
    changedSignals: reportData.reportDynamics.changedSignals,
    anomalySignals: reportData.reportDynamics.anomalySignals,
  });

  /* The row labels used to be "Trigger", "Impact" and "Recovery" — three nouns
     from the incident-review register, on a page addressed to someone deciding
     whether to act this week. Each is now the question the row answers. */
  /* A "What would go wrong" row led these until 2026-10-09: no detail, because
     #confidence-limits above prints the condition, and only a link back to that
     section. */
  const revisitBullets: Array<{ label: string; detail?: string; href: string; linkLabel: string }> = [
    {
      label: "What it would change",
      detail: reportData.actionNowShort,
      href: "#trust-snapshot",
      linkLabel: "Check system status",
    },
    {
      label: "How you'd know it cleared",
      detail: isFallback
        ? "One live refresh has landed from every source."
        : "The scores are clear of the change lines and conditions have held for a second reading.",
      href: "#source-board",
      linkLabel: "Check source dates",
    },
  ];
  /* The home model's verdict, which /brief.md prints. This page built a second
     one from the freshness label alone and without the hold, so a held week
     clear of the lines was Act here and Act with caution in the home model. */
  const trustStatusTone = homeBriefModel.decisionReadiness.tone;
  /* Each label is the section's own title. Two had drifted: "Snapshot" for a
     section headed "System status", and "Sources & freshness" for one headed
     "Cite this call" (now "Cite this guidance") — so the rail offered "Sources" and "Sources & freshness"
     next to each other, and the second went to a citation block. The id stays
     as it is; an anchor someone has already linked to outlives its label.
     In page order (§XI). The rail listed Sources second and the thresholds
     method before the revisit triggers, while the page drew the formula first,
     the method next and every other section folded at its foot. */
  const sectionLinks = [
    { href: "#trust-snapshot", label: "System status" },
    // Only when the telemetry read is configured: an index entry for a section that
    // never renders is a broken anchor.
    ...(runHistory.status === "unconfigured" ? [] : [{ href: "#run-history", label: "Scheduled runs" }]),
    // Same rule: an index entry for a section that never renders is a broken anchor.
    ...(readerReturnsLine ? [{ href: "#reader-returns", label: "Reader returns" }] : []),
    { href: "#formula-reference", label: "Formula reference" },
    { href: "#source-board", label: "Sources" },
    // "Cite this guidance" and "Meeting snippet" moved to /share on 2026-10-08,
    // with every other paste of the week.
    { href: "#confidence-limits", label: "Margin & limits" },
    { href: "#revisit-call", label: "Revisit triggers" },
  ];

  const reportShellModel: ReportShellModel = {
    status: {
      statusLabel: reportData.statusLabel,
      regime: reportData.assessment.regime,
      recordDateLabel: reportData.recordDateLabel,
      fetchedAtLabel: reportData.fetchedAtLabel,
    },
    page: {
      /* No summary (2026-10-09): "Check whether this week's guidance is current
         enough to act on." said the title again under it. */
      pageTitle: "How much to trust this week's guidance",
      sectionLinks,
      currentPath: "/trust",
    },
    trust: {
      trustStatusTone,
      degradedSourceRows,
      showOfflineBadge: isFallback,
      // No link: the strip's link points here.
      strip: trustStrip,
    },
    chrome: {
      sidebarVariant: "full",
    },
    // No closing "Open the record" card (2026-10-09): Record is a header tab.
    payloads: {
      structuredData: breadcrumbStructuredData,
    },
  };

  return {
    reportData,
    isFallback,
    degradedSourceRows,
    sourceBoardRows: buildSourceBoardRows(reportData.sourceHealth),
    trustSummary,
    warnings,
    revisitBullets,
    trustStrip,
    scorePositions,
    runHistory,
    readerReturns: storedFunnel && readerReturnsLine ? { line: readerReturnsLine, generatedAt: storedFunnel.generatedAt } : null,
    reportShellModel,
  };
}
